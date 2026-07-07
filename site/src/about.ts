// About & sources panel — a quiet "About" link under the title that opens a dark card listing
// what this is, every data source, and the honesty disclaimers (annexation boundaries are the
// digitized Archives map — approximate; population is the old-City census). Portfolio-facing.
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
    <p>Toronto's downtown creeks — Garrison, Taddle and their neighbours — were buried into
       sewers as the city grew over them. Play the timeline: the glowing creeks wink out at the
       year each was last drawn on a map, the street grid fills in, the population climbs, and
       the city's official limits sweep outward as it annexes its neighbours.</p>
    <h3>Data sources</h3>
    <ul>
      <li><b>Creeks &amp; the "last mapped" years</b> — Historical Hydrography &amp; Disappearing
        Rivers of Toronto, Marcel Fortin / U&nbsp;of&nbsp;T Map &amp; Data Library (Borealis).</li>
      <li><b>Terrain (hillshade &amp; lake)</b> — Ontario GeoHub lidar DTM; Lake Ontario derived
        from the lidar and smoothed to a vector shoreline.</li>
      <li><b>Streets, parks, ravines</b> — City of Toronto Open Data (Centreline, Green Spaces,
        Ravine bylaw).</li>
      <li><b>Population</b> — census of the <em>old</em> City of Toronto (pre-1998 boundaries),
        via Statistics Canada / the Old Toronto census table.</li>
      <li><b>City limits</b> — City of Toronto Historical Annexation Boundaries 1834–1967,
        Marcel Fortin / U&nbsp;of&nbsp;T Map &amp; Data Library (Borealis, DOI 10.5683/SP3/XN2NRW,
        CC&nbsp;BY&nbsp;4.0), digitized from the City of Toronto Archives annexation map.</li>
    </ul>
    <h3>Notes on accuracy</h3>
    <ul>
      <li>The <b>annexation boundaries are approximate</b> — they are the digitized Archives
        annexation map, clipped to this frame, not a legal cadastral survey.</li>
      <li>The <b>population figure is the old City of Toronto</b> in its historical boundaries;
        much of the pre-1920 growth was annexation, and the wider region — not the old City —
        passed one million around 1951 (see the ⓘ by the number).</li>
    </ul>
    <p class="gr-about-lic">Data used by written permission for non-commercial use with
       attribution. Basemap: MapLibre GL + self-hosted PMTiles — no vendor tokens.</p>`;

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
