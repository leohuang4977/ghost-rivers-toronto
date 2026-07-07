// Intro sequence (first load per browser session): the map opens fullscreen at the
// headwaters end with the whole creek network glowing at the earliest year, glides slowly
// south along the network while two caption cards fade in and out, and lands on the
// lake-anchored default framing, where the timeline autoplay begins. Skippable — any
// click / keypress / scroll or the Skip button jumps straight to the landing frame.
// prefers-reduced-motion skips the glide entirely. Caption copy lives in CONFIG.intro.
import type { Map as MLMap } from "maplibre-gl";
import { CONFIG } from "./config";
import { clampToFrame, type Framing } from "./framing";

const SEEN_KEY = "gr-intro-done";

export function introWillRun(): boolean {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    /* storage blocked — treat as unseen */
  }
  return CONFIG.intro.enabled && !reduced && !seen;
}

// Camera the map should be CONSTRUCTED at when the intro will run (avoids a flash of the
// landing frame before the glide starts). Clamped so no viewport shape sees past the data.
export function introStartCamera(landing: Framing, vw: number, vh: number) {
  const c = clampToFrame(CONFIG.intro.startCenter, landing.zoom + CONFIG.intro.startZoomDelta, vw, vh);
  return { ...c, bearing: landing.bearing, pitch: 0 };
}

export function runIntro(map: MLMap, landing: Framing, onDone: () => void): void {
  const cfg = CONFIG.intro;
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* fine — intro just replays next load */
  }
  document.body.classList.add("gr-introing");

  const cap = document.createElement("div");
  cap.className = "gr-intro-cap";
  cap.style.setProperty("--cap-fade", `${cfg.captionFadeMs}ms`);
  document.body.appendChild(cap);

  const skip = document.createElement("button");
  skip.className = "gr-intro-skip";
  skip.type = "button";
  skip.textContent = "Skip intro";
  document.body.appendChild(skip);

  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const showCap = (i: number) => {
    cap.textContent = cfg.captions[i] ?? "";
    cap.classList.add("is-on");
  };
  const hideCap = () => cap.classList.remove("is-on");

  let done = false;
  const finish = (jump: boolean) => {
    if (done) return;
    done = true;
    for (const t of timers) clearTimeout(t);
    window.removeEventListener("pointerdown", onAnyInput, true);
    window.removeEventListener("keydown", onAnyInput, true);
    window.removeEventListener("wheel", onAnyInput, true);
    map.stop();
    if (jump) map.jumpTo({ ...landing, pitch: 0 });
    cap.remove();
    skip.remove();
    document.body.classList.remove("gr-introing");
    onDone();
  };
  const onAnyInput = () => finish(true);
  window.addEventListener("pointerdown", onAnyInput, true);
  window.addEventListener("keydown", onAnyInput, true);
  window.addEventListener("wheel", onAnyInput, { capture: true, passive: true });

  // ── the glide ─────────────────────────────────────────────────────────────
  const fade = cfg.captionFadeMs;
  const el = map.getContainer();
  const mid = clampToFrame(
    cfg.midCenter,
    landing.zoom + cfg.startZoomDelta * 0.45,
    el.clientWidth,
    el.clientHeight,
  );
  showCap(0);
  map.easeTo({
    center: mid.center,
    zoom: mid.zoom,
    bearing: landing.bearing,
    duration: cfg.seg1Ms,
    essential: true,
  });
  at(cfg.seg1Ms - fade, hideCap);
  at(cfg.seg1Ms, () => {
    map.easeTo({ ...landing, pitch: 0, duration: cfg.seg2Ms, essential: true });
    at(600, () => showCap(1));
  });
  at(cfg.seg1Ms + cfg.seg2Ms - fade - 300, hideCap);
  at(cfg.seg1Ms + cfg.seg2Ms, () => finish(false));
}
