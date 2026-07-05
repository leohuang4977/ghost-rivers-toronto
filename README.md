# Ghost Rivers of Toronto

A portfolio-grade interactive map that reveals the buried creeks still running
beneath Toronto's streets — a scroll-driven story where the city grid grows over
the land and the glowing creeks wink out one by one, keyed to the year each was
last drawn on a map.

The full brief is in [`lost-rivers-toronto-project-plan.md`](lost-rivers-toronto-project-plan.md).
Design goals in one breath: **beautiful, self-contained, zero-maintenance** — no
servers, no API keys, no vendor tokens. All data is baked into static files at
build time.

## Repository layout

```
toronto_ghost_river/
├─ site/        # Vite + TypeScript + MapLibre GL + PMTiles. THE ONLY PART THAT DEPLOYS.
├─ pipeline/    # Python (geopandas + GDAL) + tippecanoe/pmtiles. Runs once, offline.
├─ docs/        # TOOLCHAIN.md, DATA_SOURCES.md, LICENSING.md
└─ lost-rivers-toronto-project-plan.md   # the project brief
```

The two halves are decoupled: the pipeline outputs static `.pmtiles`/raster files
into `site/public/`, and the front end just serves them. Nothing is called at
runtime except the site's own files.

## Quick start

**Front end (works now, native Windows):**

```bash
cd site
npm install
npm run dev        # → http://localhost:5173  (blank dark basemap)
```

**Pipeline (needs the WSL toolchain — one-time setup):**

```powershell
wsl --install -d Ubuntu     # elevated PowerShell, then reboot
```
```bash
cd /mnt/c/Users/leo/toronto_ghost_river/pipeline
bash scripts/setup_wsl_toolchain.sh
```

See [`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md) for why WSL, the full setup, and the
deploy instructions.

## Tech stack

- **Map engine:** MapLibre GL JS (open source, no access token).
- **Basemap:** Protomaps as a single self-contained PMTiles file (Phase 2).
- **Front-end build:** Vite + TypeScript, `base: './'` for portable subpath/subdomain deploys.
- **Pipeline:** Python (geopandas, rasterio/GDAL) + `tippecanoe` + `pmtiles`, in WSL2 via pixi.
- **Hosting:** any static host (GitHub Pages / Cloudflare Pages / Netlify).

## Phase status

Building one phase at a time (see brief §9).

- **Phase 0 — Setup & data acquisition — IN PROGRESS.** Repo scaffolded, front-end
  dark map running, WSL toolchain path chosen and scripted, data-drop skeleton +
  acquisition/licensing checklists prepared. Data downloads are manual (see below).
- Phases 1–7: not started.

## Getting the data

The four core sources + historical rasters are downloaded **manually** (some are
gated behind U of T library access). Follow:

- [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) — where to get each source, what
  format it arrives in, and exactly where to drop it under `pipeline/data/raw/`.
- [`docs/LICENSING.md`](docs/LICENSING.md) — what to verify per source before this
  goes on a public site.
- [`pipeline/data/raw/README.md`](pipeline/data/raw/README.md) — the terse
  drop-folder checklist.
