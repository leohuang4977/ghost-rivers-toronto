import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import maplibregl from "maplibre-gl";
import type { IControl, Map as MLMap } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { CONFIG } from "./config";
import { buildStyle } from "./style";
import { createTimeline } from "./timeline";
import { createLabels } from "./labels";
import { createUI } from "./ui";

// Self-contained PMTiles protocol (no tile server, no vendor token).
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

// Phase 3 — the interactive piece: the Phase 2.6 scene + a time animation + UI.
const map = new maplibregl.Map({
  container: "map",
  style: buildStyle(),
  center: CONFIG.camera.center,
  zoom: CONFIG.camera.zoom,
  bearing: CONFIG.camera.bearing,
  pitch: CONFIG.camera.pitch,
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
      m.flyTo({ ...CONFIG.camera, duration: 1200, essential: true }),
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
map.addControl(
  new maplibregl.AttributionControl({
    compact: true,
    customAttribution:
      "Historical Hydrography & Disappearing Rivers of Toronto (M. Fortin / U of T Map & Data Library) · Ontario lidar DTM · City of Toronto Open Data",
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

map.on("load", async () => {
  const [timeline, labels] = await Promise.all([createTimeline(map), createLabels(map)]);
  createUI(map, timeline, labels);
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
