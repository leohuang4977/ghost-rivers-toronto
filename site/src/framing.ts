// Dynamic framing: the study rectangle is axis-aligned in Web Mercator, so for a given
// bearing we can compute the LARGEST viewport-shaped window that fits entirely inside the
// data — terrain edge-to-edge, no black corners on any screen size — and anchor it low so
// Lake Ontario lines the bottom of the frame. Used for the load camera, the reset-view
// control, and the intro glide's landing.
import { CONFIG } from "./config";

const R = 6378137;
const D2R = Math.PI / 180;
export const mercX = (lon: number): number => lon * D2R * R;
export const mercY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2)) * R;
const invLon = (x: number): number => x / R / D2R;
const invLat = (y: number): number => (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) / D2R;

export interface Framing {
  center: [number, number];
  zoom: number;
  bearing: number;
}

export function computeFraming(vw: number, vh: number): Framing {
  const f = CONFIG.framing;
  const [lw, ls, le, ln] = f.studyBbox;
  const x0 = mercX(lw);
  const x1 = mercX(le);
  const y0 = mercY(ls);
  const y1 = mercY(ln);
  const th = Math.abs(f.bearing) * D2R;
  const cos = Math.cos(th);
  const sin = Math.sin(th);

  // Largest scale (mercator metres per px) whose ROTATED viewport still fits the rectangle.
  const scale = Math.min(
    (x1 - x0 - 2 * f.insetM) / (vw * cos + vh * sin),
    (y1 - y0 - 2 * f.insetM) / (vw * sin + vh * cos),
  );
  // Rotated-viewport half extents at that scale = how far the centre must stay from the edges.
  const hx = (scale * (vw * cos + vh * sin)) / 2 + f.insetM;
  const hy = (scale * (vw * sin + vh * cos)) / 2 + f.insetM;

  // Centre: x prefers the configured anchor (the Garrison corridor), clamped into the frame;
  // y sits at the lowest allowed position (+ liftM) so the lake lines the bottom of the frame.
  const cx = Math.min(Math.max(mercX(f.anchorLon), x0 + hx), x1 - hx);
  const cy = Math.min(y0 + hy + f.liftM, y1 - hy);

  // MapLibre: world = 512 · 2^z px spanning 2πR mercator metres.
  const zoom = Math.log2((2 * Math.PI * R) / (512 * scale));
  return { center: [invLon(cx), invLat(cy)], zoom, bearing: f.bearing };
}

export function currentFraming(container: HTMLElement): Framing {
  return computeFraming(container.clientWidth || 1280, container.clientHeight || 800);
}

// Clamp an arbitrary camera (e.g. the intro's headwaters start) so its rotated viewport
// stays fully inside the study rectangle — if the requested zoom is too far out to fit,
// it is raised to the fill-the-frame zoom.
export function clampToFrame(
  center: [number, number],
  zoom: number,
  vw: number,
  vh: number,
): { center: [number, number]; zoom: number } {
  const f = CONFIG.framing;
  const fill = computeFraming(vw, vh);
  const z = Math.max(zoom, fill.zoom);
  const [lw, ls, le, ln] = f.studyBbox;
  const x0 = mercX(lw);
  const x1 = mercX(le);
  const y0 = mercY(ls);
  const y1 = mercY(ln);
  const th = Math.abs(f.bearing) * D2R;
  const scale = (2 * Math.PI * R) / (512 * Math.pow(2, z));
  const hx = (scale * (vw * Math.cos(th) + vh * Math.sin(th))) / 2 + f.insetM;
  const hy = (scale * (vw * Math.sin(th) + vh * Math.cos(th))) / 2 + f.insetM;
  const cx = Math.min(Math.max(mercX(center[0]), x0 + hx), x1 - hx);
  const cy = Math.min(Math.max(mercY(center[1]), y0 + hy), y1 - hy);
  return { center: [invLon(cx), invLat(cy)], zoom: z };
}
