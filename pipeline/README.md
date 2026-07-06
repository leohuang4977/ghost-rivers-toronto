# pipeline — Ghost Rivers of Toronto (offline GIS)

A **Python** data pipeline that runs **once, offline** and outputs static files
(vector `.pmtiles`, a hillshade raster, georeferenced historical rasters) that the
`/site` front end serves directly. **Nothing here ships to production** — only its
outputs do.

> The project brief originally sketched an R (`sf`/`terra`) pipeline. We're doing
> it in **Python (geopandas + rasterio/GDAL)** per the current project decision;
> `tippecanoe` and the `pmtiles` CLI are the tiling/packaging tools either way.

## Toolchain: runs in WSL2

GDAL, `tippecanoe`, and `pmtiles` are painful-to-impossible on native Windows
(`tippecanoe` has no supported Windows build at all). The least-painful path is
**WSL2 (Ubuntu)** with a **pixi / conda-forge** environment. Full rationale and
the deploy story live in [`../docs/TOOLCHAIN.md`](../docs/TOOLCHAIN.md).

### First-time setup

```powershell
# 1. Windows, ELEVATED PowerShell — enable WSL + install Ubuntu (needs a reboot):
wsl --install -d Ubuntu
```

```bash
# 2. After reboot + Ubuntu first-run, inside WSL:
cd /mnt/c/Users/leo/toronto_ghost_river/pipeline
bash scripts/setup_wsl_toolchain.sh   # installs pixi env + tippecanoe + pmtiles
pixi run versions                     # confirms gdal / tippecanoe versions
```

The `pmtiles` CLI also runs natively on Windows if you want to inspect tiles from
the Windows side:

```powershell
pwsh pipeline/scripts/get-pmtiles-windows.ps1   # → pipeline/bin/pmtiles.exe
```

## Layout

```
pipeline/
├─ pixi.toml            # conda-forge env + task graph (the run order)
├─ config.yaml          # study bbox, CRS, layer/field names, zoom levels — tune here
├─ scripts/             # toolchain bootstrap (WSL + Windows pmtiles)
├─ src/ghost_rivers/
│  ├─ config.py         # loads config.yaml, resolves paths
│  ├─ _util.py          # subprocess runner + pmtiles-binary bootstrap
│  ├─ clean_creeks.py   # Step 1+2: assemble creeks + attach 'year last seen'
│  ├─ hillshade.py      # Step 3: DTM mosaic -> hillshade (2958 -> 3857)
│  └─ tile.py           # Step 4: -> creeks.pmtiles + hillshade.pmtiles
└─ data/
   ├─ raw/              # <-- YOU drop downloaded sources here (see raw/README.md)
   ├─ interim/          # mosaic, hillshade, mbtiles (working files)
   └─ processed/        # creeks_4326.geojson, hillshade_3857.tif, *.pmtiles
```

Everything under `data/` is git-ignored except the folder skeleton and
`data/raw/README.md` (the drop checklist). Reproduce it from
[`../docs/DATA_SOURCES.md`](../docs/DATA_SOURCES.md).

## Run order (Phase 1)

Everything is parameterized from `config.yaml`. Run the whole thing, or a step:

```bash
pixi run all         # creeks + hillshade + city -> tiles  (the full build)
pixi run creeks      # creek geometry + year + Garrison hero flag -> creeks_4326.geojson
pixi run hillshade   # DTM mosaic -> hillshade_3857.tif
pixi run city        # streets/parks/ravines/water -> data/interim/*.geojson
pixi run tiles       # -> *.pmtiles + copies to ../site/public/data/
```

Steps cache on their inputs (code + `config.yaml`) and outputs, so re-running
`all` skips the expensive DTM mosaic unless something changed.

| Step | Module | Input | Output |
| --- | --- | --- | --- |
| creeks | `clean_creeks` | `LR_Toronto_Composite.gdb` (`BI_Lost_Rivers_20170705`) | `creeks_4326.geojson` (+ `year_last_seen`, `hero`) |
| hillshade | `hillshade` | `data/raw/lidar_dtm/*.tif` | `hillshade_3857.tif` |
| city | `city_layers` | Centreline, Green Spaces, Ravine + the hillshade (water) | `streets/parks/ravines/water.geojson` |
| tiles | `tile` | the above | `creeks.pmtiles`, `hillshade.pmtiles`, `city.pmtiles` → `site/public/data/` |

The three `.pmtiles` under `site/public/data/` are the only artifacts the site loads.

Later phases: georeference the historical map rasters and add them as a crossfade layer.
