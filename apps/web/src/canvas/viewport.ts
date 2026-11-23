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

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Free spot nearest the centre of the view for a part of size w × h, keeping a
 * clear gap to every existing part (room for its label and conductors).
 */
export function nextPlacement(w = 60, h = 60, taken: Rect[] = []): { x: number; y: number } {
  nudge++;
  const gap = 40;
  const x0 = Math.round((center.x - w / 2) / 10) * 10;
  const y0 = Math.round((center.y - h / 2) / 10) * 10;
  const free = (x: number, y: number) =>
    taken.every((b) => x + w + gap <= b.x || x >= b.x + b.w + gap || y + h + gap <= b.y || y >= b.y + b.h + gap);
  if (free(x0, y0)) return { x: x0, y: y0 };
  // Search outwards in square rings, 20 px apart.
  for (let ring = 1; ring < 60; ring++) {
    const r = ring * 20;
    const candidates: Array<{ x: number; y: number }> = [];
    for (let k = -ring; k <= ring; k++) {
      candidates.push({ x: x0 + k * 20, y: y0 - r }, { x: x0 + k * 20, y: y0 + r });
      candidates.push({ x: x0 - r, y: y0 + k * 20 }, { x: x0 + r, y: y0 + k * 20 });
    }
    candidates.sort((a, b) => Math.hypot(a.x - x0, a.y - y0) - Math.hypot(b.x - x0, b.y - y0));
    for (const c of candidates) if (free(c.x, c.y)) return c;
  }
  return { x: x0 + (nudge % 6) * 30, y: y0 + (nudge % 6) * 30 };
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
