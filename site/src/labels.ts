// HTML overlay labels (Lake Ontario, landmarks, key streets) as MapLibre Markers —
// fully CSS-styleable to match the mood, no glyph assets. Plus the creek hover tooltip and
// click-to-focus (Tier 3): clicking a creek jumps the timeline to the year it was last mapped
// (firing its burial flare) and pins an info card.
import maplibregl from "maplibre-gl";
import type { Map as MLMap } from "maplibre-gl";
import { CONFIG } from "./config";
import type { TimelineController } from "./timeline";

export type LabelsController = { setVisible(on: boolean): void };

interface LabelProps {
  name: string;
  kind: string;
  minzoom?: number;
}
interface LabelFeature {
  geometry: { type: string; coordinates: [number, number] };
  properties: LabelProps;
}

export async function createLabels(map: MLMap, timeline: TimelineController): Promise<LabelsController> {
  let data: { features: LabelFeature[] };
  try {
    data = await fetch(new URL("data/labels.geojson", document.baseURI).href).then((r) => r.json());
  } catch {
    data = { features: [] };
  }

  const markers: { marker: maplibregl.Marker; minzoom: number }[] = [];
  let userVisible = true;

  for (const f of data.features) {
    if (f.geometry.type !== "Point") continue;
    const p = f.properties;
    const el = document.createElement("div");
    el.className = `map-label label-${p.kind}`;
    el.textContent = p.name;
    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat(f.geometry.coordinates as [number, number])
      .addTo(map);
    markers.push({ marker, minzoom: p.minzoom ?? 0 });
  }

  function updateVis() {
    const z = map.getZoom();
    for (const { marker, minzoom } of markers) {
      marker.getElement().style.display = userVisible && z >= minzoom ? "" : "none";
    }
  }
  map.on("zoom", updateVis);
  updateVis();

  // ── creek hover tooltip ──────────────────────────────────────────────────────
  const tip = document.createElement("div");
  tip.className = "creek-tooltip";
  tip.style.display = "none";
  document.body.appendChild(tip);

  const tipHTML = (p: Record<string, unknown>) => {
    const name = p.hero === 1 ? "Garrison Creek" : "Buried creek";
    const when =
      p.has_year === 1 && p.year_last_seen != null
        ? `last mapped ${p.year_last_seen}`
        : "date unknown";
    return `<b>${name}</b><span>${when}</span>`;
  };

  map.on("mousemove", "creek-hit", (e) => {
    const f = e.features?.[0];
    if (!f) return;
    map.getCanvas().style.cursor = "pointer";
    tip.innerHTML = tipHTML(f.properties);
    tip.style.left = `${e.point.x}px`;
    tip.style.top = `${e.point.y}px`;
    tip.style.display = "";
  });
  map.on("mouseleave", "creek-hit", () => {
    map.getCanvas().style.cursor = "";
    tip.style.display = "none";
  });

  // ── click-to-focus ───────────────────────────────────────────────────────────
  // A pinned card that jumps the timeline to the year the creek was last mapped.
  const focus = document.createElement("div");
  focus.className = "creek-focus";
  focus.style.display = "none";
  document.body.appendChild(focus);
  const hideFocus = () => (focus.style.display = "none");

  const focusHTML = (p: Record<string, unknown>): string => {
    const name = p.hero === 1 ? "Garrison Creek" : "A buried creek";
    if (p.has_year !== 1 || p.year_last_seen == null) {
      return `<b>${name}</b><span>Date unknown — kept on the map, neutral.</span>`;
    }
    const y = Number(p.year_last_seen);
    const end = CONFIG.timeline.endYear;
    const fate = y >= end ? "Still traceable today." : `Buried about ${end - y} years ago.`;
    return `<b>${name}</b><span>Last drawn on a map in <b>${y}</b>. ${fate}</span>`;
  };

  // one handler: focus a creek if clicked, otherwise dismiss the pinned card
  map.on("click", (e) => {
    const f = map.queryRenderedFeatures(e.point, { layers: ["creek-hit"] })[0];
    if (!f) {
      hideFocus();
      return;
    }
    const p = f.properties;
    focus.innerHTML = focusHTML(p);
    focus.style.left = `${e.point.x}px`;
    focus.style.top = `${e.point.y}px`;
    focus.style.display = "";
    if (p.has_year === 1 && p.year_last_seen != null) {
      timeline.setYear(Number(p.year_last_seen), true); // pause on the year it vanished
    }
  });

  return {
    setVisible(on: boolean) {
      userVisible = on;
      updateVis();
    },
  };
}
