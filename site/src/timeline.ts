// The time animation: a "current year" Y drives creek visibility. A creek glows while
// Y <= its year_last_seen and fades out over `fadeWindowYears` once Y passes it. Undated
// creeks are static (handled by their own layers). Autoplay loops 1802 → 2017.
import type { Map as MLMap, ExpressionSpecification } from "maplibre-gl";
import { CONFIG } from "./config";
import { DATED_CREEK_LAYERS, FLARE_LAYERS, SURVIVOR_LAYERS, ANNEX_LAYERS, STREET_LABEL_ID } from "./style";

type Meta = {
  years: (number | null)[];
  comps?: number[]; // per-feature connected-network id, aligned with `years`
  min_year: number;
  max_year: number;
  undated: number;
};

export type TimelineController = {
  play(): void;
  pause(): void;
  toggle(): void;
  setYear(y: number, pauseNow?: boolean): void;
  getYear(): number;
  isPlaying(): boolean;
  holdFor(ms: number): void; // dwell in place (keep playing state) for ms — used by narrative beats
  releaseHold(): void; // cut a dwell short and resume advancing immediately
  minYear: number;
  maxYear: number;
  datedYears: number[]; // every creek's year_last_seen (sorted) — for the burial-rate sparkline
  onUpdate(cb: (year: number, count: number, playing: boolean) => void): void;
};

const END_HOLD_MS = 1400; // pause on the final survivors before looping back

export async function createTimeline(map: MLMap): Promise<TimelineController> {
  const t = CONFIG.timeline;

  let meta: Meta;
  try {
    meta = await fetch(new URL("data/creeks_meta.json", document.baseURI).href).then((r) => r.json());
  } catch {
    meta = { years: [], min_year: 1802, max_year: t.endYear, undated: 0 };
  }
  const datedYears = meta.years.filter((y): y is number => y != null).sort((a, b) => a - b);
  const undatedCount = meta.years.filter((y) => y == null).length;
  const minYear = datedYears.length ? datedYears[0] : 1802;
  const maxYear = t.endYear;

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let year = minYear;
  let playing = t.autoplay && !reduced;
  let lastApplied = NaN;
  let holdUntil: number | null = null;
  let holdThenLoop = false; // true only for the end-of-timeline hold (loop back on expiry)
  const updateCbs: ((y: number, c: number, p: boolean) => void)[] = [];

  // "N creeks still on the map" counts distinct connected creek NETWORKS (per-feature
  // component ids from the pipeline), not raw line segments — a network is on the map at Y
  // if any of its segments is still visible (undated segments never disappear). Falls back
  // to the old segment count if an older creeks_meta.json has no `comps`.
  const comps = meta.comps && meta.comps.length === meta.years.length ? meta.comps : null;
  function countAt(y: number): number {
    if (!comps) {
      let n = undatedCount;
      for (const yy of datedYears) if (yy >= y) n++;
      return n;
    }
    const alive = new Set<number>();
    for (let i = 0; i < comps.length; i++) {
      const yy = meta.years[i];
      if (yy == null || yy >= y) alive.add(comps[i]);
    }
    return alive.size;
  }

  function fadeExpr(y: number, base: number): ExpressionSpecification {
    const w = t.fadeWindowYears;
    return [
      "*",
      base,
      [
        "case",
        ["<=", ["-", y, ["get", "year_last_seen"]], 0], 1,
        [">=", ["-", y, ["get", "year_last_seen"]], w], 0,
        ["-", 1, ["/", ["-", y, ["get", "year_last_seen"]], w]],
      ],
    ] as ExpressionSpecification;
  }

  // MOVE 2 — flare opacity: a pulse peaking at burial (d=0), decaying over `years`.
  function flareExpr(y: number, max: number): ExpressionSpecification {
    const w = CONFIG.flare.years;
    const e = CONFIG.flare.falloffExp;
    return [
      "case",
      ["<", ["-", y, ["get", "year_last_seen"]], 0], 0,
      [">", ["-", y, ["get", "year_last_seen"]], w], 0,
      ["*", max, ["^", ["-", 1, ["/", ["-", y, ["get", "year_last_seen"]], w]], e]],
    ] as ExpressionSpecification;
  }

  // MOVE 1 — city growth factor 0→1 as Y goes startYear→fullByYear (ease-in).
  function cityFactor(y: number): number {
    const g = CONFIG.cityGrowth;
    const tt = (y - g.startYear) / (g.fullByYear - g.startYear);
    return Math.pow(Math.max(0, Math.min(1, tt)), g.easeExp);
  }

  // MOVE 3 — survivor factor 0→1 as Y goes fadeInFromYear→fullByYear (ease-in). Near 0 for
  // most of the animation so the warm survivor glow only reads at the very end.
  function survivorFactor(y: number): number {
    const s = CONFIG.survivor;
    const tt = (y - s.fadeInFromYear) / (s.fullByYear - s.fadeInFromYear);
    return Math.pow(Math.max(0, Math.min(1, tt)), s.easeExp);
  }

  // PART 2 — annexation fade-in: each parcel ramps 0→1 over `fadeYears` once Y passes the
  // year that parcel was annexed, so the city footprint sweeps outward district by district.
  function annexExpr(y: number, base: number): ExpressionSpecification {
    const w = CONFIG.annexation.fadeYears;
    return [
      "*",
      base,
      [
        "case",
        ["<", ["-", y, ["get", "year"]], 0], 0,
        [">", ["-", y, ["get", "year"]], w], 1,
        ["/", ["-", y, ["get", "year"]], w],
      ],
    ] as ExpressionSpecification;
  }

  function apply(y: number) {
    // creek fades
    for (const { id, base } of DATED_CREEK_LAYERS) {
      if (map.getLayer(id)) map.setPaintProperty(id, "line-opacity", fadeExpr(y, base));
    }
    // burial flares
    for (const { id, max } of FLARE_LAYERS) {
      if (map.getLayer(id)) map.setPaintProperty(id, "line-opacity", flareExpr(y, max));
    }
    // survivor glow — warm layers ramp in over the daylighted creeks as the end approaches
    const sf = survivorFactor(y);
    for (const { id, base } of SURVIVOR_LAYERS) {
      if (map.getLayer(id)) map.setPaintProperty(id, "line-opacity", base * sf);
    }
    // annexation footprint — parcels fade in as the year passes each annexation
    if (CONFIG.annexation.show) {
      for (const { id, prop, base } of ANNEX_LAYERS) {
        if (map.getLayer(id)) map.setPaintProperty(id, prop, annexExpr(y, base));
      }
    }
    // the city grows in as the creeks die
    const g = CONFIG.cityGrowth;
    const cf = cityFactor(y);
    const streetOp = CONFIG.city.streets.opacity * (g.streetsMinFactor + (1 - g.streetsMinFactor) * cf);
    const parkOp = CONFIG.city.parks.opacity * (g.parksMinFactor + (1 - g.parksMinFactor) * cf);
    if (map.getLayer("streets")) map.setPaintProperty("streets", "line-opacity", streetOp);
    if (map.getLayer("parks")) map.setPaintProperty("parks", "fill-opacity", parkOp);
    // street NAMES grow in with the grid — no 1802 frame with labels over an empty plain
    if (map.getLayer(STREET_LABEL_ID))
      map.setPaintProperty(STREET_LABEL_ID, "text-opacity", CONFIG.streetLabels.opacity * cf);

    for (const cb of updateCbs) cb(y, countAt(y), playing);
  }

  let last = performance.now();
  function frame(now: number) {
    const dt = now - last;
    last = now;
    if (playing) {
      if (holdUntil != null) {
        // dwelling in place — either the end-of-timeline hold (loop back) or a beat dwell
        if (now >= holdUntil) {
          if (holdThenLoop) year = minYear;
          holdUntil = null;
          holdThenLoop = false;
        }
      } else {
        year += (maxYear - minYear) * (dt / t.autoplayDurationMs);
        if (year >= maxYear) {
          year = maxYear;
          holdUntil = now + END_HOLD_MS;
          holdThenLoop = true;
        }
      }
    }
    if (year !== lastApplied) {
      apply(year);
      lastApplied = year;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    minYear,
    maxYear,
    datedYears,
    getYear: () => year,
    isPlaying: () => playing,
    play() {
      playing = true;
      holdUntil = null;
      holdThenLoop = false;
      last = performance.now();
    },
    pause() {
      playing = false;
    },
    toggle() {
      playing = !playing;
      holdUntil = null;
      holdThenLoop = false;
      last = performance.now();
      for (const cb of updateCbs) cb(year, countAt(year), playing);
    },
    setYear(y, pauseNow = true) {
      if (pauseNow) playing = false;
      holdUntil = null;
      holdThenLoop = false;
      year = Math.max(minYear, Math.min(maxYear, y));
    },
    // Dwell in place for `ms` without changing the play/pause state (a narrative-beat pause).
    // Only takes effect while playing and not already holding, so it never stacks or fights
    // the end-of-timeline hold.
    holdFor(ms: number) {
      if (playing && holdUntil == null) {
        holdUntil = performance.now() + ms;
        holdThenLoop = false;
      }
    },
    releaseHold() {
      if (!holdThenLoop) {
        holdUntil = null;
        last = performance.now();
      }
    },
    onUpdate(cb) {
      updateCbs.push(cb);
      apply(year);
    },
  };
}
