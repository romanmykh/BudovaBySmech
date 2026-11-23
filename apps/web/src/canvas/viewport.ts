/**
 * Where the schematic view is currently looking, in drawing coordinates, so
 * that a component tapped in the library lands in sight rather than at a fixed
 * point that may be off screen.
 */
let center = { x: 200, y: 200 };
let nudge = 0;

export function setViewCenter(x: number, y: number): void {
  if (Math.hypot(center.x - x, center.y - y) > 40) nudge = 0;
  center = { x, y };
}

/** Next placement point near the centre; repeated adds fan out instead of stacking. */
export function nextPlacement(): { x: number; y: number } {
  const k = nudge++ % 6;
  return { x: Math.round((center.x - 30 + k * 30) / 10) * 10, y: Math.round((center.y - 30 + k * 30) / 10) * 10 };
}

let focusHandler: ((x: number, y: number) => void) | null = null;

/** The canvas registers how to bring a point into readable view. */
export function onFocusRequest(fn: ((x: number, y: number) => void) | null): void {
  focusHandler = fn;
}

/** Bring a freshly placed part into view at a zoom where it can be worked on. */
export function focusOn(x: number, y: number): void {
  focusHandler?.(x, y);
}
