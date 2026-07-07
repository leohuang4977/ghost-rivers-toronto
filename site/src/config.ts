// ─────────────────────────────────────────────────────────────────────────────
// Ghost Rivers — Phase 3 interactive piece: tuning knobs
// ─────────────────────────────────────────────────────────────────────────────
// The static Phase 2.6 scene, now with a time animation + UI. Scene, bottom → top:
// dark ground → lake → hillshade → parks → ravines → streets → creeks (Garrison hero).
// A "current year" drives creek visibility; creeks wink out as the city buries them.
//
// Terrain SHAPE + hero selection stay PIPELINE knobs (pipeline/config.yaml).

export type LonLat = [number, number];

// A curated narrative beat: a factual story moment that surfaces at its year.
export interface Beat {
  id: string;
  year: number; // the timeline year it surfaces at (must be within the timeline range)
  lonLat: LonLat; // where it happened (map pin)
  title: string;
  text: string; // 1–2 short, verifiable sentences
  label?: string; // displayed date tag, if it differs from `year` (e.g. "1960s" when the
  // exact year is uncertain, or "1793" for an event placed at the timeline's start)
  source?: string; // short attribution shown small under the text
}

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

  // Self-hosted glyphs (Noto Sans, SIL OFL) — no external font CDN at runtime.
  glyphsFont: "Noto Sans Medium",
  streetLabels: {
    color: "#93a1af",
    haloColor: "#04070f",
    haloWidth: 1.5,
    size: 11.5,
    minzoom: 13.2, // zoom-gate so it isn't a cluttered road map when zoomed out
    opacity: 0.85,
  },

  // MOVE 1 — the city grows as creeks die: street (and, subtler, park) opacity ramps
  // with the timeline year from near-zero at startYear to full by fullByYear.
  cityGrowth: {
    startYear: 1830,
    fullByYear: 1955, // full grid by mid-century, riding the burial wave
    easeExp: 1.9, // >1 = ease-in: faint early, accelerates late-1800s → 1900s
    streetsMinFactor: 0.05, // streets start at 5% of their full opacity
    parksMinFactor: 0.4, // parks ramp too, but subtler (start more present)
  },

  // MOVE 2 — burial flares: a bright pulse at the moment a creek is buried, then dark.
  // Two layers over the dated creeks; their opacity is a function of (Y − year_last_seen).
  flare: {
    years: 4, // flare window in Y-years (~0.6 s at the default pace)
    falloffExp: 1.6, // pulse decay shape
    bloom: { color: "#bfefff", width: 17, blur: 9, maxOpacity: 0.5 },
    core: { color: "#ffffff", width: 3.4, blur: 0.6, maxOpacity: 0.95 },
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

  // MOVE 3 (Tier 2) — SURVIVOR GLOW. The ~9 creeks dated `endYear` (still-visible /
  // daylighted) glow like every other creek early on; near the end of the timeline a
  // distinct WARMER/WHITER glow ramps in over them, so the ending reads "these few
  // survived." A separate set of layers, driven by the timeline, filtered on the survivor
  // year. It should only read near the end — ease-in, invisible for most of the animation.
  survivor: {
    fadeInFromYear: 1980, // warm glow starts appearing after this year …
    fullByYear: 2017, // … reaching full strength at the end
    easeExp: 2.6, // >1 = ease-in: stays hidden, blooms only in the final years
    halo: { color: "#ffcf8f", width: 21, blur: 18, opacity: 0.55 }, // warm amber bloom
    mid: { color: "#ffe6c0", width: 5.2, blur: 3.0, opacity: 0.82 }, // warm cream
    core: { color: "#fffdf7", width: 1.9, blur: 0.4, opacity: 1.0 }, // warm-white hot core
  },

  // NARRATIVE BEATS (Tier 2) — 2–3 curated, factual story moments. Each surfaces at its
  // `year` as a map pin + a short caption card; autoplay dwells briefly when it hits a beat
  // year; scrubbing shows/hides by year. Quiet by design — enrich, don't interrupt.
  beats: {
    autoPauseMs: 2600, // autoplay dwells this long when it reaches a beat year (0 = no pause)
    showWindowYears: 16, // card stays up while the current year is within this window past `year`
    fadeMs: 450, // card + pin fade in/out
    pin: { color: "#ffd9a0", size: 13 }, // warm pin, matches the survivor palette
    // When a beat surfaces during autoplay, gently ease the camera to it — but only if the pin
    // is near/outside the viewport edge (so in-frame beats don't jostle the scene needlessly).
    flyToOnBeat: true,
    flyMs: 900,
    flyEdgeFrac: 0.22, // pan only if the pin sits within this fraction of the viewport edge
    // Content is curated + fact-checked (dates/locations verified against Lost Rivers Toronto,
    // U of T Magazine, Heritage Toronto, Wikipedia et al.). Captions stay general where the
    // record is uncertain (e.g. the Crawford bridge burial is only ever dated "the 1960s").
    // `year` = when it surfaces on the timeline; `label` overrides the shown date tag.
    items: [
      {
        id: "fort-york",
        year: 1802, // opens the story at the start of the timeline
        label: "1793",
        lonLat: [-79.4065, 43.6385], // Fort York, at the creek mouth
        title: "Named for the garrison",
        text: "The creek takes its name from Fort York, the British garrison built at its mouth in 1793. Its steep ravine made a natural defensive edge for the fort.",
        source: "Lost Rivers Toronto · Friends of Fort York",
      },
      {
        id: "mccauls-pond",
        year: 1884,
        lonLat: [-79.394, 43.664], // McCaul's Pond site, now under Hart House
        title: "McCaul's Pond, drained",
        text: "In 1859 the University dammed Taddle Creek to form McCaul's Pond. Fouled by sewage, it was drained in 1884 and the creek sealed underground — its site now lies beneath Hart House.",
        source: "University of Toronto Magazine",
      },
      {
        id: "crawford-bridge",
        year: 1966, // burial only ever dated to "the 1960s" — placed at the end of that era
        label: "1960s",
        lonLat: [-79.4165, 43.6468], // Crawford St ravine crossing, Trinity Bellwoods
        title: "A bridge buried whole",
        text: "Crawford Street crossed the Garrison ravine on a concrete bridge. It was never torn down: in the 1960s the ravine was filled with earth from the Bloor subway dig, and the span still lies buried up to its deck under Trinity Bellwoods Park.",
        source: "Heritage Toronto",
      },
    ] as Beat[],
  },

  // MOVE 4 (Tier 3) — FLOWING WATER: a thin bright current animates along the hero creek
  // (Garrison) so the glow reads as living water, not a static line. A dashed "flow" line over
  // the hero, its dashes marched along by an rAF; opacity is faded with the creek by the
  // timeline so it only flows where the creek is still alive. Off under prefers-reduced-motion.
  flow: {
    color: "#eafcff",
    width: 1.4,
    blur: 0.6,
    baseOpacity: 0.7,
    dash: [0.25, 3.2], // [on, off] in line-widths — short bright ticks, long gaps
    speedDashPerSec: 1.4, // dash-lengths advanced per second (the current's pace)
  },

  // Tier 3 — ERA shortcut buttons: jump the timeline to a moment without scrubbing.
  eras: [
    { label: "1850", year: 1850 },
    { label: "1900", year: 1900 },
    { label: "1950", year: 1950 },
    { label: "Today", year: 2017 },
  ],

  // Tier 3 — BURIAL-RATE sparkline under the year readout: how many creeks were last mapped
  // each year (the wave clusters ~1880s–1930s), with a playhead at the current year.
  sparkline: {
    binYears: 4, // group burials into bins this many years wide
    color: "#5f8fb0", // bars
    playheadColor: "#eaf7ff",
  },

  // ── Time animation ───────────────────────────────────────────────────────────
  timeline: {
    autoplayDurationMs: 34000, // one full 1802 → 2017 cycle
    fadeWindowYears: 2.5, // a creek fades out over this many years after its last-mapped year
    endYear: 2017, // present day (loop end); creeks dated 2017 survive to here
    autoplay: true, // on by default (also respects prefers-reduced-motion)
  },
};
