// ─────────────────────────────────────────────────────────────────────────────
// Ghost Rivers — Phase 2.5 cinematic still: tuning knobs
// ─────────────────────────────────────────────────────────────────────────────
// Change a value, save, and the dev server hot-reloads. The design intent:
// a moody nocturnal frame where Garrison Creek is the glowing protagonist over a
// dark, cool, hillshaded downtown — not a data export of the DTM rectangle.
//
//   • camera            — the framing (tight on Garrison; nudge center/zoom/bearing)
//   • darkBaseColor     — the ground (deep cool blue-black)
//   • vignette          — radial edge darkening; kills the "floating rectangle" feel
//   • hillshade         — how much terrain reads + its tone (kept dark, cool, moody)
//   • creek.hero / rest — Garrison (bright, wide, hot core) vs the supporting network
//
// Terrain SHAPE + smoothness are PIPELINE knobs (pipeline/config.yaml): `dtm.target_res_m`
// (6 m area-average — coarser washes out buildings), `hillshade.z_factor` (2.5),
// `hillshade.azimuth`. Re-run `pixi run tiles` after changing those.
// Hero vs rest selection is also a pipeline knob: `creeks.hero_seed_lonlat`.

export type LonLat = [number, number];

export const CONFIG = {
  // ── Framing ──────────────────────────────────────────────────────────────────
  // Tight on the Garrison corridor (Trinity Bellwoods → the lake) so terrain fills
  // the viewport and the hard DTM edges leave the frame. Nudge these to taste.
  camera: {
    center: [-79.412, 43.644] as LonLat,
    zoom: 14.4,
    bearing: -20,
    pitch: 0,
  },

  // ── Ground + edges ───────────────────────────────────────────────────────────
  darkBaseColor: "#04070f", // deep cool blue-black
  vignette: {
    color: "#02040a",
    strength: 0.82, // 0 = off, 1 = strongest
    innerStop: 38, // % radius that stays clear before the darkening ramps in
  },

  // ── Hillshade ────────────────────────────────────────────────────────────────
  // Low opacity over the cool base = cool-tinted, deep shadows; raised contrast =
  // more tonal range so buried valleys read without it becoming a topo map.
  hillshade: {
    opacity: 0.42,
    brightnessMin: 0.0,
    brightnessMax: 0.85, // let ridge highlights breathe a little
    contrast: 0.4, // deepen valley shadows + separate the tones
    saturation: -0.2, // kill residual colour so the tint comes only from the base
  },

  // ── The glowing creeks (light in the valleys), blue-black + cyan-white palette ─
  // Layered lines: soft wide bloom (halo) → mid → thin bright core.
  creek: {
    intensity: 1.0, // master multiplier on all glow widths + opacities
    refZoom: 14.4, // widths below are px at this zoom, then scale with zoom
    // HERO = Garrison: brighter, wider, hot near-white core.
    hero: {
      halo: { color: "#1f8fce", width: 30, blur: 26, opacity: 0.5 },
      mid: { color: "#79dcff", width: 6.5, blur: 3.5, opacity: 0.9 },
      core: { color: "#f4feff", width: 2.1, blur: 0.4, opacity: 1.0 },
    },
    // REST = the other buried creeks: dim, thin, cooler supporting layer.
    rest: {
      halo: { color: "#16597e", width: 15, blur: 13, opacity: 0.26 },
      mid: { color: "#3ba6d4", width: 3.0, blur: 2.0, opacity: 0.5 },
      core: { color: "#bfe6f4", width: 1.0, blur: 0.3, opacity: 0.7 },
    },
  },
};
