// Builds the MapLibre style for the money shot from CONFIG.
// Layer stack (bottom → top): dark background → hillshade raster → creek glow
// (halo → mid → core). No basemap/streets yet — the hero is terrain + water.
import type {
  StyleSpecification,
  LayerSpecification,
  ExpressionSpecification,
} from "maplibre-gl";
import { CONFIG } from "./config";

// PMTiles files live in /public/data and are addressed relative to the document,
// so the same build works at a domain root, subdomain, or subpath.
const pmtiles = (rel: string) =>
  `pmtiles://${new URL(rel, document.baseURI).href}`;

// Scale a pixel value with zoom around the reference zoom, so the glow keeps its
// proportions from z11 out to z16 instead of staying a fixed pixel width.
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

function glowLayer(id: string, s: GlowSpec): LayerSpecification {
  const k = CONFIG.creek.intensity;
  return {
    id,
    type: "line",
    source: "creeks",
    "source-layer": "creeks",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": s.color,
      "line-width": byZoom(s.width * k),
      "line-blur": byZoom(s.blur * k),
      "line-opacity": Math.min(1, s.opacity * k),
    },
  };
}

export function buildStyle(): StyleSpecification {
  const g = CONFIG.creek.glow;
  const h = CONFIG.hillshade;
  return {
    version: 8,
    name: "ghost-rivers-money-shot",
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
          "raster-brightness-max": h.brightnessMax,
          "raster-contrast": h.contrast,
          "raster-saturation": h.saturation,
          "raster-resampling": "linear",
        },
      },
      glowLayer("creek-halo", g.halo),
      glowLayer("creek-mid", g.mid),
      glowLayer("creek-core", g.core),
    ],
  };
}
