// Story mode: the narrated first-visit experience. A chaptered script (site/public/data/
// story.json) plays across the whole timeline once and then ENDS instead of looping. The map
// opens at the headwaters with the full network glowing, glides south (Act I), and each card
// holds while the year advances beneath it. The burial act is held longer so the climax slows
// down. At the end it stops on the closing card with Replay and Explore buttons.
//
// A persistent "Skip to map" jumps to explore mode at any point. Repeat visits in the same
// session skip straight to explore. prefers-reduced-motion drops the glide and the timers and
// turns the story into advance-on-click cards. Script copy lives in the JSON, pacing in CONFIG.
import type { Map as MLMap } from "maplibre-gl";
import { CONFIG } from "./config";
import { clampToFrame, type Framing } from "./framing";
import type { TimelineController } from "./timeline";
import type { BeatsController } from "./beats";

const SEEN_KEY = "gr-story-done";

interface Chapter {
  year: number | null;
  act: string;
  text: string;
}

const prefersReduced = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const assetUrl = (rel: string): string => new URL(rel, document.baseURI).href;

export function storyWillRun(): boolean {
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    /* storage blocked, treat as unseen */
  }
  return CONFIG.story.enabled && !seen;
}

// Camera the map is CONSTRUCTED at when the story will run (avoids a flash of the landing
// frame before the glide). Reduced motion opens directly on the landing frame.
export function storyStartCamera(landing: Framing, vw: number, vh: number) {
  if (prefersReduced()) return { center: landing.center, zoom: landing.zoom, bearing: landing.bearing, pitch: 0 };
  const g = CONFIG.story.glide;
  const c = clampToFrame(g.startCenter, landing.zoom + g.startZoomDelta, vw, vh);
  return { ...c, bearing: landing.bearing, pitch: 0 };
}

function setInteractive(map: MLMap, on: boolean): void {
  const h = ["dragPan", "scrollZoom", "boxZoom", "dragRotate", "keyboard", "doubleClickZoom", "touchZoomRotate"] as const;
  for (const k of h) (on ? map[k].enable() : map[k].disable());
}

export async function runStory(
  map: MLMap,
  timeline: TimelineController,
  beats: BeatsController,
  landing: Framing,
  onExplore: () => void,
): Promise<void> {
  const cfg = CONFIG.story;
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* fine, the story just replays next load */
  }

  // Enter story mode SYNCHRONOUSLY (before the fetch await) so the chrome built by createUI
  // never paints: it is hidden by the .gr-storying class in the same tick it was created.
  document.body.classList.add("gr-storying");
  beats.setVisible(false);
  setInteractive(map, false);
  timeline.setYear(timeline.minYear, true);
  const reduced = prefersReduced();

  // If the script cannot load or is empty, revert cleanly to explore mode.
  const bail = (): void => {
    document.body.classList.remove("gr-storying");
    setInteractive(map, true);
    beats.setVisible(true);
    timeline.play();
    onExplore();
  };

  let chapters: Chapter[];
  try {
    chapters = (await fetch(assetUrl(cfg.scriptUrl)).then((r) => r.json())).chapters;
  } catch {
    bail();
    return;
  }
  const yearCh = chapters.filter((c) => c.act !== "END" && c.year != null);
  const endCh = chapters.find((c) => c.act === "END") ?? null;
  if (!yearCh.length) {
    bail();
    return;
  }

  // two card slots for a clean crossfade (in: rise + fade, out: fade)
  const cards = [makeCard(), makeCard()];
  cards.forEach((c) => document.body.appendChild(c));
  let cur = 0;
  const showCard = (ch: Chapter): void => {
    const inc = cards[1 - cur];
    const yr = inc.querySelector(".gr-story-year") as HTMLElement;
    const tx = inc.querySelector(".gr-story-text") as HTMLElement;
    yr.textContent = ch.year != null ? String(ch.year) : "";
    yr.style.display = ch.year != null ? "" : "none";
    tx.textContent = ch.text;
    inc.classList.add("is-on");
    cards[cur].classList.remove("is-on");
    cur = 1 - cur;
  };
  const clearCards = (): void => cards.forEach((c) => c.classList.remove("is-on"));

  // controls: skip (persistent), plus reduced-motion Next and the end buttons
  const skip = makeButton("gr-story-skip", cfg.labels.skip);
  const next = makeButton("gr-story-next", cfg.labels.next);
  const endBar = document.createElement("div");
  endBar.className = "gr-story-end";
  const replay = makeButton("gr-story-btn", cfg.labels.replay);
  const explore = makeButton("gr-story-btn is-primary", cfg.labels.explore);
  endBar.append(replay, explore);
  document.body.append(skip, next, endBar);
  next.style.display = "none";
  endBar.style.display = "none";

  const dwellFor = (act: string): number =>
    (cfg.actDwellMs as Record<string, number>)[act] ?? 5000;

  let cancelled = false;
  let rafId = 0;
  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const stopTimers = (): void => {
    cancelAnimationFrame(rafId);
    timers.splice(0).forEach(clearTimeout);
  };

  // ── the auto sequence (re-callable for Replay) ───────────────────────────────
  function runAuto(): void {
    stopTimers();
    endBar.style.display = "none";
    skip.style.display = "";
    map.jumpTo(storyStartCamera(landing, map.getContainer().clientWidth, map.getContainer().clientHeight));
    timeline.setYear(timeline.minYear, true);

    const segs = yearCh.map((c, i) => ({
      ch: c,
      fromY: c.year as number,
      toY: (yearCh[i + 1]?.year ?? c.year) as number,
      dwell: dwellFor(c.act),
    }));
    const starts: number[] = [];
    let acc = 0;
    for (const s of segs) {
      starts.push(acc);
      acc += s.dwell;
    }
    const total = acc;

    // Act I camera glide, timed to the Act I cards (headwaters to mid to landing)
    const actI = segs.filter((s) => s.ch.act === "I").reduce((a, s) => a + s.dwell, 0) || total;
    const el = map.getContainer();
    const mid = clampToFrame(cfg.glide.midCenter, landing.zoom + cfg.glide.startZoomDelta * 0.45, el.clientWidth, el.clientHeight);
    map.easeTo({ center: mid.center, zoom: mid.zoom, bearing: landing.bearing, duration: actI * 0.5, essential: true });
    at(actI * 0.5, () => {
      if (!cancelled) map.easeTo({ center: landing.center, zoom: landing.zoom, bearing: landing.bearing, pitch: 0, duration: actI * 0.5, essential: true });
    });

    let shown = -1;
    const t0 = performance.now();
    const frame = (now: number): void => {
      if (cancelled) return;
      const elapsed = now - t0;
      if (elapsed >= total) {
        timeline.setYear(segs[segs.length - 1].toY, true);
        toEnd();
        return;
      }
      let i = 0;
      while (i < segs.length - 1 && elapsed >= starts[i + 1]) i++;
      if (i !== shown) {
        showCard(segs[i].ch);
        shown = i;
      }
      const local = Math.min(1, (elapsed - starts[i]) / segs[i].dwell);
      timeline.setYear(segs[i].fromY + local * (segs[i].toY - segs[i].fromY), true);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
  }

  // ── the reduced-motion sequence: advance on click, no glide, no timers ───────
  let manualIdx = 0;
  function runManual(): void {
    stopTimers();
    endBar.style.display = "none";
    skip.style.display = "";
    next.style.display = "";
    map.jumpTo({ center: landing.center, zoom: landing.zoom, bearing: landing.bearing, pitch: 0 });
    manualIdx = 0;
    showCard(yearCh[0]);
    timeline.setYear(yearCh[0].year as number, true);
  }
  next.onclick = () => {
    manualIdx += 1;
    if (manualIdx < yearCh.length) {
      showCard(yearCh[manualIdx]);
      timeline.setYear(yearCh[manualIdx].year as number, true);
    } else {
      toEnd();
    }
  };

  function toEnd(): void {
    stopTimers();
    if (endCh) showCard(endCh);
    skip.style.display = "none";
    next.style.display = "none";
    endBar.style.display = "";
  }

  function toExplore(): void {
    if (cancelled) return;
    cancelled = true;
    stopTimers();
    map.stop();
    for (const c of cards) c.remove();
    skip.remove();
    next.remove();
    endBar.remove();
    document.body.classList.remove("gr-storying");
    setInteractive(map, true);
    beats.setVisible(true);
    showHint(cfg.hint);
    timeline.play(); // hand to explore mode: the fast autoplay loop
    onExplore();
  }

  skip.onclick = toExplore;
  explore.onclick = toExplore;
  replay.onclick = () => {
    clearCards();
    if (reduced) runManual();
    else runAuto();
  };

  if (reduced) runManual();
  else runAuto();
}

// ── DOM helpers ────────────────────────────────────────────────────────────────
function makeCard(): HTMLElement {
  const el = document.createElement("div");
  el.className = "gr-story-card";
  el.style.setProperty("--story-fade", `${CONFIG.story.cardFadeMs}ms`);
  el.innerHTML = `<div class="gr-story-year"></div><p class="gr-story-text"></p>`;
  return el;
}

function makeButton(cls: string, label: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = cls;
  b.type = "button";
  b.textContent = label;
  return b;
}

// One-time interaction hint shown when the map hands over to explore mode.
function showHint(text: string): void {
  const h = document.createElement("div");
  h.className = "gr-hint";
  h.textContent = text;
  document.body.appendChild(h);
  requestAnimationFrame(() => h.classList.add("is-on"));
  const dismiss = (): void => {
    h.classList.remove("is-on");
    window.setTimeout(() => h.remove(), 500);
    window.removeEventListener("pointerdown", dismiss);
  };
  window.addEventListener("pointerdown", dismiss);
  window.setTimeout(dismiss, 6000);
}
