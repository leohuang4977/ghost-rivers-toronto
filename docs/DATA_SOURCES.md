# Manual Data Acquisition — Ghost Rivers of Toronto (Phase 0)

> **Purpose:** Manual, one-time acquisition of every source layer the map depends on.
> Follow each section, then drop files at the **exact** path shown. All URLs and formats below were verified live on **2026-07-05**.
> **Global CRS note for web display:** most sources arrive projected (NAD83/UTM 17N `EPSG:26917`, NAD83(CSRS)/MTM 10 `EPSG:2952`, or UTM 17N `EPSG:2958`). Read each `.prj`/`gdalinfo` and reproject to `EPSG:3857` (Leaflet/Mapbox) or `EPSG:4326` as your pipeline needs — never assume.

---

## 1. Historical Hydrography of Toronto (1802–1886) — `hydrography_uoft`

**What it is:** U of T Map & Data Library's vectorized historical creek/river/shoreline layers for nine survey years (1802–1886), plus the georectified 19th-century source-map scans they were traced from.

**Where to get it (verified 200):**
- Canonical landing page (use this): https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP2/IYS0K9
- DOI: https://doi.org/10.5683/SP2/IYS0K9 (302 → Borealis record)
- MDL collection page: https://mdl.library.utoronto.ca/collections/geospatial-data/historical-hydrography-toronto
- Authoritative file/version/CRS metadata (JSON): https://borealisdata.ca/api/datasets/:persistentId/?persistentId=doi:10.5683/SP2/IYS0K9

**Access method:** Public direct download, **no login**, no Dataverse account, no guestbook/terms click-through. Fully open (verified all files "Public" via the Dataverse REST API). Grab files individually or the whole dataset as one ~121 MB zip.
> ⚠️ **Do NOT use** the deprecated mirror `maps.library.utoronto.ca/datapub/toronto/historicalhydro/` — it returns **HTTP 403** to automated fetching and is retired.

**Format it arrives in:** 29 files, ~121.4 MB total. CRS is **NAD83 / UTM Zone 17N (`EPSG:26917`)**. It is a **zip-of-shapefiles, NOT a file geodatabase**; no loose GeoTIFF/GeoJSON at the repo level.
- **GIS vectors (what the map needs):** nine small per-year zips — `1802.zip 1834.zip 1842.zip 1851.zip 1853.zip 1857.zip 1872.zip 1878.zip 1886.zip` (~12 KB–127 KB each). Each is a zipped Esri shapefile set: a **LINE** shapefile (creeks) + a **POLYGON** shapefile (rivers + shoreline).
- **Georectified source-map rasters (optional):** ten cartographer/year zips holding a scanned 19th-c. map (JPEG/TIF) + world file — `Chewett_1802.zip Chewett_1834.zip Cane_1842.zip Browne_1851.zip Fleming_1853.zip Waterlow_1857.zip WadsworthUnwin_1872.zip Cotterell_1878.zip Hart_Rawlinson_1878.zip SpeightVanNostrand_1886.zip`. Big ones: `Waterlow_1857.zip` ~45 MB, `Fleming_1853.zip` ~40 MB.
- **KMZ (optional):** 11 `.kmz` files with an **irregular** layout — no `1872.kmz`, and 1878 is split into `1878_Cotterell.kmz` + `1878_Hart_Rawlinson.kmz`, plus `Browne_1851.kmz`.

**Acquisition steps:**
1. Open the Borealis landing page above; confirm author **Fortin, Marcel**, DOI `10.5683/SP2/IYS0K9`. No login prompt should appear.
2. Note version: header shows **Version 1.3** (released 2022-11-14) even though the citation label reads "V1" — record both for reproducibility.
3. For the map's layers, open the **Files** tab and download the nine per-year vector zips (`1802.zip` … `1886.zip`).
4. *(Optional, provenance/base-map imagery)* download the ten cartographer raster zips; skip if you only need vectors (`Waterlow_1857.zip` ~45 MB and `Fleming_1853.zip` ~40 MB are large).
5. *(Alternative)* use **Access Dataset → Download ZIP** to pull all 29 files at once (~121 MB) as `dataverse_files.zip`.
6. Unzip `dataverse_files.zip` first, then unzip each inner `YYYY.zip` to expose the `.shp/.shx/.dbf/.prj` components. **Preserve the `.prj`.**
7. Verify each `.prj` reads NAD83 / UTM Zone 17N (`EPSG:26917`); reproject for web display in-pipeline as needed.
8. Record the citation verbatim for attribution: *Fortin, Marcel, 2015, "Historical Hydrography of Toronto (1802 - 1886)", https://doi.org/10.5683/SP2/IYS0K9, Borealis, V1.* (Internally note: live version 1.3; production 2013; first Borealis publication 2020-06-18.)

**Drop path:** `pipeline/data/raw/hydrography_uoft/`
*(Keep the per-year zips or their unpacked shapefile folders; preserve `.prj`.)*

> **Licensing flag (see licensing doc):** CC BY-SA 4.0 — a **ShareAlike/copyleft** license, NOT public domain. Derived spatial layers may inherit a copyleft obligation. **Confidence: high.**

---

## 2. Disappearing Rivers of Toronto (Lost Rivers) — `disappearing_rivers`

**What it is:** Marcel Fortin / U of T MDL (with Geohistory-Géohistoire Canada) "best interpreted" lost-rivers linework, western creeks, and a composite geodatabase — the source data behind lostrivers.ca, carrying the "Year River was last seen on a Map" timeline attribute.

**Where to get it (verified 200):**
- Landing page (use this to reach the Files tab): https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP2/2AHETH
- DOI: https://doi.org/10.5683/SP2/2AHETH (302 → Borealis **/citation** view, not /dataset.xhtml)
- Metadata JSON: https://borealisdata.ca/api/datasets/:persistentId/?persistentId=doi:10.5683/SP2/2AHETH
- Derived Leaflet GeoJSON (optional): https://github.com/geohist-ca/lostrivers (default branch `master`)
- Timeline label reference: https://www.lostrivers.ca/disappearing.html

**Access method:** Public direct download, **fully open, no gate**. Each `/api/access/datafile/<id>` 303-redirects anonymously to a signed Scholars Portal object-storage URL served as an attachment — true anonymous download, no login/account/terms.

**Format it arrives in:** Exactly **4 files** (download individually or as one dataset `.zip`). Vector + geodatabase + KMZ only — **no raster/GeoTIFF in this deposit**.

| File | ID | Format | Display size |
|---|---|---|---|
| `BestInterpretedLostRIversMay12_2017.zip` | 286106 | zipped ESRI Shapefile (interpreted lost-rivers linework) | 539.7 KB |
| `CL_WGS84_hydro_WAMS.zip` | 286108 | zipped ESRI Shapefile ("Western creeks"; name asserts WGS84 `EPSG:4326`) | 243.6 KB |
| `LR_Toronto_Composite.gdb.tar` | 286109 | TAR → ESRI File Geodatabase (all stream/river layers) | 4.0 MB |
| `BestInterpretedLostRIversMay12_2017.kmz` | 286107 | Google Earth KMZ | 606.8 KB |

> ⚠️ **CRS is inconsistent/undocumented across this deposit.** `CL_WGS84` name declares `EPSG:4326`, but the related MDL Historical Hydrography collection is `EPSG:26917`. **Read every `.prj` after unzipping — do not assume.**

**Acquisition steps:**
1. Open the DOI; it lands on the **/citation** view. To reach the files, open the full landing page: `https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP2/2AHETH`.
2. Confirm **Version 3.0**, author **Marcel Fortin**, license **CC BY-NC-SA 4.0**. (Cite "V3" — landing shows 2022-02-14, API shows 2022-04-27.)
3. Under **Files** you'll see exactly 4 files. Either check the top box → **Download → ZIP Archive**, or download each via its per-file button. Direct `https://borealisdata.ca/api/access/datafile/<id>` URLs also work anonymously.
4. Download all four (IDs 286106, 286108, 286109, 286107).
5. Move them into the drop path (create the folder if needed).
6. Unzip the two `.shp` zips and untar the GDB (`tar -xf LR_Toronto_Composite.gdb.tar` → a `.gdb` folder).
7. Open each `.prj` (or `ogrinfo -so <layer>`) and **record the actual CRS of every layer** — the composite GDB may be `EPSG:26917` while `CL_WGS84` is `EPSG:4326`.
8. Find the **"Year River was last seen on a Map"** field in the attribute table (exact column name is undocumented — inspect it) and confirm it is populated before wiring the timeline slider.
9. *(Optional)* if you want ready-to-serve Leaflet GeoJSON with the year field, clone `geohist-ca/lostrivers`, but treat Borealis as canonical. **That repo has NO LICENSE file — govern it by Borealis CC BY-NC-SA 4.0.**

**Drop path:** `pipeline/data/raw/disappearing_rivers/`

> **Licensing flag (see licensing doc):** CC BY-NC-SA 4.0 — the **NonCommercial** clause is the biggest portfolio risk; a monetized/commercially-flavored site is not covered without permission. **Confidence: high.**

---

## 3. City of Toronto Open Data (CKAN portal) — `city_open_data`

**What it is:** Seven City base-context layers for the map — Toronto Centreline (streets), Neighbourhoods, Green Spaces, Parks & Recreation Facilities, Ravine & Natural Feature Protection area, Address Points, and 3D Massing.

**Where to get it (verified 200):**
- Catalogue: https://open.toronto.ca/catalogue/
- Per-dataset pages: `.../toronto-centreline-tcl/` · `.../neighbourhoods/` · `.../green-spaces/` · `.../parks-and-recreation-facilities/` · `.../ravine-natural-feature-protection-area/` · `.../address-points-municipal-toronto-one-address-repository/` · `.../3d-massing/` (all under `https://open.toronto.ca/dataset/`)
- License: https://open.toronto.ca/open-data-licence/
- **Authoritative metadata (use this, not the page):** `https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=<slug>`

**Access method:** Public direct download — **no login, no gate**. Each resource has a plain HTTPS link; also pullable via the CKAN Action API.
> ⚠️ **SPA rendering gotcha:** `open.toronto.ca/dataset/<slug>/` is a client-side JS SPA. Non-JS fetchers see a blank **"Retired"** template shell — this is a **rendering artifact, not a retired dataset.** For authoritative state/resources/refresh-date/CRS, hit the CKAN `package_show` API. (All seven were `state=active`, `is_retired=false` on 2026-07-05.)
> ⚠️ **3D Massing only:** the Shapefile/Multipatch ZIPs are direct downloads, but SketchUp/AutoCAD variants are **tiled** behind an Interactive Map Tile Locator + Tile Locator Reference PDF. For a rivers map, take the Shapefile ZIP (not tiled).

**Format it arrives in (per layer):** Where two CRS exist, use **`EPSG:4326`** (WGS84) for the web map, **`EPSG:2952`** (NAD83(CSRS)/MTM 10) for measurement.

| Layer (slug) | Geometry | Formats / CRS | Notes |
|---|---|---|---|
| Toronto Centreline (`toronto-centreline-tcl`) | lines (~64,401) | SHP-zip / CSV / GeoJSON / GPKG, 4326 & 2952 | "Centreline - Version 2" |
| Neighbourhoods (`neighbourhoods`) | polygons | SHP-zip / CSV / GPKG / GeoJSON, 4326 & 2952 | Grab **current 158**, NOT "historical 140" |
| Green Spaces (`green-spaces`) | polygons | GeoJSON / SHP-zip / CSV / GPKG, 4326 & 2952 | Park/open-space boundaries; includes non-park areas |
| Parks & Rec Facilities (`parks-and-recreation-facilities`) | **points only** (~1,789) | GeoJSON / SHP-zip / CSV / GPKG, 4326 & 2952 | Optional; amenity locations, not polygons |
| Ravine & Natural Feature Protection (`ravine-natural-feature-protection-area`) | polygons | **single SHP-zip, WGS84/4326 ONLY** | Data currency May 2018, refreshed 2019-07-23 |
| Address Points (`address-points-municipal-toronto-one-address-repository`) | points (~525k) | GeoJSON / SHP-zip / CSV / GPKG, 4326 & 2952 | Also grab `readme-address-feature-codes.txt`; large file |
| 3D Massing (`3d-massing`) | polygons/multipatch | `3DMassingShapefile_2025_WGS84.zip` + Multipatch (WGS84) | Optional for 2D; newest year 2025 |

**Ravine verified direct URL:** `https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/204a7e54-8963-4e35-992e-5f21544ef595/resource/bb81bb0f-f88a-4f3e-bca7-a328154ba31b/download/ravine-natural-feature-protection-area-wgs84.zip`

**Acquisition steps:**
1. **Before downloading**, confirm each dataset is current via the CKAN API (`package_show?id=<slug>` → `result.state=active`, `is_retired=false`). Do **not** judge status from the SPA page.
2. **Centreline:** download `Centreline - Version 2 - 4326.geojson` (or `.zip` shapefile) → `.../centreline/`.
3. **Neighbourhoods:** download `Neighbourhoods` (GeoJSON) or `Neighbourhoods - 4326.zip`; do **not** take "historical 140" → `.../neighbourhoods/`.
4. **Green Spaces:** download `Green Spaces - 4326.geojson` (or `.zip`) → `.../green_spaces/`. Filter by type attributes for true parks (layer includes traffic islands, golf courses).
5. **Parks & Rec Facilities (optional):** download `Parks and Recreation Facilities - 4326.geojson` → `.../parks_recreation_facilities/`. Skip if you only need polygons.
6. **Ravine:** download the single WGS84 SHP-zip (direct URL above) → `.../ravine/` and unzip.
7. **Address Points:** download `Address Points - 4326.geojson` (or `.zip`) + `readme-address-feature-codes.txt` → `.../address_points/`.
8. **3D Massing (optional):** download `3DMassingShapefile_2025_WGS84.zip` (single non-tiled ZIP) → `.../3d_massing/`. Skip SketchUp/AutoCAD (tiled).
9. After each download, confirm the file opens (`ogrinfo`/QGIS), note its CRS, and reproject the 4326 files as needed (Ravine is already WGS84).
10. Record download date and each dataset's **last-refreshed** date (from the CKAN API) in provenance notes.

**Freshness (CKAN API, 2026-07-05):** Centreline 2026-07-03 · Green Spaces 2026-05-05 · Neighbourhoods 2026-02-20 · Address Points 2026-07-02 · 3D Massing 2025-12-05 · **Ravine 2019-07-23 (May 2018 currency — state the vintage).**

**Drop path:** `pipeline/data/raw/city_open_data/<layer>/`
*(e.g. `.../centreline/`, `.../neighbourhoods/`, `.../green_spaces/`, `.../parks_recreation_facilities/`, `.../ravine/`, `.../address_points/`, `.../3d_massing/`)*

> **Licensing flag (see licensing doc):** Open Government Licence – Toronto v1.0 (commercial use OK, attribution required). CKAN `license_title` returns `null` on all packages — this is **not** "no license"; the portal-wide OGL page governs. **Confidence: high.**

---

## 4. Ontario Digital Terrain Model (Lidar-Derived) — `lidar_dtm`

**What it is:** Provincial bare-earth lidar DTM raster (for a hillshade under the map), covering Toronto, from Ontario GeoHub / Geospatial Ontario (MNR).

**Where to get it (verified 200):**
- Landing page: https://geohub.lio.gov.on.ca/maps/mnrf::ontario-digital-terrain-model-lidar-derived/about
- data.ontario.ca record: https://data.ontario.ca/dataset/ontario-digital-terrain-model-lidar-derived
- open.canada.ca record: https://open.canada.ca/data/en/dataset/7c3d7022-2631-45bc-8f6b-f3d51b7779a7
- ISO 19139 metadata XML: https://www.arcgis.com/sharing/rest/content/items/776819a7a0de42f3b75e40527cc36a0a/info/metadata/metadata.xml?format=default&output=html
- **DTM Tile Index shapefile (direct ZIP, no browser):** https://www.publicdocs.mnr.gov.on.ca/mirb/OntarioDTM_LidarDerived_TileIndex.zip
- Public ImageServer (streaming/clip): https://ws.geoservices.lrc.gov.on.ca/arcgis5/rest/services/Elevation/Ontario_DTM_LidarDerived/ImageServer

**Access method:** Public, free, **no login** on GeoHub. Access is via a **TILE PICKER**, not one bulk file: use the Data Download map (or the Tile Index shapefile) to find the 1 km × 1 km tiles covering Toronto, then download the ZIP package(s). Packages served over HTTPS from `ws.gisetl.lrc.gov.on.ca` and index/extent files from `publicdocs.mnr.gov.on.ca`.
> ⚠️ **GATED alternate — do NOT use for a public site:** the U of T MDL / Scholars GeoPortal "Toronto Lidar 2015" copy is **login-restricted** to U of T faculty/staff/students, ships the DTM as **1 m XYZ ASCII** (only hillshade is GeoTIFF), and must **not** be redistributed. Prefer the open GeoHub source.
> ⚠️ **JS gotcha:** the GeoHub "About" page is a JS ArcGIS Hub app — a plain fetch returns only the title; open it in a real browser to reach the download experience.

**Format it arrives in:** One or more ZIP packages, each holding 1 km × 1 km bare-earth DTM tiles. Resolution **0.5 m or 1 m** (Toronto/GTA acquisition, captured April 2014 & April 2015, is **1 m**). Raster format is **GeoTIFF (`.tif`)** for newer packages or **ERDAS IMAGINE (`.img`)** for older — confirm on unzip. Horizontal CRS for Toronto: **NAD83(CSRS)/UTM 17N `EPSG:2958`**. Vertical: **CGVD2013 `EPSG:6647`** or **CGVD28 `EPSG:5713`** — check per package.
> Note: the ImageServer's **display** SR is `EPSG:3857` (Web Mercator) — that is the streaming service's SR, **not** the SR of the downloadable Toronto tiles (`EPSG:2958`).

**Acquisition steps:**
1. Open the landing page in a **real browser** and read the description + User Guide.
2. *(No browser needed)* download the Tile Index shapefile directly: `https://www.publicdocs.mnr.gov.on.ca/mirb/OntarioDTM_LidarDerived_TileIndex.zip`, so you can pick Toronto tile IDs/package names in QGIS against a Toronto boundary.
3. On the Data Download map, zoom to Toronto (all within UTM 17N); click your area of interest to see which named ZIP package(s) cover it (the **GTA** package covers Toronto), or cross-reference the Tile Index.
4. Download the covering ZIP package(s) via direct HTTPS (no login). A full Toronto footprint may span multiple tiles/packages.
5. Unzip into the drop path. Run `gdalinfo` to confirm raster type (`.tif`/`.img`), 1 m resolution, `EPSG:2958`, and the vertical datum. If `.img`, plan a `gdal_translate` step.
6. For a hillshade: mosaic the Toronto tiles (`gdalbuildvrt` → optional `gdal_translate`), then `gdaldem hillshade`. For streaming/clipping without bulk download, use the ImageServer.

**Drop path:** `pipeline/data/raw/lidar_dtm/`

> **Licensing flag (see licensing doc):** Open Government Licence – Ontario (attribution required; adaptation/redistribution/commercial permitted; endorsement prohibited). A derived hillshade is fine with attribution. **Confidence: high.**

---

## 5. 19th-Century Toronto Historical Map Rasters — `historical_maps`

**What it is:** Georeferenceable scans of Goad fire-insurance atlases, Boulton 1858, Cane 1842, Wadsworth & Unwin 1872, and City of Toronto Archives plans — for the map's crossfade/overlay layer.

> ⚠️ **Reality check:** there is **NO single source that hands you georeferenced GeoTIFFs for all five items.** Almost everything arrives as **plain (non-georeferenced) scans** that need an in-pipeline georeferencing step. Only the Cane 1842 map has a ready-made georeferenced export.
> ⚠️ **This source is a mix of free downloads, a login-gated export, and a PAID reproduction order — flag before expecting free downloads throughout.**

**Where to get it (verified 200 unless noted):**
- Aggregator index (finding aid only, no license note): http://oldtorontomaps.blogspot.com/p/index-of-maps.html
- Goad year index: http://goadstoronto.blogspot.com/
- TPL fire-insurance page (**current** URL; old `.jsp` path is dead/404): https://tpl.ca/downloads-ebooks/history-genealogy/fire-insurance-plans/
- Cane 1842 plain scan (TPL obj 355197, **browser-only, 403 to bots**): https://digitalarchive.tpl.ca/objects/355197/topographical-plan-of-the-city-and-liberties-of-toronto-in-t
- Cane 1842 plain scan (MDL, **browser-only, 403 to bots**): https://mdl.library.utoronto.ca/collections/scanned-maps/topographical-plan-city-and-liberties-toronto
- Cane 1842 **georeferenced** (Map Warper, 45 control points): https://warper.wmflabs.org/maps/3332
- Cane 1842 PD source file: https://commons.wikimedia.org/wiki/File:Toronto_Cane_map_1842.jpg
- Wadsworth & Unwin 1872 (3 PDF panels, from LAC NMC25641): http://oldtorontomaps.blogspot.com/2013/01/1872-wadsworth-unwin-map-of-city-of.html
- City of Toronto Archives maps: https://www.toronto.ca/city-government/accountability-operations-customer-service/access-city-information-or-records/city-of-toronto-archives/whats-online/maps/historical-maps-and-atlases/
- TPL Digital Archive licences: https://tpl.ca/digital-archive/licences/

**Access method:** Mixed. Free public PDF/JPEG/TIFF downloads for TPL/MDL/LAC items; **Map Warper extra-format export needs a free Wikimedia login**; **City of Toronto Archives high-resolution copies are a PAID reproduction order** (free viewing is low-res only). None are behind a U of T library login or a Dataverse.

**Format it arrives in:** Plain (non-georeferenced) JPEG/TIFF/PDF scans in almost all cases — plan a georeferencing step.
- **Goad / Boulton 1858:** very large multi-page PDFs from TPL Digital Archive (TPL states **150–227 MB** each); plate JPEGs re-hosted on U of T MDL.
- **Cane 1842:** plain high-res JPEG/TIFF (TPL/MDL) **or** georeferenced via Map Warper — public exports give **KML / WMS / XYZ tiles / points-CSV** immediately; a rectified GeoTIFF appears only after a free Wikimedia login and **was NOT confirmable without logging in** (verify before relying on it). Map Warper outputs are typically `EPSG:4326`/`EPSG:3857`.
- **Wadsworth & Unwin 1872:** 3 plain-scan PDF panels (~2–3 MB each) — mosaic them.
- **City Archives plans:** JPEG/PDF low-res viewing copies (free) or purchased high-res TIFF/JPEG.

**Acquisition steps:**
1. Start at the aggregator index to confirm the edition and reach the holding institution (it links to per-map blog posts, not institutions directly, and carries **no license note** — treat as a finding aid).
2. **Goad atlases:** use `goadstoronto.blogspot.com` to pick the year (1880, 1884, 1889, 1890, 1893, 1899, 1903, 1910, 1913, 1924); download the free PDF from the TPL fire-insurance page (files 150–227 MB). Save under `.../goads/<year>/`. Queue for georeferencing.
3. **Boulton 1858:** from the same TPL page, follow the 1858 Boulton link and download the free PDF. Save under `.../boulton_1858/`. Queue for georeferencing.
4. **Cane 1842:** (a) plain scan from TPL obj 355197 or MDL scanned-maps (both PD; **open in a real browser — both 403 to bots**); or (b) **georeferenced** via Map Warper 3332 — use the public KML/WMS/XYZ/points-CSV exports immediately; for a rectified GeoTIFF sign in with a free Wikimedia account and confirm the GeoTIFF option exists first. Save under `.../cane_1842/`. Prefer Map Warper to skip georeferencing.
5. **Wadsworth & Unwin 1872:** from the blog post above, download all three full-size PDF panels hosted on the U of T maps library (from LAC NMC25641). Save under `.../wadsworth_unwin_1872/`. Georeference and mosaic the 3 panels.
6. **City of Toronto Archives plans:** browse the free low-res viewing copies, identify the plan(s)/series, then **place a PAID reproduction order** for usable resolution (not a free download). Save under `.../city_engineer_plans/`. Queue for georeferencing.
7. For every plain scan (Goad, Boulton, Wadsworth, City Archives, and Cane if not via Map Warper), run the georeferencing step (QGIS Georeferencer or GDAL `gdal_translate` + `gdalwarp` with GCPs against a modern Toronto basemap → your project CRS, e.g. `EPSG:3857` for web crossfades or `EPSG:26917` for metric work).
8. Record provenance per subfolder (a small `source.txt`/JSON: holding institution, catalogue/accession number, download URL, download date, and the institution's rights note copied verbatim) — especially for City Archives items, whose reuse terms depend on the specific work's copyright status, not age.

**Drop path:** `pipeline/data/raw/historical_maps/<atlas>/`
*(e.g. `.../goads/<year>/`, `.../boulton_1858/`, `.../cane_1842/`, `.../wadsworth_unwin_1872/`, `.../city_engineer_plans/`)*

> **Licensing flag (see licensing doc):** Mixed / per-institution — **NOT a blanket "pre-1900 = public domain."** TPL PD items are free for any purpose; City of Toronto Archives items are **not PD by age** and put the clearance burden on you. **Confidence: high.**
