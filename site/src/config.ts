// ─────────────────────────────────────────────────────────────────────────────
// Ghost Rivers — Phase 3 interactive piece: tuning knobs
// ─────────────────────────────────────────────────────────────────────────────
// The static Phase 2.6 scene, now with a time animation + UI. Scene, bottom → top:
// dark ground → lake → hillshade → parks → ravines → streets → creeks (Garrison hero).
// A "current year" drives creek visibility; creeks wink out as the city buries them.
//
// Terrain SHAPE + hero selection stay PIPELINE knobs (pipeline/config.yaml).

export type LonLat = [number, number];

export const CONFIG = {
  // ── Framing (default + "reset view" target) ─────────────────────────────────
  camera: {
    center: [-79.412, 43.644] as LonLat,
    zoom: 14.4,
    bearing: -20,
    pitch: 0,
  },

  darkBaseColor: "#04070f",
  vignette: { color: "#02040a", strength: 0.8, innerStop: 40 },

  // ── Terrain (quiet background; lifted a touch so the city reads on load) ──────
  hillshade: {
    opacity: 0.34,
    brightnessMin: 0.0,
    brightnessMax: 0.72,
    contrast: 0.12,
    saturation: -0.2,
  },

  // ── City context. Streets + parks raised so the grid clearly reads on load. ──
  city: {
    water: { color: "#06142a", opacity: 0.92 },
    parks: { color: "#20301f", opacity: 0.5 },
    ravines: { color: "#183530", opacity: 0.42 },
    streets: { color: "#4a5c74", width: 0.85, opacity: 0.5 },
  },

  // ── Creeks. blue-black + cyan-white; Garrison is the hero. ───────────────────
  creek: {
    intensity: 1.0,
    refZoom: 14.4,
    hero: {
      halo: { color: "#1f8fce", width: 30, blur: 26, opacity: 0.5 },
      mid: { color: "#79dcff", width: 6.5, blur: 3.5, opacity: 0.9 },
      core: { color: "#f4feff", width: 2.1, blur: 0.4, opacity: 1.0 },
    },
    rest: {
      halo: { color: "#16597e", width: 15, blur: 13, opacity: 0.26 },
      mid: { color: "#3ba6d4", width: 3.0, blur: 2.0, opacity: 0.5 },
      core: { color: "#bfe6f4", width: 1.0, blur: 0.3, opacity: 0.7 },
    },
    // Undated creeks (has_year=0): always visible, neutral + muted = "date unknown".
    undated: {
      glow: { color: "#5f7482", width: 6, blur: 4, opacity: 0.22 },
      core: { color: "#c3d0d8", width: 1.1, blur: 0.3, opacity: 0.5 },
    },
  },

  // ── Time animation ───────────────────────────────────────────────────────────
  timeline: {
    autoplayDurationMs: 34000, // one full 1802 → 2017 cycle
    fadeWindowYears: 2.5, // a creek fades out over this many years after its last-mapped year
    endYear: 2017, // present day (loop end); creeks dated 2017 survive to here
    autoplay: true, // on by default (also respects prefers-reduced-motion)
  },
};
