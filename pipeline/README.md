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
├─ pixi.toml            # conda-forge env (gdal, geopandas, rasterio, tippecanoe)
├─ config.yaml          # CRS + paths, no hard-coded paths in code
├─ scripts/             # toolchain bootstrap (WSL + Windows pmtiles)
├─ src/ghost_rivers/    # Phase 1+ modules (empty in Phase 0)
└─ data/
   ├─ raw/              # <-- YOU drop downloaded sources here (see raw/README.md)
   ├─ interim/          # cleaned/reprojected working files
   └─ processed/        # final tiles + rasters, copied into ../site/public
```

Everything under `data/` is git-ignored except the folder skeleton and
`data/raw/README.md` (the drop checklist). Reproduce it from
[`../docs/DATA_SOURCES.md`](../docs/DATA_SOURCES.md).

## What runs when

Phase 0 (now): environment + folder skeleton only — no transform code.
Phase 1: clean geometry, attach "year last seen", reproject, build the hillshade,
georeference historical rasters, export PMTiles.
