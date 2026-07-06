// Builds the MapLibre style from CONFIG. Scene, bottom → top:
// background → lake → hillshade → parks → ravines → streets → creeks.
// Creeks split by (hero/rest) × (dated/undated). The DATED layers are driven by the
// timeline (their opacity is re-set each frame from the current year); the UNDATED
// layers are static and neutral ("date unknown"). DATED_CREEK_LAYERS is the list the
// timeline animates, with each layer's full (year = present) base opacity.
import type {
  StyleSpecification,
  LayerSpecification,
  ExpressionSpecification,
  FilterSpecification,
} from "maplibre-gl";
import { CONFIG } from "./config";

const pmtiles = (rel: string) =>
  `pmtiles://${new URL(rel, document.baseURI).href}`;

function byZoom(base: number): ExpressionSpecification {
  const ref = CONFIG.creek.refZoom;
  return [
    "interpolate",
    ["exponential", 1.6],
    ["zoom"],
    10, base * 0.4,
    ref, base,
    16, base * 2.4,
  ];
}

type GlowSpec = { color: string; width: number; blur: number; opacity: number };

const k = CONFIG.creek.intensity;
const baseOpacity = (o: number) => Math.min(1, o * k);

function glowLayer(
  id: string,
  s: GlowSpec,
  filter: FilterSpecification,
): LayerSpecification {
  return {
    id,
    type: "line",
    source: "creeks",
    "source-layer": "creeks",
    filter,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": s.color,
      "line-width": byZoom(s.width * k),
      "line-blur": byZoom(s.blur * k),
      "line-opacity": baseOpacity(s.opacity),
    },
  };
}

function fillLayer(id: string, sourceLayer: string, color: string, opacity: number): LayerSpecification {
  return {
    id,
    type: "fill",
    source: "city",
    "source-layer": sourceLayer,
    paint: { "fill-color": color, "fill-opacity": opacity, "fill-antialias": true },
  };
}

const HERO_DATED: FilterSpecification = ["all", ["==", ["get", "hero"], 1], ["==", ["get", "has_year"], 1]];
const REST_DATED: FilterSpecification = ["all", ["!=", ["get", "hero"], 1], ["==", ["get", "has_year"], 1]];
const UNDATED: FilterSpecification = ["==", ["get", "has_year"], 0];

// The six dated creek glow layers + their full-visibility base opacity, for the timeline.
export const DATED_CREEK_LAYERS: { id: string; base: number }[] = [
  { id: "rest-halo", base: baseOpacity(CONFIG.creek.rest.halo.opacity) },
  { id: "rest-mid", base: baseOpacity(CONFIG.creek.rest.mid.opacity) },
  { id: "rest-core", base: baseOpacity(CONFIG.creek.rest.core.opacity) },
  { id: "hero-halo", base: baseOpacity(CONFIG.creek.hero.halo.opacity) },
  { id: "hero-mid", base: baseOpacity(CONFIG.creek.hero.mid.opacity) },
  { id: "hero-core", base: baseOpacity(CONFIG.creek.hero.core.opacity) },
];

// All creek layer ids (for the layer-toggle panel), incl. the invisible hover target.
export const CREEK_LAYER_IDS = [
  "undated-glow", "undated-core",
  ...DATED_CREEK_LAYERS.map((l) => l.id),
  "creek-hit",
];

export function buildStyle(): StyleSpecification {
  const c = CONFIG.creek;
  const h = CONFIG.hillshade;
  const city = CONFIG.city;
  return {
    version: 8,
    name: "ghost-rivers-interactive",
    sources: {
      hillshade: { type: "raster", url: pmtiles("data/hillshade.pmtiles"), tileSize: 256 },
      creeks: { type: "vector", url: pmtiles("data/creeks.pmtiles") },
      city: { type: "vector", url: pmtiles("data/city.pmtiles") },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": CONFIG.darkBaseColor } },
      fillLayer("water", "water", city.water.color, city.water.opacity),
      {
        id: "hillshade",
        type: "raster",
        source: "hillshade",
        paint: {
          "raster-opacity": h.opacity,
          "raster-brightness-min": h.brightnessMin,
          "raster-brightness-max": h.brightnessMax,
          "raster-contrast": h.contrast,
          "raster-saturation": h.saturation,
          "raster-resampling": "linear",
        },
      },
      fillLayer("parks", "parks", city.parks.color, city.parks.opacity),
      fillLayer("ravines", "ravines", city.ravines.color, city.ravines.opacity),
      {
        id: "streets",
        type: "line",
        source: "city",
        "source-layer": "streets",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": city.streets.color,
          "line-width": byZoom(city.streets.width),
          "line-opacity": city.streets.opacity,
        },
      },
      // undated creeks — neutral, static, always visible
      glowLayer("undated-glow", c.undated.glow, UNDATED),
      glowLayer("undated-core", c.undated.core, UNDATED),
      // dated creeks — timeline-driven (rest below, Garrison hero on top)
      glowLayer("rest-halo", c.rest.halo, REST_DATED),
      glowLayer("rest-mid", c.rest.mid, REST_DATED),
      glowLayer("rest-core", c.rest.core, REST_DATED),
      glowLayer("hero-halo", c.hero.halo, HERO_DATED),
      glowLayer("hero-mid", c.hero.mid, HERO_DATED),
      glowLayer("hero-core", c.hero.core, HERO_DATED),
      // invisible wide line on top — a generous hover target for the creek tooltip
      {
        id: "creek-hit",
        type: "line",
        source: "creeks",
        "source-layer": "creeks",
        paint: { "line-color": "#000000", "line-opacity": 0, "line-width": byZoom(14) },
      },
    ],
  };
}
