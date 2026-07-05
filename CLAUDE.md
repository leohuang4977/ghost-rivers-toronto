# CLAUDE.md — Ghost Rivers of Toronto

Operational context for Claude Code. Read this first, every session. The full narrative
plan is in `lost-rivers-toronto-project-plan.md`. Data and licensing detail is in `docs/`.

> Ignore any `CLAUDE.md` in the Windows user home (`C:\Users\leo\CLAUDE.md`). It belongs to
> an unrelated (Pokémon) project. This repo-root file is the source of truth for this project.

## What this is

A static, no-maintenance, portfolio-grade interactive map of Toronto's buried creeks
(Garrison, Taddle, Mud Creek). It scrolls: the street grid grows over time and the glowing
creeks disappear, keyed to the year each was last drawn on a map. Built to be shown to
potential employers. The whole site is static files with no runtime dependencies, so once
it's built there is nothing to maintain.

## Repo layout

- `site/` — Vite + TypeScript + MapLibre GL + PMTiles. The only part that deploys.
- `pipeline/` — Python (geopandas / GDAL) + tippecanoe + pmtiles. Runs once, offline, and
  outputs static files. Never deploys.
- `docs/` — `DATA_SOURCES.md`, `LICENSING.md`, `TOOLCHAIN.md`.
- `lost-rivers-toronto-project-plan.md` — the full project brief.

## Locked decisions (do not re-open these)

- Pipeline language is **Python**, not R. The brief text says R; that was overridden on
  purpose. Keep Python.
- Front end is **MapLibre GL JS**, not Mapbox, so there is no vendor token to expire. The
  basemap is a self-contained **Protomaps PMTiles** file.
- Toolchain is **WSL2 + pixi** (conda-forge) for GDAL and tippecanoe. `pmtiles` also runs
  natively on Windows and lives in `pipeline/bin/`.
- Deploy is a static bundle. `site/vite.config.ts` sets `base: './'` so `dist/` runs at a
  domain root or at any subpath of the personal GitHub site with no config change. Target
  host is GitHub Pages (Cloudflare Pages / Netlify are drop-in alternatives).
- The repo must stay **outside** any Google Drive-synced folder. Drive sync corrupts git.

## Data (full detail in `docs/DATA_SOURCES.md`)

Core geometry and the timeline come from two open Borealis datasets (no login required):

- Historical Hydrography — DOI `10.5683/SP2/IYS0K9` → `pipeline/data/raw/hydrography_uoft/`
- Disappearing Rivers, which carries the "year last seen" timeline attribute —
  DOI `10.5683/SP2/2AHETH` → `pipeline/data/raw/disappearing_rivers/`

The hillshade comes from the **open** Ontario GeoHub lidar DTM, not the U of T login-gated
copy → `pipeline/data/raw/lidar_dtm/`. Historical map rasters are optional polish and mostly
need georeferencing; treat them as post-money-shot work.

CRS is inconsistent across sources. Read every `.prj` and reproject deliberately. Never
assume the projection.

## Licensing (full detail in `docs/LICENSING.md`)

Cleared for this use. The data authors (Marcel Fortin / U of T Map & Data Library and the
Lost Rivers project) granted written email permission for **non-commercial use with
attribution**. Keep the site non-monetized and cite every source in the About panel. City of
Toronto Archives raster items are not public domain by age, so clear or skip them.

## Current state

- Phase 0 is complete and committed on `main`. Scaffold, docs, and the data-folder skeleton
  are done.
- The blank dark map runs: `cd site && npm run dev` → http://localhost:5173.
- Open blocker: the WSL2 toolchain is not installed yet (needs admin elevation and a reboot).
  `pipeline/scripts/setup_wsl_toolchain.sh` finishes the install and prints gdal, tippecanoe,
  and pmtiles versions when it succeeds.

## Next: Phase 1

Clean the hydrography geometry, join the "year last seen" attribute, build the hillshade from
the lidar DTM, and tile everything to PMTiles. Work one phase per session.

The first real go/no-go is the **Phase 2 money shot**: a single still image of a glowing
creek over a dark, hillshaded downtown. Make that beautiful before building any scroll logic.

## Commands

- Run the site: `cd site && npm run dev`
- Build the site: `cd site && npm run build` (emits `site/dist/`)
- Finish the toolchain, inside WSL:
  `cd /mnt/c/Users/leo/toronto_ghost_river/pipeline && bash scripts/setup_wsl_toolchain.sh`
