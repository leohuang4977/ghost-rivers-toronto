// The time animation: a "current year" Y drives creek visibility. A creek glows while
// Y <= its year_last_seen and fades out over `fadeWindowYears` once Y passes it. Undated
// creeks are static (handled by their own layers). Autoplay loops 1802 → 2017.
import type { Map as MLMap, ExpressionSpecification } from "maplibre-gl";
import { CONFIG } from "./config";
import { DATED_CREEK_LAYERS, FLARE_LAYERS } from "./style";

type Meta = { years: (number | null)[]; min_year: number; max_year: number; undated: number };

export type TimelineController = {
  play(): void;
  pause(): void;
  toggle(): void;
  setYear(y: number, pauseNow?: boolean): void;
  getYear(): number;
  isPlaying(): boolean;
  minYear: number;
  maxYear: number;
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
  let updateCb: ((y: number, c: number, p: boolean) => void) | null = null;

  function countAt(y: number): number {
    let n = undatedCount;
    for (const yy of datedYears) if (yy >= y) n++;
    return n;
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

  function apply(y: number) {
    // creek fades
    for (const { id, base } of DATED_CREEK_LAYERS) {
      if (map.getLayer(id)) map.setPaintProperty(id, "line-opacity", fadeExpr(y, base));
    }
    // burial flares
    for (const { id, max } of FLARE_LAYERS) {
      if (map.getLayer(id)) map.setPaintProperty(id, "line-opacity", flareExpr(y, max));
    }
    // the city grows in as the creeks die
    const g = CONFIG.cityGrowth;
    const cf = cityFactor(y);
    const streetOp = CONFIG.city.streets.opacity * (g.streetsMinFactor + (1 - g.streetsMinFactor) * cf);
    const parkOp = CONFIG.city.parks.opacity * (g.parksMinFactor + (1 - g.parksMinFactor) * cf);
    if (map.getLayer("streets")) map.setPaintProperty("streets", "line-opacity", streetOp);
    if (map.getLayer("parks")) map.setPaintProperty("parks", "fill-opacity", parkOp);

    updateCb?.(y, countAt(y), playing);
  }

  let last = performance.now();
  function frame(now: number) {
    const dt = now - last;
    last = now;
    if (playing) {
      if (holdUntil != null) {
        if (now >= holdUntil) {
          year = minYear;
          holdUntil = null;
        }
      } else {
        year += (maxYear - minYear) * (dt / t.autoplayDurationMs);
        if (year >= maxYear) {
          year = maxYear;
          holdUntil = now + END_HOLD_MS;
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
    getYear: () => year,
    isPlaying: () => playing,
    play() {
      playing = true;
      holdUntil = null;
      last = performance.now();
    },
    pause() {
      playing = false;
    },
    toggle() {
      playing = !playing;
      holdUntil = null;
      last = performance.now();
      updateCb?.(year, countAt(year), playing);
    },
    setYear(y, pauseNow = true) {
      if (pauseNow) playing = false;
      holdUntil = null;
      year = Math.max(minYear, Math.min(maxYear, y));
    },
    onUpdate(cb) {
      updateCb = cb;
      apply(year);
    },
  };
}
