import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import maplibregl from "maplibre-gl";
import type { IControl, Map as MLMap } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { CONFIG } from "./config";
import { buildStyle } from "./style";
import { computeFraming, currentFraming } from "./framing";
import { storyWillRun, storyStartCamera, runStory } from "./story";
import { createTimeline } from "./timeline";
import { createLabels } from "./labels";
import { createBeats } from "./beats";
import { createFlow } from "./flow";
import { createUI } from "./ui";

// Self-contained PMTiles protocol (no tile server, no vendor token).
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

// Compute the fill-the-frame landing camera for THIS viewport, and lock the authored creek
// look to that zoom (widths/blurs render as designed at whatever zoom the framing lands on).
const landing = computeFraming(window.innerWidth || 1280, window.innerHeight || 800);
CONFIG.creek.refZoom = landing.zoom;
const willStory = storyWillRun();
const startCam = willStory
  ? storyStartCamera(landing, window.innerWidth || 1280, window.innerHeight || 800)
  : { ...landing, pitch: 0 };

const map = new maplibregl.Map({
  container: "map",
  style: buildStyle(),
  center: startCam.center,
  zoom: startCam.zoom,
  bearing: startCam.bearing,
  pitch: 0,
  maxPitch: 0, // stay flat — a tilt would expose the DTM edge as a "horizon"
  attributionControl: false,
  canvasContextAttributes: { preserveDrawingBuffer: true },
});

// Reset-view control: fly back to the default Garrison framing.
class ResetControl implements IControl {
  private _container?: HTMLElement;
  onAdd(m: MLMap): HTMLElement {
    const c = document.createElement("div");
    c.className = "maplibregl-ctrl maplibregl-ctrl-group";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "gr-reset";
    b.title = "Reset view";
    b.setAttribute("aria-label", "Reset view");
    b.addEventListener("click", () =>
      // recompute for the CURRENT viewport so reset always fills the frame edge-to-edge
      m.flyTo({ ...currentFraming(m.getContainer()), pitch: 0, duration: 1200, essential: true }),
    );
    c.appendChild(b);
    this._container = c;
    return c;
  }
  onRemove(): void {
    this._container?.remove();
  }
}

map.addControl(
  new maplibregl.NavigationControl({ showZoom: true, showCompass: true }),
  "top-right",
);
map.addControl(new ResetControl(), "top-right");
map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: "metric" }), "bottom-left");
// Interim compliance floor while the U of T source credits are reworked: the annexation
// data is CC-BY 4.0 (attribution required) and the creek data permission is conditional on
// citation, so this short line stays in the footer. Full citations live in docs/.
map.addControl(
  new maplibregl.AttributionControl({
    compact: true,
    customAttribution:
      "Creek & annexation data: M. Fortin, U of T Map & Data Library (CC-BY) · Ontario lidar DTM · City of Toronto Open Data",
  }),
  "bottom-right",
);

// Drive the CSS vignette overlay from config.
const vig = CONFIG.vignette;
const vigEl = document.getElementById("vignette");
if (vigEl) {
  vigEl.style.setProperty("--vig-color", vig.color);
  vigEl.style.setProperty("--vig-strength", String(vig.strength));
  vigEl.style.setProperty("--vig-inner", String(vig.innerStop));
}

map.on("error", (e) => console.error("[ghost-rivers] map error:", e.error));

// Dev-only debug handles (namespaced so they don't collide with the id="map" element global).
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__gr = { map };

map.on("load", async () => {
  const timeline = await createTimeline(map);
  if (willStory) timeline.pause(); // story drives the year manually until it hands to explore
  const labels = await createLabels(map, timeline);
  const beats = createBeats(map, timeline);
  createFlow(map); // flowing-water current on the hero creek
  createUI(map, timeline, labels, beats);
  if (willStory) {
    // STORY MODE first visit: the narrated script plays once, then hands to explore mode.
    // runStory manages chrome (.gr-storying), beats, interactivity, and the timeline itself.
    runStory(map, timeline, beats, currentFraming(map.getContainer()), () => {});
  }
  // EXPLORE MODE (repeat visits): the timeline autoplays the loop by default, beats + chrome on.
  if (import.meta.env.DEV)
    Object.assign((window as unknown as Record<string, unknown>).__gr as object, { timeline, beats });
  console.info("[ghost-rivers] interactive piece ready");
});

// Dev-only: press "S" to save the current frame as a PNG reference (real browser).
if (import.meta.env.DEV) {
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "s" || e.ctrlKey || e.metaKey) return;
    if (e.target instanceof HTMLInputElement) return;
    map.once("render", () => {
      map.getCanvas().toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "ghost-rivers.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }, "image/png");
    });
    map.triggerRepaint();
  });
}
