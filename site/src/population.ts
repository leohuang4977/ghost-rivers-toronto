// Population readout (Part 1): a small warm figure by the year readout that climbs with the
// timeline year — "watch people pour in as the water leaves." Figures come from a data file
// (site/public/data/population.json), interpolated linearly between census points and held at
// the ends. An ⓘ reveals the honesty caveat (much early growth was the city ANNEXING its
// neighbours, not only newcomers) plus sources. Quiet by design; the map stays the star.
import { CONFIG } from "./config";
import type { TimelineController } from "./timeline";

interface PopPoint {
  year: number;
  pop: number;
}
interface PopData {
  entity: string;
  note: string;
  sources: { title: string; url: string }[];
  series: PopPoint[];
}

function fmt(p: number): string {
  let r: number;
  if (p >= 100000) r = Math.round(p / 1000) * 1000;
  else if (p >= 10000) r = Math.round(p / 100) * 100;
  else r = Math.round(p / 10) * 10;
  return "≈ " + r.toLocaleString("en-US");
}

// A tiny growth-curve sparkline (the population poured in) with a playhead dot.
function buildPopSpark(series: PopPoint[], color: string): { svg: SVGSVGElement; head: SVGCircleElement } {
  const W = 100;
  const H = 100;
  const minY = series[0].year;
  const maxY = series[series.length - 1].year;
  const spanY = Math.max(1, maxY - minY);
  const maxP = Math.max(...series.map((s) => s.pop));
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "gr-pop-spark");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.setProperty("--popspark", color);
  const pts = series.map((s) => `${((s.year - minY) / spanY) * W},${H - (s.pop / maxP) * H}`);
  const path = document.createElementNS(svgNS, "polyline");
  path.setAttribute("class", "gr-pop-spark-line");
  path.setAttribute("points", pts.join(" "));
  svg.appendChild(path);
  const head = document.createElementNS(svgNS, "circle");
  head.setAttribute("class", "gr-pop-spark-head");
  head.setAttribute("r", "7");
  head.setAttribute("cx", "0");
  head.setAttribute("cy", String(H));
  svg.appendChild(head);
  return { svg, head };
}

export async function createPopulation(timeline: TimelineController, mount: HTMLElement): Promise<void> {
  const cfg = CONFIG.population;
  if (!cfg.show) return;
  let data: PopData;
  try {
    data = await fetch(new URL(cfg.dataUrl, document.baseURI).href).then((r) => r.json());
  } catch {
    return;
  }
  const series = [...data.series].sort((a, b) => a.year - b.year);
  if (!series.length) return;

  const first = series[0];
  const last = series[series.length - 1];
  const at = (y: number): number => {
    if (y <= first.year) return first.pop;
    if (y >= last.year) return last.pop;
    for (let i = 1; i < series.length; i++) {
      if (y <= series[i].year) {
        const a = series[i - 1];
        const b = series[i];
        return a.pop + ((y - a.year) / (b.year - a.year)) * (b.pop - a.pop);
      }
    }
    return last.pop;
  };

  // ── DOM ──────────────────────────────────────────────────────────────────────
  mount.style.setProperty("--pop", cfg.color);
  const wrap = document.createElement("div");
  wrap.className = "gr-pop";

  let head: SVGCircleElement | null = null;
  if (cfg.sparkline) {
    const s = buildPopSpark(series, cfg.sparkColor);
    head = s.head;
    wrap.appendChild(s.svg);
  }

  // unit-dot grid — one dot per `unit` people, lighting up as the population climbs (the
  // partial last dot fades in fractionally, so the fill motion is continuous)
  const maxPop = Math.max(...series.map((s) => s.pop));
  let dots: HTMLElement[] = [];
  if (cfg.dots.show) {
    const grid = document.createElement("div");
    grid.className = "gr-pop-dots";
    grid.style.setProperty("--pop-cols", String(cfg.dots.cols));
    const n = Math.ceil(maxPop / cfg.dots.unit);
    for (let i = 0; i < n; i++) {
      const d = document.createElement("span");
      d.className = "gr-pop-dot";
      grid.appendChild(d);
      dots.push(d);
    }
    grid.title = `Each dot ≈ ${cfg.dots.unit.toLocaleString("en-US")} people`;
    wrap.appendChild(grid);
  }

  const num = document.createElement("div");
  num.className = "gr-pop-num";
  const label = document.createElement("div");
  label.className = "gr-pop-label";
  const labelText = document.createTextNode("");
  const info = document.createElement("button");
  info.className = "gr-pop-info";
  info.type = "button";
  info.textContent = "ⓘ";
  info.setAttribute("aria-label", "About this figure");
  label.append(labelText, info);
  const numWrap = document.createElement("div");
  numWrap.className = "gr-pop-numwrap";
  numWrap.append(num, label);
  wrap.appendChild(numWrap);
  mount.appendChild(wrap);

  // ── honesty popover ──────────────────────────────────────────────────────────
  const card = document.createElement("div");
  card.className = "gr-pop-card";
  card.style.display = "none";
  const srcHTML = data.sources
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.title}</a>`)
    .join(" · ");
  const dotNote = cfg.dots.show
    ? `<span class="gr-pop-dotnote">Each dot ≈ ${cfg.dots.unit.toLocaleString("en-US")} people.</span>`
    : "";
  card.innerHTML = `<b>${data.entity}</b><span>${data.note}</span>${dotNote}<div class="gr-pop-src">${srcHTML}</div>`;
  document.body.appendChild(card);
  info.addEventListener("click", (e) => {
    e.stopPropagation();
    if (card.style.display !== "none") {
      card.style.display = "none";
      return;
    }
    const r = info.getBoundingClientRect();
    card.style.display = "";
    card.style.left = `${Math.max(12, Math.min(r.left - 20, window.innerWidth - card.offsetWidth - 12))}px`;
    card.style.bottom = `${window.innerHeight - r.top + 10}px`;
  });
  window.addEventListener("click", () => (card.style.display = "none"));

  const spanY = Math.max(1, last.year - first.year);
  const maxP = Math.max(...series.map((s) => s.pop));

  let lastFull = -1;
  timeline.onUpdate((year) => {
    const p = at(year);
    num.textContent = fmt(p);
    labelText.textContent = year < 1834 ? "in the Town of York " : "in Toronto ";
    if (head) {
      const yc = Math.max(first.year, Math.min(last.year, year));
      head.setAttribute("cx", (((yc - first.year) / spanY) * 100).toFixed(1));
      head.setAttribute("cy", (100 - (at(yc) / maxP) * 100).toFixed(1));
    }
    if (dots.length) {
      const filled = p / cfg.dots.unit;
      const full = Math.floor(filled);
      if (full !== lastFull) {
        // reset classes + any stale partial opacity (runs only when a dot fills/empties)
        for (let i = 0; i < dots.length; i++) {
          dots[i].classList.toggle("is-on", i < full);
          dots[i].style.opacity = "";
        }
        lastFull = full;
      }
      // the in-progress dot brightens continuously with the fraction
      if (full < dots.length) dots[full].style.opacity = String(0.15 + 0.85 * (filled - full));
    }
  });
}
