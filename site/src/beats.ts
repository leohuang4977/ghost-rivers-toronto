// Narrative beats (Tier 2): curated, factual story moments. Each beat surfaces at its `year`
// as a warm map pin + a short caption card (bottom-left). During autoplay the timeline dwells
// briefly when it first reaches a beat year (and the camera gently eases to an off-screen pin);
// scrubbing shows/hides beats purely by year. Cards are dismissable. Quiet by design.
import maplibregl from "maplibre-gl";
import type { Map as MLMap } from "maplibre-gl";
import { CONFIG, type Beat } from "./config";
import type { TimelineController } from "./timeline";

export type BeatsController = { setVisible(on: boolean): void };

export function createBeats(map: MLMap, timeline: TimelineController): BeatsController {
  const cfg = CONFIG.beats;
  const beats = cfg.items;

  // ── one warm pin per beat (hidden until its beat is active) ──────────────────
  const pins = new Map<string, maplibregl.Marker>();
  for (const b of beats) {
    const el = document.createElement("div");
    el.className = "gr-beat-pin";
    el.style.setProperty("--pin-color", cfg.pin.color);
    el.style.setProperty("--pin-size", `${cfg.pin.size}px`);
    el.innerHTML = `<span class="gr-beat-ring"></span><span class="gr-beat-dot"></span>`;
    el.title = b.title;
    el.addEventListener("click", () => map.easeTo({ center: b.lonLat, duration: 600, essential: true }));
    const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(b.lonLat).addTo(map);
    el.style.display = "none";
    pins.set(b.id, marker);
  }

  // ── one shared caption card (bottom-left) ────────────────────────────────────
  const card = document.createElement("div");
  card.className = "gr-beat-card";
  card.style.setProperty("--beat-fade", `${cfg.fadeMs}ms`);
  card.innerHTML =
    `<button class="gr-beat-close" aria-label="Dismiss">×</button>` +
    `<div class="gr-beat-year"></div>` +
    `<h2 class="gr-beat-title"></h2>` +
    `<p class="gr-beat-text"></p>` +
    `<div class="gr-beat-src"></div>`;
  document.body.appendChild(card);
  const yearEl = card.querySelector(".gr-beat-year") as HTMLElement;
  const titleEl = card.querySelector(".gr-beat-title") as HTMLElement;
  const textEl = card.querySelector(".gr-beat-text") as HTMLElement;
  const srcEl = card.querySelector(".gr-beat-src") as HTMLElement;

  const dismissed = new Set<string>();
  const fired = new Set<string>(); // beats we've already dwelled on this cycle
  let userVisible = true;
  let shownId: string | null = null;
  let prevY = timeline.getYear();

  (card.querySelector(".gr-beat-close") as HTMLElement).addEventListener("click", () => {
    if (shownId) dismissed.add(shownId);
    hideCard();
    timeline.releaseHold(); // if we were dwelling on this beat, resume immediately
  });

  function hideCard() {
    card.classList.remove("is-open");
    shownId = null;
  }

  function showCard(b: Beat) {
    if (shownId === b.id) return; // already showing this beat — don't restart the fade
    yearEl.textContent = b.label ?? String(b.year);
    titleEl.textContent = b.title;
    textEl.textContent = b.text;
    srcEl.textContent = b.source ?? "";
    srcEl.style.display = b.source ? "" : "none";
    card.classList.add("is-open");
    shownId = b.id;
  }

  // the active beat = the most recent (greatest year) whose window contains y and isn't dismissed
  function activeBeat(y: number): Beat | null {
    let best: Beat | null = null;
    for (const b of beats) {
      if (dismissed.has(b.id)) continue;
      if (y >= b.year && y <= b.year + cfg.showWindowYears && (!best || b.year > best.year)) best = b;
    }
    return best;
  }

  // is a lon/lat comfortably inside the viewport (not hard against an edge)?
  function inComfortView(lonLat: [number, number]): boolean {
    const c = map.getContainer();
    const p = map.project(lonLat);
    const mx = c.clientWidth * cfg.flyEdgeFrac;
    const my = c.clientHeight * cfg.flyEdgeFrac;
    return p.x >= mx && p.x <= c.clientWidth - mx && p.y >= my && p.y <= c.clientHeight - my;
  }

  function render(y: number) {
    if (!userVisible) return;
    const b = activeBeat(y);
    for (const [id, m] of pins) m.getElement().style.display = b && id === b.id ? "" : "none";
    if (b) showCard(b);
    else hideCard();
  }

  timeline.onUpdate((y) => {
    // loop reset (or a big backward scrub): fresh telling — clear fired + dismissed
    if (y < prevY - 5) {
      fired.clear();
      dismissed.clear();
    }
    // auto-dwell + optional gentle pan the first time autoplay reaches a beat year this cycle
    // (only when the beats are on — don't stall/pan the scene when Story notes are toggled off)
    if (userVisible && timeline.isPlaying() && cfg.autoPauseMs > 0) {
      for (const b of beats) {
        if (!fired.has(b.id) && prevY < b.year && y >= b.year) {
          fired.add(b.id);
          timeline.holdFor(cfg.autoPauseMs);
          if (cfg.flyToOnBeat && !inComfortView(b.lonLat)) {
            map.easeTo({ center: b.lonLat, duration: cfg.flyMs, essential: true });
          }
        }
      }
    }
    render(y);
    prevY = y;
  });

  return {
    setVisible(on: boolean) {
      userVisible = on;
      if (!on) {
        for (const [, m] of pins) m.getElement().style.display = "none";
        hideCard();
      } else {
        render(timeline.getYear());
      }
    },
  };
}
