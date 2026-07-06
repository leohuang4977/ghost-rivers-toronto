// ─────────────────────────────────────────────────────────────────────────────
// Ghost Rivers — Phase 2 "money shot" tuning knobs
// ─────────────────────────────────────────────────────────────────────────────
// Change a value, save, and the dev server hot-reloads the still. These are the
// dials called out in the brief, plus the camera framing. Values below are the
// ones the Phase-2 money shot was locked at.
//
//   • darkBaseColor      — the ground
//   • hillshade.opacity  — how much terrain texture reads (lower = moodier)
//   • creek.glow.*        — the hero: color / width / blur / opacity of the glow
//   • camera             — the single framing on the Garrison Creek corridor
//
// The hillshade's *shape* (how dramatic + how smooth the terrain is) is a PIPELINE
// knob, not a style one: `hillshade.z_factor` (currently 2.2), `hillshade.azimuth`,
// and `dtm.target_res_m` (4 m area-average — coarser washes out buildings) in
// pipeline/config.yaml. Re-run `pixi run hillshade tiles` after changing those.

export type LonLat = [number, number];

export const CONFIG = {
  // ── The framing ────────────────────────────────────────────────────────────
  // Garrison Creek: headwaters near Dundas/Ossington, south through Trinity
  // Bellwoods (the buried Crawford St bridge) down to its confluence at the lake.
  camera: {
    center: [-79.4135, 43.6455] as LonLat,
    zoom: 13.9,
    bearing: -20, // run the corridor diagonally down the frame
    pitch: 0,
  },

  // ── 1) Dark ground ─────────────────────────────────────────────────────────
  darkBaseColor: "#070a10", // near-black deep slate

  // ── 2) Hillshade composite (its alpha lets the dark base show past the edge) ─
  // Kept low/moody so it reads as texture, not a topo map (brief §7).
  hillshade: {
    opacity: 0.34,
    brightnessMax: 0.72, // cap the highlights so the ground stays dark
    contrast: 0.22, // a little shadow depth so the buried valleys read
    saturation: -0.25, // cool neutral grey
  },

  // ── 3) The glowing creek — layered lines for real glow, not a flat stroke ────
  // halo (wide, soft, dim) → mid (medium) → core (thin, bright, near-white).
  creek: {
    intensity: 1.0, // master multiplier on all glow widths + opacities
    refZoom: 13.9, // widths below are px at this zoom, then scale with zoom
    glow: {
      halo: { color: "#12bce0", width: 26, blur: 20, opacity: 0.55 },
      mid: { color: "#4be9ff", width: 5.5, blur: 3.5, opacity: 0.9 },
      core: { color: "#f4ffff", width: 1.7, blur: 0.3, opacity: 1.0 },
    },
  },
};
