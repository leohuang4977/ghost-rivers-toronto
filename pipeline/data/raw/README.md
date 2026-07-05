# `pipeline/data/raw/` — Drop Folder Map

Drop each acquired source into the **exact** folder below. Sub-layers (City Open Data, historical maps) each get their own subfolder. See `docs/DATA_SOURCES.md` for acquisition steps and `docs/LICENSING.md` for pre-publication checks.

| Source | Drop folder | Key file(s) to land | License |
|---|---|---|---|
| Historical Hydrography of Toronto (1802–1886) | `pipeline/data/raw/hydrography_uoft/` | nine per-year shapefile zips (`1802.zip`…`1886.zip`); preserve `.prj` (`EPSG:26917`) | CC BY-SA 4.0 |
| Disappearing Rivers (Lost Rivers) | `pipeline/data/raw/disappearing_rivers/` | `BestInterpretedLostRIversMay12_2017.zip`, `CL_WGS84_hydro_WAMS.zip`, `LR_Toronto_Composite.gdb.tar`, `.kmz` | CC BY-NC-SA 4.0 |
| City Open Data — Centreline | `pipeline/data/raw/city_open_data/centreline/` | `Centreline - Version 2 - 4326.geojson`/`.zip` | OGL–Toronto |
| City Open Data — Neighbourhoods | `pipeline/data/raw/city_open_data/neighbourhoods/` | current **158** (`Neighbourhoods`), NOT "historical 140" | OGL–Toronto |
| City Open Data — Green Spaces | `pipeline/data/raw/city_open_data/green_spaces/` | `Green Spaces - 4326.geojson`/`.zip` | OGL–Toronto |
| City Open Data — Parks & Rec Facilities *(optional)* | `pipeline/data/raw/city_open_data/parks_recreation_facilities/` | `Parks and Recreation Facilities - 4326.geojson` (points only) | OGL–Toronto |
| City Open Data — Ravine & Natural Feature Protection | `pipeline/data/raw/city_open_data/ravine/` | `ravine-natural-feature-protection-area-wgs84.zip` (WGS84-only) | OGL–Toronto |
| City Open Data — Address Points | `pipeline/data/raw/city_open_data/address_points/` | `Address Points - 4326.geojson`/`.zip` + `readme-address-feature-codes.txt` | OGL–Toronto |
| City Open Data — 3D Massing *(optional)* | `pipeline/data/raw/city_open_data/3d_massing/` | `3DMassingShapefile_2025_WGS84.zip` (non-tiled) | OGL–Toronto |
| Ontario Lidar DTM (hillshade source) | `pipeline/data/raw/lidar_dtm/` | Toronto/GTA 1 km tile ZIP package(s) (`.tif`/`.img`, `EPSG:2958`) | OGL–Ontario |
| Historical Maps — Goad atlases | `pipeline/data/raw/historical_maps/goads/<year>/` | large PDF per edition (queue for georeferencing) | Mixed (TPL PD — verify per edition) |
| Historical Maps — Boulton 1858 | `pipeline/data/raw/historical_maps/boulton_1858/` | TPL PDF (queue for georeferencing) | Mixed (TPL PD) |
| Historical Maps — Cane 1842 | `pipeline/data/raw/historical_maps/cane_1842/` | plain scan (TPL/MDL) **or** Map Warper export (KML/WMS/XYZ/CSV) | Public Domain (source), verify GeoTIFF export |
| Historical Maps — Wadsworth & Unwin 1872 | `pipeline/data/raw/historical_maps/wadsworth_unwin_1872/` | 3 PDF panels from LAC NMC25641 (mosaic + georeference) | PD by age (LAC) |
| Historical Maps — City of Toronto Archives plans | `pipeline/data/raw/historical_maps/city_engineer_plans/` | **PAID** high-res order (free view is low-res); georeference | Mixed — NOT PD by age; clearance on you |

## Flags before you drop
- [ ] **`disappearing_rivers`** — CC BY-NC-**SA**: NonCommercial clause blocks a monetized/commercial site without permission.
- [ ] **`hydrography_uoft`** — CC BY-**SA**: ShareAlike/copyleft may bind your derived layers.
- [ ] **`lidar_dtm`** — use the **open GeoHub** copy only; the U of T MDL "Toronto Lidar 2015" copy is **login-gated and not for redistribution**. Tile-picker download, not one bulk file.
- [ ] **City Open Data** — pages look "Retired" to non-JS fetchers (SPA artifact); confirm `state=active` via the CKAN `package_show` API. `license_title=null` ≠ no license.
- [ ] **`historical_maps`** — mostly plain scans needing in-pipeline georeferencing; **City Archives high-res = PAID order**; do **not** assume PD by age. TPL/MDL object pages 403 to bots — open in a browser.
- [ ] Every source: preserve/record the actual CRS from each `.prj`/`gdalinfo`; do not assume.
