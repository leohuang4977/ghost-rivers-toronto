// Builds the MapLibre style from CONFIG. Scene, bottom → top:
// background → lake → hillshade → parks → ravines → streets → REST creeks → HERO creek.
// Everything below the creeks is quiet context; Garrison sits on top as the hero.
import type {
  StyleSpecification,
  LayerSpecification,
  ExpressionSpecification,
  FilterSpecification,
} from "maplibre-gl";
import { CONFIG } from "./config";

const pmtiles = (rel: string) =>
  `pmtiles://${new URL(rel, document.baseURI).href}`;

// Scale a pixel value with zoom around the reference zoom.
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

function glowLayer(
  id: string,
  s: GlowSpec,
  filter: FilterSpecification,
): LayerSpecification {
  const k = CONFIG.creek.intensity;
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
      "line-opacity": Math.min(1, s.opacity * k),
    },
  };
}

function fillLayer(
  id: string,
  sourceLayer: string,
  color: string,
  opacity: number,
): LayerSpecification {
  return {
    id,
    type: "fill",
    source: "city",
    "source-layer": sourceLayer,
    paint: { "fill-color": color, "fill-opacity": opacity, "fill-antialias": true },
  };
}

const HERO: FilterSpecification = ["==", ["get", "hero"], 1];
const REST: FilterSpecification = ["!=", ["get", "hero"], 1];

export function buildStyle(): StyleSpecification {
  const c = CONFIG.creek;
  const h = CONFIG.hillshade;
  const city = CONFIG.city;
  return {
    version: 8,
    name: "ghost-rivers-scene",
    sources: {
      hillshade: {
        type: "raster",
        url: pmtiles("data/hillshade.pmtiles"),
        tileSize: 256,
      },
      creeks: { type: "vector", url: pmtiles("data/creeks.pmtiles") },
      city: { type: "vector", url: pmtiles("data/city.pmtiles") },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": CONFIG.darkBaseColor },
      },
      // lake sits under the terrain so its edge matches the hillshade exactly
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
      // quiet land context
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
      // the buried creeks — supporting network, then Garrison on top
      glowLayer("rest-halo", c.rest.halo, REST),
      glowLayer("rest-mid", c.rest.mid, REST),
      glowLayer("rest-core", c.rest.core, REST),
      glowLayer("hero-halo", c.hero.halo, HERO),
      glowLayer("hero-mid", c.hero.mid, HERO),
      glowLayer("hero-core", c.hero.core, HERO),
    ],
  };
}
