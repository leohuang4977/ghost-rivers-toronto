// ─────────────────────────────────────────────────────────────────────────────
// Ghost Rivers — Phase 2.6 layered scene: tuning knobs
// ─────────────────────────────────────────────────────────────────────────────
// The scene, bottom → top: dark ground → lake → (quiet) hillshade → parks → ravines
// → street grid → the other creeks → Garrison (the glowing hero). Everything except
// Garrison is deliberately quiet. Change a value, save, dev server hot-reloads.
//
// Terrain SHAPE/smoothness + hero selection are PIPELINE knobs (pipeline/config.yaml):
// `dtm.target_res_m` (8 m), `hillshade.z_factor` (1.8), `creeks.hero_seed_lonlat`,
// and the street-class whitelist. Re-run `pixi run tiles` after changing those.

export type LonLat = [number, number];

export const CONFIG = {
  // ── Framing (keep the tight Garrison corridor) ───────────────────────────────
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

  // ── Terrain: the QUIETEST thing in the frame — dark, soft, low-contrast ──────
  hillshade: {
    opacity: 0.3,
    brightnessMin: 0.0,
    brightnessMax: 0.66, // cap highlights so it never becomes a pale sheet (but valleys still read)
    contrast: 0.12, // low contrast = soft background texture, not a topo readout
    saturation: -0.2,
  },

  // ── City context (all quiet, under the creek glow) ───────────────────────────
  city: {
    water: { color: "#06142a", opacity: 0.9 }, // dark navy lake, subtly distinct from ground
    parks: { color: "#1b2a1e", opacity: 0.38 }, // muted green-gray
    ravines: { color: "#153028", opacity: 0.34 }, // slightly teal, a touch distinct
    streets: { color: "#38465a", width: 0.7, opacity: 0.32 }, // faint cool-gray ghost lines
  },

  // ── The glowing creeks, on top. blue-black + cyan-white palette ──────────────
  creek: {
    intensity: 1.0,
    refZoom: 14.4,
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
