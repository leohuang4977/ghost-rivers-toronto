# Pre-Publication Licensing Checklist — Ghost Rivers of Toronto (Phase 0)

> **Read this first — ACCESS ≠ REDISTRIBUTION.** Being able to *download* a file freely (no login, no paywall) does **not** grant the right to *republish, host, or build public derivatives* from it. Each source below carries its own license with its own conditions (attribution, ShareAlike/copyleft, NonCommercial, endorsement bans, or per-work copyright clearance). **Do not assume pre-1900 content is public domain** — the digitized datasets and archival reproductions carry their own terms. Verify every box below *at download time and again before the site goes public.* All license facts were verified **2026-07-05**; re-confirm at publish because per-version license terms can change.

---

## 1. Historical Hydrography of Toronto (1802–1886) — `hydrography_uoft`

**License:** **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)** — URI `http://creativecommons.org/licenses/by-sa/4.0`. This is a **ShareAlike/copyleft** license — **NOT public domain, NOT an Open Government Licence.**

- [ ] Re-confirm the license at download time via the Dataverse REST API license object (name `CC BY-SA 4.0`, uri `http://creativecommons.org/licenses/by-sa/4.0`); Dataverse licenses can differ per version, so re-check the **version 1.3** you actually pull.
- [ ] **ShareAlike decision (CRITICAL for a public portfolio):** if you publish derivative maps built directly from these geometries, the ShareAlike clause can obligate you to release those derived spatial layers under CC BY-SA 4.0 too. Decide whether you will license derived data that way, or use the layer only as an on-screen reference. **Read the actual license text before publishing.**
- [ ] Provide visible attribution on the site: *Marcel Fortin, "Historical Hydrography of Toronto (1802–1886)", Borealis, DOI 10.5683/SP2/IYS0K9*, and note **CC BY-SA 4.0**.
- [ ] Acknowledge the underlying source-map holders as the dataset does: Toronto Public Library, City of Toronto Archives, U of T Map & Data Library, and Derek Hayes (*Historical Atlas of Toronto*, 2008); **Jordan Hale** coordinated the georeferencing/vectorization.
- [ ] If you display the **scanned 19th-century map images** (the large cartographer zips) rather than just the derived vectors, verify those specific source images are clearable for public web display — treat them **more conservatively** than the vector layers (the third-party scans should not be re-hosted publicly without checking their own rights).
- [ ] Verify the DOI (`https://doi.org/10.5683/SP2/IYS0K9`) resolves (302 → Borealis) and that the version cited matches what you downloaded. Record **both** "V1" (citation label) and **v1.3** (live version) for reproducibility.
- [ ] Confirm you preserved the `.prj` (NAD83 / UTM Zone 17N, `EPSG:26917`) and that any web reprojection is documented, so the historical geometry is not silently mis-registered.

---

## 2. Disappearing Rivers of Toronto (Lost Rivers) — `disappearing_rivers`

**License:** **CC BY-NC-SA 4.0** (Attribution-NonCommercial-ShareAlike 4.0 International) — URI `http://creativecommons.org/licenses/by-nc-sa/4.0/`. Confirmed via both the HTML landing/citation pages and the Dataverse JSON metadata API.

- [ ] **NonCommercial is the biggest publishing risk:** a public portfolio site that is **monetized or commercially flavored is NOT covered** without permission from the rights holder (Marcel Fortin / U of T Map & Data Library). Confirm your site's use qualifies as non-commercial, or obtain permission.
- [ ] **ShareAlike:** derivatives built from this data may inherit a copyleft obligation to be released under CC BY-NC-SA 4.0. Decide your derived-layer licensing before publishing.
- [ ] Attribute: *Fortin, Marcel, 2022, "Lost Rivers — Disappearing Rivers of Toronto", Borealis, V3, DOI 10.5683/SP2/2AHETH* (developed with Geohistory-Géohistoire Canada), and note **CC BY-NC-SA 4.0**.
- [ ] Cite **V3** unambiguously (landing page shows 2022-02-14; API release time 2022-04-27 — cite the version, not a single date).
- [ ] If you use the derived GeoJSON from the `geohist-ca/lostrivers` GitHub repo, note it has **NO explicit license file** (confirmed 404 on the GitHub license API; default branch `master`) — **govern/cite it by the Borealis CC BY-NC-SA 4.0 terms**, not as unlicensed-free.
- [ ] Confirm the actual CRS of every layer from its `.prj` and document any reprojection (this deposit's CRS is inconsistent/undocumented — `CL_WGS84` asserts `EPSG:4326`, the related MDL collection is `EPSG:26917`).

---

## 3. City of Toronto Open Data (7 layers) — `city_open_data`

**License:** **Open Government Licence – Toronto (OGL–Toronto) v1.0** (based on OGL–Ontario v1.0). Worldwide, royalty-free, perpetual, non-exclusive; **commercial use permitted**; copy/modify/publish/distribute allowed. Verified against `https://open.toronto.ca/open-data-licence/`.

- [ ] **Attribution string (verbatim):** put exactly **"Contains information licensed under the Open Government Licence – Toronto"** in the map credits / About page / footer before publishing.
- [ ] Do **not** read the CKAN API `license_title = null` / `notspecified` (confirmed on **all seven** packages) as "no license" — the portal-wide OGL page governs. Confirm each dataset page still shows the OGL–Toronto badge at download time and **screenshot it** for your records.
- [ ] Verify each of the seven datasets is still **ACTIVE** (not retired/replaced) at download time via the CKAN `package_show` API (`result.state=active`, `is_retired=false`). The `open.toronto.ca` pages are a JS SPA that renders a blank **"Retired"**-looking template to non-JS fetchers — a rendering artifact; the **API is authoritative**. (All seven were active 2026-07-05.)
- [ ] Cite each layer's **freshness/vintage** (Centreline 2026-07-03 · Green Spaces 2026-05-05 · Neighbourhoods 2026-02-20 · Address Points 2026-07-02 · 3D Massing 2025-12-05 · **Ravine 2019-07-23, data currency May 2018** — state the vintage).
- [ ] Disclose data caveats on the site: **Green Spaces** is generalized/point-in-time and includes non-park areas (traffic islands, golf courses) — filter/label. **Neighbourhoods** are social-planning boundaries (current 158), **not** legal/ward boundaries — don't imply legal precision, and **don't ship the "historical 140" layer**. Centreline/3D Massing/Address data are "as is" — add a "for reference, not survey-grade" disclaimer if you overlay lost-river alignments.
- [ ] **Privacy:** Address Points is public municipal address data (not personal data), but OGL does not grant rights to combine it with personal information — if you geocode/join anything user-related, review separately.
- [ ] Note the **PHIPA** (Personal Health Information Protection Act, 2004) carve-out exists in OGL–Toronto — irrelevant to these mapping layers, but flag it if the portfolio ever adds health data.
- [ ] Do **not** imply City of Toronto **endorsement** — keep the credit factual (OGL forbids suggesting endorsement).
- [ ] **Redistribution:** if you host/redistribute the raw files (not just render them), keep the OGL attribution with the files and note they may differ from the live City source.

---

## 4. Ontario Digital Terrain Model (Lidar-Derived) — `lidar_dtm`

**License:** **Open Government Licence – Ontario (OGL–Ontario)** — note **Ontario, NOT Toronto**. Verified on data.ontario.ca, open.canada.ca, and the ISO 19139 metadata record. Attribution required; adaptation/redistribution/commercial use permitted; endorsement prohibited.

- [ ] Confirm the license reads **"Open Government Licence – Ontario"** (verified across three sources). Read the terms at `https://www.ontario.ca/page/open-government-licence-ontario` before publishing derivatives.
- [ ] **Attribution:** include a statement crediting the Information Provider (Province of Ontario / **King's Printer for Ontario**). If none is specified, the licence default is acceptable: **"Contains information licensed under the Open Government Licence – Ontario."** Put it on the public site and in the repo.
- [ ] Do **not** imply that Ontario / the King's Printer **endorses** your project.
- [ ] Confirm the **specific Toronto (GTA) package** you download is itself OGL–Ontario — the provincial DTM is a compilation of many acquisition projects; verify the per-package User Guide/metadata for any project-specific note.
- [ ] **If you used the U of T MDL / Scholars GeoPortal copy instead: do NOT publish or redistribute it.** That path is access-restricted to the U of T community and may carry different terms. Only the **open GeoHub copy** is safe to redistribute/derive from publicly. *(This is the clearest ACCESS-vs-REDISTRIBUTE trap in the whole project.)*
- [ ] A **hillshade is a derivative work** — OGL–Ontario permits copy/modify/adapt/publish/distribute (incl. commercial) with attribution, so a derived hillshade is fine; **keep the attribution on the derived tiles/layer.**
- [ ] Re-check that all download/service URLs still resolve at publish time (provincial ETL/download hosts `ws.gisetl.lrc.gov.on.ca`, `publicdocs.mnr.gov.on.ca` occasionally change).

---

## 5. 19th-Century Toronto Historical Map Rasters — `historical_maps`

**License:** **Mixed / per-holding-institution — NOT a blanket "pre-1900 = public domain."** No item here is CC-BY or Dataverse-gated, but each institution sets its own terms. There is **NO Open Government / Open Data Licence** on these archival map reproductions (the City's Open Data Licence covers the open-data catalogue, a separate corpus).

**Per-institution summary:** TPL Digital Archive PD items (Goad, Boulton, Cane obj 355197) → reproducible for any purpose per `https://tpl.ca/digital-archive/licences/`; credit "Courtesy of Toronto Public Library" appreciated (not mandatory). U of T MDL scans → out-of-copyright, publicly downloadable. Wikimedia Cane file → Public Domain (PD Mark 1.0). Map Warper layer → derived work, underlying content still PD. LAC (Wadsworth NMC25641) → PD by age. **City of Toronto Archives plans → governed by the Archives' Copyright Guidelines for Researchers; PD only after term expiry; researcher bears the clearance burden.**

- [ ] Confirm the **exact edition/plate** you download is actually public domain. Goad runs 1880–1924 — the **1903, 1910, 1913, 1924** plates are 20th-century; verify TPL flags **that specific edition** "Public Domain" (not "Copyright") on its Digital Archive object page, rather than assuming age alone.
- [ ] On each TPL Digital Archive object page, read the rights field: only items explicitly labelled **"Public Domain"** get the free-for-any-purpose terms. If an item is labelled **"Copyright,"** clearing rights before public publication is **your** obligation.
- [ ] Add the requested attribution **"Courtesy of Toronto Public Library"** (and the U of T MDL image-hosting credit if you pull plates from `maps.library.utoronto.ca`).
- [ ] **Cane via Map Warper:** confirm the Wikimedia Commons source file is PD (PD Mark 1.0, source TPL) and cite it; the rectified layer inherits PD but credit the georeferencer / Map Warper as courtesy. If you export a GeoTIFF, note it required a **free Wikimedia login** — and that the GeoTIFF export option was **not confirmable without logging in**, so verify before relying on it.
- [ ] **Wadsworth & Unwin 1872:** treat LAC original **NMC25641** as PD by age; credit LAC + the U of T maps library that hosts the scan; confirm no added restriction on the LAC record.
- [ ] **City of Toronto Archives plans — do NOT assume public domain by age.** Read the Archives' Copyright Guidelines for Researchers and the paid reproduction-order terms you agree to at purchase; confirm the specific work is City-authored or otherwise PD, that reuse permits **publication on a public website** (not just personal research), and capture the series/item citation. **If the work has a non-City author still in copyright, the clearance burden is on you.**
- [ ] Confirm none of the chosen files carry **donor restrictions or third-party rights** on the holding-institution page before putting them on a public portfolio.
- [ ] Because most files arrive as **plain scans**, verify the georeferencing accuracy (RMS error) of your own GCP fit before publishing overlays, and state on the site that georeferencing was done in-pipeline (the crossfades are **your** rectification, not the institution's).
