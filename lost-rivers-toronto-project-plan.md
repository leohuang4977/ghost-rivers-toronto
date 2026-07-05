# Ghost Rivers of Toronto — Project Brief

*Working title. Alternatives: "Lost Rivers of Toronto," "Under Toronto," "Buried."*

A portfolio-grade interactive map that reveals the buried creeks still running beneath Toronto's streets. Built to be seen by potential employers as a data-visualization and front-end craft piece.

---

## 1. At a glance

Before Toronto was a city, dozens of creeks cut ravines across the land on their way to Lake Ontario. As the city grew, most were buried into sewers and forgotten. Garrison Creek, Taddle Creek, and Mud Creek still flow underground today, and their old paths leave visible fingerprints in the modern city: odd bends in roads, sudden dips, a buried bridge under a park.

This project turns that story into a scroll-driven map. As the reader scrolls, the city's street grid grows over the land and the glowing creeks wink out one by one, keyed to the year each was last drawn on a map. It ends by pointing the reader to spots they can walk to and see the ghost of a river for themselves.

Three constraints define the whole build:

1. **The information never changes.** Buried rivers don't move and 19th-century maps don't update. Everything can be frozen at build time.
2. **Zero maintenance, zero runtime dependencies.** No servers, no databases, no API keys that expire, no vendor that can rate-limit or bill. All data is baked into static files. A site that calls nothing at runtime cannot break.
3. **The bar is craft.** This is a showpiece. The value is in the design, the smoothness, and the storytelling, not in feature count.

---

## 2. Why this one, and what makes it different

The concept has been done. What has not been done is a well-designed, custom build. Here is the honest competitive picture as of mid-2026, so this project starts with clear eyes:

- **lostrivers.ca "Disappearing Rivers"** and a couple of student projects (e.g. Jonathan Critchley's) are jQuery / Leaflet slider tools built on older story-map templates. Solid data work, dated presentation.
- **U of T Map & Data Library** hosts templated Esri ArcGIS StoryMaps and an ArcGIS Hub site for walking routes. Useful, but visibly off-the-shelf.
- **CBC's 2024 interactive** ("Discover where ancient rivers flow under Canadian cities") is the one genuinely polished piece. It covers Toronto, Montreal, and Vancouver, and it draws on the work of Paul Lesack (UBC), Marcel Fortin (U of T), and Lost Rivers. It is a national newsroom feature framed around the climate/daylighting angle, not a Toronto-specific cartographic deep dive, and it is a one-off article rather than a standing piece.

The open lane: a **custom (non-template) MapLibre + deck.gl build, Toronto only**, that does two things none of the above do together. First, it uses **terrain shading to show that the ravines are still physically there**, even where the water is gone. Second, it **animates the disappearance over time** as a designed scrollytelling sequence. That combination is the differentiator, and it is buildable because the underlying GIS already exists at U of T.

**The unfair advantage:** your U of T library access reaches Marcel Fortin's Map & Data Library, which holds the digitized historical hydrography and the georeferenced 19th-century maps that are the hardest part to source. That is exactly the material this piece is made of.

---

## 3. The core idea: scene-by-scene

The whole thing is a vertical scroll. The map stays fixed; the scroll drives the camera and what's shown. Rough sequence for v1:

1. **Cold open.** The full pre-settlement creek network glows cyan over dark, empty land. No streets. A single line of text: *Before the city, water ran everywhere.*
2. **The land itself.** Hillshade fades in. The reader sees the ravines as real topography carved by the water. *The creeks dug these valleys. The valleys never left.*
3. **The city arrives.** The street grid grows in across time (roughly 1850 → 1900 → 1950 → today). As it does, the creeks wink out one at a time, keyed to the year each was last mapped. A small counter ticks down as the glowing web goes dark.
4. **Follow one river: Garrison Creek.** The camera flies to the headwaters near Dundas and Ossington and traces the creek south to the lake. Story beats along the way: the buried Crawford Street bridge in Trinity Bellwoods, still standing, buried up to the road deck; the old ravine that is now the off-leash dog park; the drowning at Small's Pond; the arc of Niagara Street left by the old creek bank.
5. **Signs above ground, today.** Geolocated points connect the invisible water to the visible city, each with a present-day photo: the dip walking north on Ossington, the curve of Ravina Crescent, a line of willows, a grate you can look down. This is the payoff. The reader can go stand on these.
6. **Close.** Pull back to the whole ghost network shimmering under modern Toronto. *You are probably standing on a river.* Then: land acknowledgement, Indigenous relationship to the waterways where sources support it, and a sources/credits panel.

Taddle Creek (U of T campus, the pond at Hart House, Philosopher's Walk) is the obvious second flagship for v1.1.

---

## 4. The signature move

Most lost-river maps draw blue lines on a flat basemap. Two things lift this above that:

**Ghost valleys from a DEM.** Run a hillshade off a high-resolution elevation model of the city. The ravines the creeks carved are still measurable dips in the ground, so the hillshade makes them visible even where the water is buried. This is the "aha," and it is cheap to compute once and bake in.

**Time as the mechanic.** The Borealis dataset carries a "year last seen on a map" attribute for the creeks. That single field drives the disappearance animation in scene 3. Scroll position maps to year; each creek's opacity drops when its year passes. Simple to implement, and it is the emotional core of the piece.

Everything else (flowing water animation, historical map crossfades, camera flights) is polish on top of these two ideas.

---

## 5. Data sources

All of these are static. Pull once, clean, freeze.

**Core geometry**
- **Historical Hydrography of Toronto** (U of T Map & Data Library): shoreline, rivers including lost rivers, and creeks, digitized from georeferenced 19th-century maps (Toronto Public Library, City of Toronto Archives, Derek Hayes' *Historical Atlas of Toronto*). This is the main creek geometry.
- **"Disappearing Rivers of Toronto" dataset** (Borealis / Scholars Portal Dataverse, DOI 10.5683/SP2/2AHETH): historical maps plus GIS for the digitized rivers, including the "year last seen" attribute. Developed with Geohistory/Géohistoire Canada. This drives the timeline.

**Present-day context (City of Toronto Open Data, Open Government Licence – Toronto)**
- Toronto Centreline (current streets)
- Neighbourhoods, Parks, ravine / natural feature layers
- Address Points and 3D Massing (optional, for orientation or the "signs" scene)

**Elevation for the hillshade**
- High-resolution provincial lidar DTM for Southern Ontario (Ontario GeoHub / Scholars GeoPortal, reachable through U of T MDL). Precompute one hillshade raster and tile it.

**Historical basemaps for the raster crossfades**
- Goad's fire insurance atlases, the 1858 Boulton atlas, 1842 Cane, 1872 Wadsworth & Unwin, 1890s City Engineer plans. Sources: U of T MDL "Historical Maps of Toronto," TPL Digital Archive, City of Toronto Archives, and oldtorontomaps.com. Many pre-1900 maps are public domain, but confirm per item.

**Narrative source material (for writing, not redistribution)**
- lostrivers.ca field guides and the blogTO / Spacing / Toronto Star articles for the buried-bridge, pond, and above-ground-sign stories. Write your own copy; use these to find and verify the beats.

**Licensing note, read before publishing:** library *access* is not the same as a licence to *republish*. City Open Data is fine to redistribute with attribution. Pre-1900 maps are generally public domain. The MDL-created datasets and any 20th-century maps need their licence checked individually before they go on a public site. This is worth getting right up front for a public portfolio piece.

---

## 6. Tech stack and architecture

Chosen for beauty, longevity, and the no-maintenance rule.

- **Map engine: MapLibre GL JS**, not Mapbox. MapLibre is open source with no access token, so there is nothing to expire or bill, which matters for a piece meant to sit untouched in a portfolio for years. (Mapbox GL is the fallback if a specific feature forces it.)
- **Basemap: Protomaps as a single PMTiles file.** PMTiles is one static file served over normal HTTP range requests from any static host, with no tile server. This is the key to a self-contained, no-backend site. The custom basemap style lives in the repo.
- **GPU layers: deck.gl**, interoperating with MapLibre, for the animated water (TripsLayer or an animated line) and for rendering the creek network smoothly.
- **Scroll: Scrollama** (built on IntersectionObserver) to trigger scene changes on scroll.
- **Data prep pipeline:** R (`sf`, `terra`) for cleaning geometry, joining the "year last seen" attribute, and generating the hillshade from the DTM; GDAL for reprojection and raster handling; `tippecanoe` to build vector PMTiles; the `pmtiles` CLI for packaging. R is the natural home for most of this given your workflow.
- **Build tooling: Vite with vanilla JS or TypeScript.** No heavy framework. Fewer dependencies means less bit-rot over time, which serves the longevity goal. (Svelte is a reasonable option if you want component structure.)
- **Hosting: Cloudflare Pages, Netlify, or GitHub Pages.** All static, all free, all fine with PMTiles.

The whole runtime is HTML, CSS, JS, and a handful of static data files. No request leaves the browser for anything but those files.

**One note that connects to your past setup:** initialize this Git repo *outside* any Google Drive-synced folder. The sync conflicts are not worth it.

---

## 7. Design direction

- **Palette.** Dark ground (near-black or deep slate). Modern streets in low-contrast grey so they recede. Water in luminous cyan/teal so it reads as the subject. Hillshade in cool greys, subtle enough to feel like texture rather than a topo map.
- **Motion.** Water flows gently downstream (moving dashes or trails). Historical map rasters crossfade in and out with scroll. Camera flights are slow and eased, never abrupt.
- **Type.** A strong display face for scene titles (a characterful serif or a grotesque), a clean sans for body. Map labels restrained and few.
- **Validate the look first.** Before building the scroll machinery, produce one static "money shot": Garrison Creek glowing over a dark downtown with the hillshade valleys showing. If that image is beautiful, the project works. If it isn't, fix the visual system before writing more code.

---

## 8. Scope

**v1 (ship this):**
- Downtown / central cluster, anchored on Garrison Creek and Taddle Creek. Best historical map coverage, most legible ravines, richest stories.
- The full network-level disappearance animation for that area.
- One fully produced flagship walk (Garrison), headwaters to lake, with story beats.
- Five or six "signs above ground" points with present-day photos.
- Land acknowledgement, sources, and an about/credits panel.

**Later (v1.x and beyond):**
- Add Mud Creek (Moore Park ravine, Evergreen Brick Works), Castle Frank Brook, Russell Creek, Ashbridge's Creek.
- Expand east and west across the city.
- A "find the creek under your address" lookup.
- Optional audio narration.

Freezing v1 tightly is the single most important scoping decision. Ship the core, then extend.

---

## 9. Build phases

**Phase 0 — Setup and data acquisition.** Repo (outside Drive), Vite skeleton, static host wired up. Pull the MDL hydrography, the Borealis dataset, the DTM, and the historical map rasters. Sort out licensing per source.

**Phase 1 — Data pipeline.** Clean and simplify geometry in R, attach "year last seen," reproject, generate the hillshade, georeference and tile the historical rasters, export everything to PMTiles.

**Phase 2 — Basemap and visual system.** MapLibre custom style, palette, hillshade integration, typography. Produce the static money shot and lock the aesthetic.

**Phase 3 — Core map interactions.** Creek layers, the flowing-water effect, hover and click behaviour, the above-ground sign points.

**Phase 4 — Scrollytelling.** Wire up Scrollama, choreograph the camera per scene, build the temporal disappearance animation and the counter.

**Phase 5 — Narrative content.** Write the copy for every scene. Gather and licence the present-day photos. Verify the buried-bridge, pond, and street-sign stories.

**Phase 6 — Polish and performance.** Mobile layout, load time, transition smoothing, a `prefers-reduced-motion` fallback, basic accessibility.

**Phase 7 — Deploy and write it up.** Ship it. Then write the case study (see section 11) and record a short screen-capture GIF for the portfolio.

---

## 10. Risks and how to handle them

- **These paths are estimates, not survey truth.** The reconstructions are best interpretations of old maps and landscape clues. Handle it with integrity: say so in the piece, show where confidence is lower, and cite sources. Employers read that as data-provenance literacy, not as a weakness.
- **Licensing.** Covered in section 5. Check each source before publishing publicly.
- **Indigenous history.** The waterways predate the colonial city and are tied to Tkaronto. Include a real land acknowledgement, and, where sources support it, the Indigenous relationship to these creeks and their names. Do it substantively rather than as boilerplate, and draw on existing framing (lostrivers.ca, MDL) rather than inventing anything.
- **Performance.** Detailed geometry plus rasters can get heavy. PMTiles, geometry simplification at the right zooms, and a lean initial payload keep it fast. Reduced-motion users get a static fallback.
- **Scope creep.** The temptation is to map the whole city. Resist it for v1. Downtown core plus one flagship, shipped, beats a sprawling unfinished thing.
- **Longevity.** No vendor tokens (hence MapLibre), minimal dependencies, all data as static files, nothing called at runtime. That is what makes "build once, never touch again" actually true.

---

## 11. What this proves to an employer

The piece quietly demonstrates a full stack of skills in one artifact:

- Data acquisition and wrangling (R, `sf`, `terra`)
- GIS and cartographic design
- DEM and hillshade processing
- Vector tiling and modern web-map delivery (`tippecanoe`, PMTiles)
- Front-end development (MapLibre GL, deck.gl, Scrollama, Vite)
- Data storytelling and UX
- Design taste
- Judgment about data provenance and ethics

**Write the case study.** A short "how I built this" page does as much work as the map itself: the question that started it, the hunt for the data, the cleaning decisions and why, the design system, the tech choices and the reasoning, the performance work, and what you would do next. Put a 20–30 second screen-capture GIF at the very top of the portfolio entry so the motion sells itself before anyone clicks.

---

## 12. Open decisions for Leo

1. Working title. ("Ghost Rivers of Toronto" is the current placeholder.)
2. MapLibre (recommended) or Mapbox.
3. v1 scope: confirm downtown core + Garrison flagship.
4. How much of the writing and photo curation you want to do yourself versus draft with Claude.
5. Vanilla + Vite (recommended) or Svelte.
6. Static host: Cloudflare Pages, Netlify, or GitHub Pages.

---

## 13. How to start the new project

Set up a fresh Claude Project and add this brief as project knowledge. Then kick off with something like:

> I'm building the interactive described in the project brief (Ghost Rivers of Toronto). Start me in Phase 0: give me the exact steps to (a) set up the repo and a Vite + MapLibre skeleton outside my Google Drive folder, and (b) locate and download the four data sources, with the specific U of T Map & Data Library and Borealis links, and a checklist of what to verify about each one's licence before I use it publicly.

Work one phase at a time. The first real milestone that tells you the project will succeed is the Phase 2 money shot: one still image of a glowing creek over a dark, hillshaded downtown. Get that beautiful, and the rest is execution.
