// HTML overlay labels (Lake Ontario, landmarks, key streets) as MapLibre Markers —
// fully CSS-styleable to match the mood, no glyph assets. Plus the creek hover tooltip.
import maplibregl from "maplibre-gl";
import type { Map as MLMap } from "maplibre-gl";

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

export async function createLabels(map: MLMap): Promise<LabelsController> {
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

  return {
    setVisible(on: boolean) {
      userVisible = on;
      updateVis();
    },
  };
}
