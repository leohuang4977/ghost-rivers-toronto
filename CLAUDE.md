# CLAUDE.md — Ghost Rivers of Toronto

Operational context for Claude Code. Read this first, every session. The full narrative
plan is in `lost-rivers-toronto-project-plan.md`. Data and licensing detail is in `docs/`.

> Ignore any `CLAUDE.md` in the Windows user home (`C:\Users\leo\CLAUDE.md`). It belongs to
> an unrelated (Pokémon) project. This repo-root file is the source of truth for this project.

## What this is

A static, no-maintenance, portfolio-grade interactive map of Toronto's buried creeks
(Garrison, Taddle, and the downtown network). As a timeline plays, the street grid grows in
over time and the glowing creeks disappear one by one, keyed to the year each was last drawn
on a map. Built to be shown to potential employers. The whole site is static files with no
runtime dependencies, so once it's built there is nothing to maintain.

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
  natively on Windows in `pipeline/bin/`. The pixi env is redirected to a detached location
  (`detached-environments` → `$HOME/.pixi-envs/ghost-rivers`) because the repo lives on the
  Windows C: mount, where `/mnt/c` can't set the Linux file permissions pixi needs.
- Deploy is a static bundle. `site/vite.config.ts` sets `base: './'` so `dist/` runs at a
  domain root or at any subpath of the personal GitHub site with no config change. Target
  host is GitHub Pages (Cloudflare Pages / Netlify are drop-in alternatives). NOT deployed yet.
- The repo must stay **outside** any Google Drive-synced folder. Drive sync corrupts git.

## Data (full detail in `docs/DATA_SOURCES.md`)

All source data is downloaded and staged. Core geometry and the timeline come from two open
Borealis datasets (no login required):

- Historical Hydrography — DOI `10.5683/SP2/IYS0K9` → `pipeline/data/raw/hydrography_uoft/`
- Disappearing Rivers, which carries the year-last-seen attribute —
  DOI `10.5683/SP2/2AHETH` → `pipeline/data/raw/disappearing_rivers/`

Hillshade source: Ontario GeoHub lidar DTM, package **GTA2023-DTM-05** (the one package
covering the downtown creek corridor), 0.5 m, EPSG:2958 → `pipeline/data/raw/lidar_dtm/`.

City context (City of Toronto Open Data, downloaded) →
`pipeline/data/raw/city_open_data/`: Centreline (streets), Green Spaces, Ravine bylaw,
Neighbourhoods.

Historical map rasters are still optional polish (mostly need georeferencing); not used yet.

CRS is inconsistent across sources and some names lie (e.g. `CL_WGS84_hydro_WAMS` is actually
EPSG:3857, not WGS84). Read every `.prj` / `ogrinfo` and reproject deliberately. Never assume.

## Licensing (full detail in `docs/LICENSING.md`)

Cleared for this use. The data authors (Marcel Fortin / U of T Map & Data Library and the
Lost Rivers project) granted written email permission for **non-commercial use with
attribution**. Keep the site non-monetized and cite every source (already in the on-map
attribution line and to go in the About panel). City of Toronto Archives raster items are not
public domain by age, so clear or skip them.

## Study area

Downtown v1 only — the Garrison + Taddle corridor. Study bbox WGS84
`[-79.458, 43.625, -79.352, 43.706]` (≈8.3 × 8.8 km). All tiling is clipped to this.

## Key data facts (carry forward, don't rediscover)

- Creek year field is **`lastNTS`** ("year last seen on a map"; `0` = unknown). Built from
  the geodatabase layer `BI_Lost_Rivers` (95% of downtown creeks dated, 1802–2017) rather
  than the published shapefile (only 15% dated). It's a config switch if ever revisited.
- Vector tiles carry `year_last_seen` + `has_year` (integers) and a `hero` flag (16 Garrison
  segments, selected by connected component from the Crawford St bridge seed).
- 9 creek segments are dated 2017 (still-visible / daylighted — the survivors). 11 segments
  are undated (`has_year=0`, kept and rendered neutral, not "disappeared").
- DTM tiles are a compound 3D CRS (UTM 17N + CGVD2013 height); force plain 2D EPSG:2958 when
  mosaicking. Nodata is inconsistent across tiles (some -3.4e38, some +3.4e38) — set nodata
  explicitly per source or the +sentinel poisons the mosaic. The lake is derived from DTM
  nodata (lidar returns nothing over water) — an accurate extent, but pixelated, so
  `city_layers.py` SMOOTHS it (morphological close+open → simplify → Chaikin, in EPSG:2958)
  into vector curves; knobs in `config.yaml` under `city.water_smoothing`. The `water` fill is
  drawn ABOVE the hillshade in `style.ts` so the smooth shoreline defines the visible coast and
  hides the hillshade's jaggy nodata fringe. (The City Centreline "Major Shoreline" is real
  vector data but is fragmented across the downtown slips/quays and won't close into a lake
  polygon — the lidar extent + smoothing is more robust and more accurate here.)

## Build artifacts (staged in `site/public/data/`)

- `creeks.pmtiles` — MVT vectors, z10–16, layer `creeks`, fields `year_last_seen`+`has_year`+`hero`.
- `hillshade.pmtiles` — PNG raster (gray+alpha, transparent past the DTM/lake edge).
- `city.pmtiles` — multi-layer: `streets` (Centreline road classes), `parks`, `ravines`,
  `water`, plus `street_labels` (arterials, for the Phase 4 symbol layer).
- `labels.geojson`, `creeks_meta.json` — curated landmark labels and the per-feature year list.
- Self-hosted glyph PBFs under `site/public/fonts/` (Noto Sans, SIL OFL) for MapLibre labels.

## The pipeline

Config-driven (`pipeline/config.yaml`), runs via pixi tasks. `pixi run all` builds
everything (creeks + hillshade + city → tiles), steps cache on inputs/outputs. Modules:
`clean_creeks.py` (geometry + year join + `creeks_meta.json`), `hillshade.py`,
`city_layers.py`, `tile.py`. Run order documented in `pipeline/README.md`.

## The site

Vite + TS. Key files: `src/config.ts` (ALL tuning knobs live here), `src/style.ts` (MapLibre
style + layer stack), `src/timeline.ts` (the animation/year engine), `src/labels.ts` (overlay
labels + creek hover tooltip + click-to-focus), `src/beats.ts` (narrative-beat pins + caption
cards), `src/flow.ts` (flowing-water current on the hero creek), `src/ui.ts` (timeline bar +
sparkline + era buttons, layers panel, legend, title), `src/main.ts` (map + dark-styled
controls + wiring), `src/style.css`. Run: `cd site && npm run dev` → http://localhost:5173
(hard-reload with Ctrl+Shift+R after re-tiling).

## Current state — DONE and committed on `main`

- **Phase 0** — scaffold, docs, toolchain (WSL2 + pixi, GDAL/tippecanoe/pmtiles all live).
- **Phase 1** — data pipeline: cleaned creek geometry, joined `lastNTS`, built the hillshade
  from the DTM, tiled to PMTiles.
- **Phase 2 / 2.5 / 2.6** — the "money shot" and the layered cinematic scene: dark moody
  hillshade, glowing hero creek (Garrison brighter/wider with a hot core, other creeks
  dimmer), vignette, and the city context layers (streets, parks, ravines, derived lake).
- **Phase 3** — the interactive piece: a year timeline with autoplay + loop, a draggable
  scrub slider (grabbing pauses autoplay), play/pause + spacebar, a big live year readout, a
  "N creeks still on the map" counter, creek fade-out keyed to `lastNTS` (smooth fade over a
  ~2.5 yr window), dark-styled nav controls (zoom + compass + reset-view) and scale bar, a
  collapsible layer-toggle panel + legend, a quiet title/intro, hover tooltips on creeks, and
  curated landmark + Lake Ontario labels. Respects `prefers-reduced-motion`.
- **Phase 4 Tier 1** — city grows as creeks die (street-grid opacity ramps up with the
  timeline year `Y`), burial flares (a brief bright pulse the moment each creek's year passes,
  then fade to dark), and real self-hosted-glyph street labels for major arterials (a symbol
  layer off the Centreline `street_labels`, wired into the layer toggle panel).
- **Phase 4 Tier 2** — (1) NARRATIVE BEATS: 3 curated, fact-checked story moments (Fort York /
  the name, 1793; McCaul's Pond drained under Hart House, 1884; the Crawford St bridge buried
  whole under Trinity Bellwoods, "1960s"). Each is a warm map pin + a dismissable caption card;
  autoplay dwells briefly and gently pans to an off-screen pin when it hits a beat year;
  scrubbing shows/hides by year. Content + dates were web-researched and adversarially
  verified; wording is kept general where the record is (Crawford burial only ever dated "the
  1960s"). Toggled by "Story notes" in the layers panel. (2) SURVIVOR GLOW: a warm/white glow
  (`survivor-*` layers, filtered on `year_last_seen == endYear`) that ramps in over the ~9
  daylighted creeks only in the final decades (ease-in from 1980), so the ending reads "these
  few survived." Legend gained a "Still visible today" swatch.

- **Phase 4 Tier 3** — polish: (1) FLOWING WATER — a bright dashed "current" marches along the
  hero creek (`flow.ts` rewrites `line-dasharray` each frame; opacity faded by the timeline so
  it flows only where Garrison is still alive; off/hidden under reduced motion). (2) BURIAL-RATE
  SPARKLINE — bars of creeks-last-mapped-per-bin under the year readout, aligned over the
  scrubber with a moving playhead (peak bin ~1930). (3) ERA BUTTONS — 1850/1900/1950/Today jump
  the timeline (keeping play state). (4) CLICK-TO-FOCUS — clicking a creek jumps the timeline to
  the year it was last mapped (firing its burial flare) and pins a richer info card.

- **Shoreline** — Lake Ontario's coast was de-pixelated: `city_layers.py` smooths the lidar
  water polygon into vector curves and `style.ts` draws water above the hillshade (see the DTM
  key-data-fact above).

Main config knobs (all in `site/src/config.ts`): timeline (`autoplayDurationMs`,
`fadeWindowYears`, `endYear`), city-growth curve, flare duration/intensity, `streetLabels`,
`survivor` (fade-in years + warm glow), `beats` (autoPauseMs / showWindowYears / pan / curated
`items`), `flow` (current color/dash/speed), `eras`, `sparkline` (binYears/colors), creek
hero/rest/undated styles, hillshade/city opacities, framing. Terrain shape dials and
`city.water_smoothing` are in `pipeline/config.yaml`.

## Next: deploy + mobile

Phase 4 is complete (Tiers 1–3 + the shoreline fix). Whenever ready: **deploy to GitHub Pages**
(the architecture is built for it, not yet done) and a quick **mobile-layout pass** (the
timeline bar, beat cards, and panels are desktop-tuned).

## Working notes

- Work one phase/tier per session; commit at each clean boundary, then `/clear` and start
  fresh (this file reloads automatically and carries the state forward).
- Do NOT screenshot the MapLibre canvas headlessly — it renders black when the browser tab is
  backgrounded. Leo captures reference images himself from his foreground browser.
- The `[project]` → `[workspace]` rename in `pixi.toml` was done; the deprecation warning is
  gone. The retained ~3.3 GB DTM source zip in `lidar_dtm/` can be deleted to reclaim space.

## Commands

- Run the site: `cd site && npm run dev`
- Build the site: `cd site && npm run build` (emits `site/dist/`)
- Rebuild all tiles (inside WSL):
  `cd /mnt/c/Users/leo/toronto_ghost_river/pipeline && pixi run all`
