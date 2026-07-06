import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { CONFIG } from "./config";
import { buildStyle } from "./style";

// Register the PMTiles protocol so the raster hillshade + vector creeks load as
// self-contained static files (no tile server, no vendor token).
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

// Phase 2 — the money shot: a glowing buried creek over a dark, hillshaded
// downtown. One composed still; no scroll, timeline, or interaction beyond
// default pan/zoom. All the look lives in config.ts + style.ts.
const map = new maplibregl.Map({
  container: "map",
  style: buildStyle(),
  center: CONFIG.camera.center,
  zoom: CONFIG.camera.zoom,
  bearing: CONFIG.camera.bearing,
  pitch: CONFIG.camera.pitch,
  attributionControl: false,
  dragRotate: false,
  pitchWithRotate: false,
  // v5 moved WebGL context attrs here; needed so the frame can be exported (S shortcut)
  canvasContextAttributes: { preserveDrawingBuffer: true },
});

map.addControl(
  new maplibregl.AttributionControl({
    compact: true,
    customAttribution:
      "Historical Hydrography & Disappearing Rivers of Toronto (M. Fortin / U of T Map & Data Library) · Ontario lidar DTM",
  }),
  "bottom-right",
);

map.on("error", (e) => console.error("[ghost-rivers] map error:", e.error));
map.on("idle", () => console.info("[ghost-rivers] money-shot rendered"));

// Dev-only: press "S" to save the current frame as a PNG reference. Reading the
// canvas inside a render pass keeps the WebGL buffer valid at capture time.
if (import.meta.env.DEV) {
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "s" || e.ctrlKey || e.metaKey) return;
    map.once("render", () => {
      map.getCanvas().toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "money-shot.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }, "image/png");
    });
    map.triggerRepaint();
  });
}
