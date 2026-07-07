// About and sources panel. A quiet "About" link under the title opens a dark card listing
// what this is, every data source, and the honesty disclaimers (annexation boundaries are the
// digitized Archives map, approximate. Population is the old-City census). Portfolio-facing.
export function createAbout(): void {
  const btn = document.createElement("button");
  btn.className = "gr-about-btn";
  btn.type = "button";
  btn.textContent = "About & sources";

  const card = document.createElement("div");
  card.className = "gr-about-card";
  card.style.display = "none";
  card.innerHTML = `
    <button class="gr-about-close" aria-label="Close">×</button>
    <h2>About</h2>
    <p>This project started with fishing. I spend a lot of time on Toronto's rivers, and most
       trips tell the same story: concrete channels, water that turns murky after every rain,
       dry beds by late summer, stretches where nothing bites. I started wondering what these
       waters were like before the city grew over them. The old maps had the answer: dozens of
       creeks that once ran to the lake, most now buried under the streets, many still flowing
       through sewer pipes below. This map plays back their disappearance, keyed to the year
       each creek was last drawn on a map.</p>
    <!-- Creek and annexation dataset credits are being reworked (Leo's own treatment to come).
         The interim compliance floor is the attribution line in the map footer. Full
         citations remain in the repo docs (docs/DATA_SOURCES.md, docs/LICENSING.md). -->
    <h3>Data sources</h3>
    <ul>
      <li><b>Terrain (hillshade and lake)</b>. Ontario GeoHub lidar DTM. Lake Ontario is derived
        from the lidar and smoothed to a vector shoreline.</li>
      <li><b>Streets, parks, ravines</b>. City of Toronto Open Data (Centreline, Green Spaces,
        Ravine bylaw).</li>
      <li><b>Population</b>. Census of the <em>old</em> City of Toronto (pre-1998 boundaries),
        via Statistics Canada and the Old Toronto census table.</li>
    </ul>
    <h3>Notes on accuracy</h3>
    <ul>
      <li>The <b>annexation boundaries are approximate</b>. They are the digitized Archives
        annexation map, clipped to this frame, not a legal cadastral survey.</li>
      <li>The <b>population figure is the old City of Toronto</b> in its historical boundaries.
        Much of the pre-1920 growth was annexation, and the wider region (not the old City)
        passed one million around 1951. See the ⓘ by the number.</li>
    </ul>
    <p class="gr-about-lic">Data used by written permission for non-commercial use with
       attribution. Basemap: MapLibre GL with self-hosted PMTiles, no vendor tokens.</p>`;

  const close = () => (card.style.display = "none");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    card.style.display = card.style.display === "none" ? "" : "none";
  });
  (card.querySelector(".gr-about-close") as HTMLElement).addEventListener("click", close);
  card.addEventListener("click", (e) => e.stopPropagation());
  window.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  document.body.append(btn, card);
}
