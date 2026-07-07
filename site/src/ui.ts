// Builds the DOM UI (title, time-scrubber, collapsible layers panel + legend) and
// wires it to the timeline + map. All dark-styled in style.css to match the mood.
import type { Map as MLMap, IControl } from "maplibre-gl";
import type { TimelineController } from "./timeline";
import type { LabelsController } from "./labels";
import type { BeatsController } from "./beats";
import { CREEK_LAYER_IDS, STREET_LABEL_ID } from "./style";

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
  top.append(yearOut, counter);
  const mid = el("div", "gr-tl-mid");
  mid.append(top, slider);
  bar.append(playBtn, mid);
  document.body.appendChild(bar);

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
    setIcon(playing);
  });

  // ── Layers panel + legend (top-right, collapsible, collapsed by default) ─────
  const toggles: { label: string; ids: string[]; cb?: (on: boolean) => void }[] = [
    { label: "Creeks", ids: CREEK_LAYER_IDS },
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
     <div class="lg-row"><span class="sw sw-park"></span>Parks · <span class="sw sw-ravine"></span> Ravines</div>`,
  );
  body.appendChild(legend);
  panel.append(head, body);
  map.addControl(domControl(panel), "top-right");
}
