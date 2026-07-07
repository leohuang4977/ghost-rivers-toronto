// Builds the DOM UI (title, time-scrubber, collapsible layers panel + legend) and
// wires it to the timeline + map. All dark-styled in style.css to match the mood.
import type { Map as MLMap, IControl } from "maplibre-gl";
import type { TimelineController } from "./timeline";
import type { LabelsController } from "./labels";
import type { BeatsController } from "./beats";
import { CONFIG } from "./config";
import { createPopulation } from "./population";
import { createAbout } from "./about";
import { CREEK_LAYER_IDS, STREET_LABEL_ID, ANNEX_LAYER_IDS } from "./style";

// Build a static burial-rate sparkline (bars) spanning minYear→maxYear, aligned over the
// scrubber. Returns the SVG element and its moving playhead line (updated each frame).
function buildSparkline(
  years: number[],
  minYear: number,
  maxYear: number,
): { svg: SVGSVGElement; playhead: SVGLineElement } {
  const W = 1000;
  const H = 100;
  const bin = Math.max(1, CONFIG.sparkline.binYears);
  const span = Math.max(1, maxYear - minYear);
  const nbins = Math.ceil(span / bin);
  const counts = new Array(nbins).fill(0);
  for (const y of years) {
    if (y < minYear || y > maxYear) continue;
    counts[Math.min(nbins - 1, Math.floor((y - minYear) / bin))]++;
  }
  const maxCount = Math.max(1, ...counts);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "gr-spark");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.setProperty("--spark", CONFIG.sparkline.color);
  svg.style.setProperty("--spark-head", CONFIG.sparkline.playheadColor);
  let bars = "";
  for (let i = 0; i < nbins; i++) {
    if (!counts[i]) continue;
    const x = (i * bin / span) * W;
    const w = Math.max(1.5, (bin / span) * W - 1);
    const h = (counts[i] / maxCount) * H;
    bars += `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="1"></rect>`;
  }
  const g = document.createElementNS(svgNS, "g");
  g.setAttribute("class", "gr-spark-bars");
  g.innerHTML = bars;
  svg.appendChild(g);
  const playhead = document.createElementNS(svgNS, "line");
  playhead.setAttribute("class", "gr-spark-playhead");
  playhead.setAttribute("y1", "0");
  playhead.setAttribute("y2", String(H));
  playhead.setAttribute("x1", "0");
  playhead.setAttribute("x2", "0");
  svg.appendChild(playhead);
  return { svg, playhead };
}

function el(tag: string, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function domControl(element: HTMLElement): IControl {
  return { onAdd: () => element, onRemove: () => element.remove() };
}

export function createUI(
  map: MLMap,
  timeline: TimelineController,
  labels: LabelsController,
  beats: BeatsController,
): void {
  // ── Title (top-left) ─────────────────────────────────────────────────────────
  document.body.appendChild(
    el(
      "div",
      "gr-title",
      `<h1>Ghost Rivers of Toronto</h1><p>The buried creeks beneath the modern city — watch them vanish as it grows.</p>`,
    ),
  );
  createAbout(); // "About & sources" link + card (data sources + accuracy disclaimers)

  // ── Time scrubber (bottom center) ────────────────────────────────────────────
  const bar = el("div", "gr-timeline");
  const playBtn = el("button", "gr-play") as HTMLButtonElement;
  playBtn.setAttribute("aria-label", "Play / pause");
  const yearOut = el("div", "gr-year", "—");
  const counter = el("div", "gr-counter");
  const slider = el("input", "gr-slider") as HTMLInputElement;
  slider.type = "range";
  slider.min = String(timeline.minYear);
  slider.max = String(timeline.maxYear);
  slider.step = "1";
  slider.value = String(timeline.minYear);
  slider.setAttribute("aria-label", "Year");

  const top = el("div", "gr-tl-top");
  const rightCol = el("div", "gr-tl-right");
  const popMount = el("div", "gr-pop-mount"); // population readout mounts here (async)
  rightCol.append(popMount, counter);
  top.append(yearOut, rightCol);
  createPopulation(timeline, popMount); // fire-and-forget; fills in when its data loads

  // burial-rate sparkline (under the year, aligned over the scrubber)
  const { svg: spark, playhead } = buildSparkline(timeline.datedYears, timeline.minYear, timeline.maxYear);
  const sparkWrap = el("div", "gr-spark-wrap");
  sparkWrap.appendChild(spark);

  // era shortcut buttons — jump the timeline without scrubbing
  const eras = el("div", "gr-eras");
  for (const e of CONFIG.eras) {
    const b = el("button", "gr-era", e.label) as HTMLButtonElement;
    b.addEventListener("click", () => timeline.setYear(e.year, false)); // jump, keep play state
    eras.appendChild(b);
  }

  const mid = el("div", "gr-tl-mid");
  mid.append(top, sparkWrap, slider, eras);
  bar.append(playBtn, mid);
  document.body.appendChild(bar);

  const spanYears = Math.max(1, timeline.maxYear - timeline.minYear);
  const updatePlayhead = (year: number) => {
    const x = ((year - timeline.minYear) / spanYears) * 1000;
    playhead.setAttribute("x1", x.toFixed(1));
    playhead.setAttribute("x2", x.toFixed(1));
  };

  let dragging = false;
  const setIcon = (playing: boolean) => {
    playBtn.classList.toggle("is-playing", playing);
  };
  playBtn.addEventListener("click", () => timeline.toggle());
  slider.addEventListener("pointerdown", () => {
    dragging = true;
    timeline.pause();
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
  });
  slider.addEventListener("input", () => timeline.setYear(+slider.value, true));
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      timeline.toggle();
    }
  });
  timeline.onUpdate((year, count, playing) => {
    yearOut.textContent = String(Math.round(year));
    counter.innerHTML = `<b>${count}</b> creeks still on the map`;
    if (!dragging) slider.value = String(Math.round(year));
    updatePlayhead(year);
    setIcon(playing);
  });

  // ── Layers panel + legend (top-right, collapsible, collapsed by default) ─────
  const toggles: { label: string; ids: string[]; cb?: (on: boolean) => void }[] = [
    { label: "Creeks", ids: CREEK_LAYER_IDS },
    { label: "City limits", ids: ANNEX_LAYER_IDS },
    { label: "Street grid", ids: ["streets"] },
    { label: "Street names", ids: [STREET_LABEL_ID] },
    { label: "Parks", ids: ["parks"] },
    { label: "Ravines", ids: ["ravines"] },
    { label: "Water", ids: ["water"] },
    { label: "Terrain", ids: ["hillshade"] },
    { label: "Labels", ids: [], cb: (on) => labels.setVisible(on) },
    { label: "Story notes", ids: [], cb: (on) => beats.setVisible(on) },
  ];

  const panel = el("div", "gr-panel gr-collapsed maplibregl-ctrl");
  const head = el("button", "gr-panel-head", "Layers");
  head.addEventListener("click", () => panel.classList.toggle("gr-collapsed"));
  const body = el("div", "gr-panel-body");
  for (const t of toggles) {
    const row = el("label", "gr-row") as HTMLLabelElement;
    const cb = el("input") as HTMLInputElement;
    cb.type = "checkbox";
    cb.checked = true;
    cb.addEventListener("change", () => {
      for (const id of t.ids)
        if (map.getLayer(id))
          map.setLayoutProperty(id, "visibility", cb.checked ? "visible" : "none");
      t.cb?.(cb.checked);
    });
    row.append(cb, document.createTextNode(" " + t.label));
    body.appendChild(row);
  }
  const legend = el(
    "div",
    "gr-legend",
    `<div class="lg-h">Legend</div>
     <div class="lg-row"><span class="sw sw-hero"></span>Garrison Creek (hero)</div>
     <div class="lg-row"><span class="sw sw-rest"></span>Other buried creeks</div>
     <div class="lg-row"><span class="sw sw-survivor"></span>Still visible today</div>
     <div class="lg-row"><span class="sw sw-undated"></span>Date unknown</div>
     <div class="lg-row"><span class="sw sw-park"></span>Parks · <span class="sw sw-ravine"></span> Ravines</div>
     <div class="lg-row"><span class="sw sw-annex"></span>City limit (as annexed)</div>`,
  );
  body.appendChild(legend);
  panel.append(head, body);
  map.addControl(domControl(panel), "top-right");
}
