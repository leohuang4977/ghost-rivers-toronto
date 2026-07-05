import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { Protocol } from "pmtiles";

// Register the PMTiles protocol up front. Nothing uses it yet (Phase 0 renders a
// blank dark basemap with zero network requests), but wiring it now means the
// Phase 2 swap to the self-contained Protomaps basemap is a one-line style edit:
//   sources: { basemap: { type: "vector", url: "pmtiles://./data/basemap.pmtiles" } }
// ...with no code plumbing to add later.
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

// A blank *dark* style: a single background layer. No glyphs, sprites, tiles, or
// tokens — it cannot rate-limit, expire, or bill, which is the whole point of the
// no-runtime-dependency rule. Real layers (creeks, hillshade, historical rasters)
// arrive in Phases 1–3.
const style: StyleSpecification = {
  version: 8,
  name: "ghost-rivers-blank-dark",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0b0f14" },
    },
  ],
};

const map = new maplibregl.Map({
  container: "map",
  style,
  center: [-79.4103, 43.6465], // Garrison Creek corridor / Trinity Bellwoods
  zoom: 12.5,
  attributionControl: false,
  // Keep the interaction feel restrained; the scroll drives the camera later.
  dragRotate: false,
  pitchWithRotate: false,
});

map.addControl(
  new maplibregl.AttributionControl({
    compact: true,
    customAttribution:
      "Ghost Rivers of Toronto — data sources credited in the About panel",
  }),
  "bottom-right",
);
map.addControl(
  new maplibregl.NavigationControl({ showZoom: true, showCompass: false }),
  "top-right",
);

map.on("load", () => {
  console.info("[ghost-rivers] blank dark basemap loaded");
});
