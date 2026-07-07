// Flowing-water motion (Tier 3): march a dashed bright line along the hero creek so the glow
// reads as living, moving water. We can't offset a MapLibre dash directly, so each frame we
// rewrite the dasharray as a single short "tick" advanced along the gap — the tick appears to
// flow downstream. The layer's opacity is driven by the timeline (fades as the creek is
// buried), so the current only flows where Garrison is still alive. Off for reduced motion.
import type { Map as MLMap } from "maplibre-gl";
import { CONFIG } from "./config";
import { FLOW_LAYER_ID } from "./style";

export function createFlow(map: MLMap): void {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (reduced) {
    // no marching current under reduced motion — hide the flow line so it isn't a static dash
    if (map.getLayer(FLOW_LAYER_ID)) map.setLayoutProperty(FLOW_LAYER_ID, "visibility", "none");
    return;
  }

  const [dash, gap] = CONFIG.flow.dash; // on, off (in line-widths)
  const speed = CONFIG.flow.speedDashPerSec; // line-widths advanced per second
  let phase = 0;
  let last = performance.now();

  function frame(now: number) {
    const dt = (now - last) / 1000;
    last = now;
    phase = (phase + speed * dt) % gap;
    // [0-dash, leading gap, the tick, trailing gap] — sum stays dash+gap, so it tiles cleanly
    if (map.getLayer(FLOW_LAYER_ID)) {
      map.setPaintProperty(FLOW_LAYER_ID, "line-dasharray", [0, phase, dash, gap - phase]);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
