// Builds the MapLibre style from CONFIG. Layer stack (bottom → top):
// dark background → hillshade raster → REST creek glow → HERO (Garrison) creek glow.
// Hero draws last so Garrison sits on top of the supporting network.
import type {
  StyleSpecification,
  LayerSpecification,
  ExpressionSpecification,
  FilterSpecification,
} from "maplibre-gl";
import { CONFIG } from "./config";

// PMTiles files live in /public/data and are addressed relative to the document,
// so the same build works at a domain root, subdomain, or subpath.
const pmtiles = (rel: string) =>
  `pmtiles://${new URL(rel, document.baseURI).href}`;

// Scale a pixel value with zoom around the reference zoom, so the glow keeps its
// proportions across zoom instead of staying a fixed pixel width.
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

const HERO: FilterSpecification = ["==", ["get", "hero"], 1];
const REST: FilterSpecification = ["!=", ["get", "hero"], 1];

export function buildStyle(): StyleSpecification {
  const c = CONFIG.creek;
  const h = CONFIG.hillshade;
  return {
    version: 8,
    name: "ghost-rivers-cinematic",
    sources: {
      hillshade: {
        type: "raster",
        url: pmtiles("data/hillshade.pmtiles"),
        tileSize: 256,
      },
      creeks: {
        type: "vector",
        url: pmtiles("data/creeks.pmtiles"),
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": CONFIG.darkBaseColor },
      },
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
      // supporting network first (below) ...
      glowLayer("rest-halo", c.rest.halo, REST),
      glowLayer("rest-mid", c.rest.mid, REST),
      glowLayer("rest-core", c.rest.core, REST),
      // ... then Garrison on top.
      glowLayer("hero-halo", c.hero.halo, HERO),
      glowLayer("hero-mid", c.hero.mid, HERO),
      glowLayer("hero-core", c.hero.core, HERO),
    ],
  };
}
