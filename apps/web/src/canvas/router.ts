/**
 * Automatic conductor routing.
 *
 * A conductor without manual bend points is routed orthogonally around every
 * device body (including the label above it and the rating text below), with as
 * few bends as possible, and keeps off the runs of conductors already routed so
 * that two different conductors are never drawn on top of each other.
 *
 * The search runs on a sparse grid made of the lines through the obstacle edges
 * (plus a few parallel "lanes" beside each edge) rather than on a pixel grid, so
 * a whole drawing routes in a few milliseconds.
 */
import type { Point } from '@budova/engine';
import type { Box, Side, TerminalPos } from './geometry.js';

/** Length of the straight lead out of a terminal before the route may turn. */
export const LEAD = 16;
/** Clearance kept around a device body. */
const PAD_SIDE = 8;
const PAD_TOP = 13; // the label sits above the body
const PAD_BOTTOM = 12; // ratings are printed below it
/** Spacing between parallel conductors sharing a channel. */
const LANE = 7;
const BEND_COST = 30;
const OVERLAP_COST = 6; // per pixel run along another conductor
const CROSS_COST = 4;

export interface Obstacle extends Box {
  id: string;
}

type Dir = 0 | 1 | 2 | 3; // up, right, down, left
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function sideDir(side: Side): Dir {
  return side === 'top' ? 0 : side === 'right' ? 1 : side === 'bottom' ? 2 : 3;
}

function lead(p: TerminalPos, len = LEAD): Point {
  const d = sideDir(p.side);
  return { x: p.x + DX[d] * len, y: p.y + DY[d] * len };
}

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function inflate(b: Box): Rect {
  return { x1: b.x - PAD_SIDE, y1: b.y - PAD_TOP, x2: b.x + b.w + PAD_SIDE, y2: b.y + b.h + PAD_BOTTOM };
}

const inside = (r: Rect, p: Point) => p.x > r.x1 && p.x < r.x2 && p.y > r.y1 && p.y < r.y2;

/** Runs already taken by other conductors, indexed by their constant coordinate. */
export class Occupancy {
  h = new Map<number, Array<[number, number, string]>>();
  v = new Map<number, Array<[number, number, string]>>();

  add(points: Point[], net: string): void {
    this.keysV = null;
    this.keysH = null;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      if (Math.abs(a.y - b.y) < 0.5) {
        const k = Math.round(a.y);
        const list = this.h.get(k) ?? [];
        list.push([Math.min(a.x, b.x), Math.max(a.x, b.x), net]);
        this.h.set(k, list);
      } else if (Math.abs(a.x - b.x) < 0.5) {
        const k = Math.round(a.x);
        const list = this.v.get(k) ?? [];
        list.push([Math.min(a.y, b.y), Math.max(a.y, b.y), net]);
        this.v.set(k, list);
      }
    }
  }

  /** Length of a candidate run that lies along a conductor of another net. */
  overlap(horizontal: boolean, at: number, from: number, to: number, net: string): number {
    const list = (horizontal ? this.h : this.v).get(Math.round(at));
    if (!list) return 0;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    let sum = 0;
    for (const [a, b, n] of list) {
      if (n === net) continue;
      const o = Math.min(hi, b) - Math.max(lo, a);
      if (o > 0) sum += o;
    }
    return sum;
  }

  private keysV: number[] | null = null;
  private keysH: number[] | null = null;

  /** Number of perpendicular conductors of another net crossed by the run. */
  crossings(horizontal: boolean, at: number, from: number, to: number, net: string): number {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const map = horizontal ? this.v : this.h;
    let keys = horizontal ? this.keysV : this.keysH;
    if (!keys) {
      keys = [...map.keys()].sort((x, y) => x - y);
      if (horizontal) this.keysV = keys;
      else this.keysH = keys;
    }
    // first key > lo
    let l = 0;
    let r = keys.length;
    while (l < r) {
      const m = (l + r) >> 1;
      if (keys[m]! <= lo) l = m + 1;
      else r = m;
    }
    let n = 0;
    for (let i = l; i < keys.length && keys[i]! < hi; i++) {
      for (const [a, b, nn] of map.get(keys[i]!)!) if (nn !== net && a < at && b > at) n++;
    }
    return n;
  }
}

function uniqSorted(vals: number[]): number[] {
  const s = [...new Set(vals.map((v) => Math.round(v)))];
  s.sort((a, b) => a - b);
  return s;
}

/** Binary min-heap keyed by f. */
class Heap {
  private a: Array<[number, number]> = [];
  get size() {
    return this.a.length;
  }
  push(f: number, v: number) {
    const a = this.a;
    a.push([f, v]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]![0] <= a[i]![0]) break;
      [a[p], a[i]] = [a[i]!, a[p]!];
      i = p;
    }
  }
  pop(): number {
    const a = this.a;
    const top = a[0]![1];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]![0] < a[m]![0]) m = l;
        if (r < a.length && a[r]![0] < a[m]![0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Route one conductor between two terminals around the obstacles. Returns the
 * polyline from terminal to terminal, or null when no route exists (the caller
 * then falls back to the plain orthogonal route).
 */
export function routeAround(
  from: TerminalPos,
  to: TerminalPos,
  obstacles: Obstacle[],
  occ: Occupancy | null,
  net: string,
): Point[] | null {
  const s = lead(from);
  const t = lead(to);
  const margin = 90;
  const region: Rect = {
    x1: Math.min(s.x, t.x) - margin,
    y1: Math.min(s.y, t.y) - margin,
    x2: Math.max(s.x, t.x) + margin,
    y2: Math.max(s.y, t.y) + margin,
  };

  // Obstacles near the run. A device whose clearance zone contains an end of
  // the run cannot block it (the lead already leaves that device).
  const rects: Rect[] = [];
  for (const o of obstacles) {
    const r = inflate(o);
    if (r.x2 < region.x1 || r.x1 > region.x2 || r.y2 < region.y1 || r.y1 > region.y2) continue;
    if (inside(r, s) || inside(r, t)) continue;
    rects.push(r);
  }
  // Grow the region so a detour around a large device is possible.
  for (const r of rects) {
    region.x1 = Math.min(region.x1, r.x1 - LANE * 3);
    region.y1 = Math.min(region.y1, r.y1 - LANE * 3);
    region.x2 = Math.max(region.x2, r.x2 + LANE * 3);
    region.y2 = Math.max(region.y2, r.y2 + LANE * 3);
  }

  const xv = [s.x, t.x, (s.x + t.x) / 2, region.x1, region.x2];
  const yv = [s.y, t.y, (s.y + t.y) / 2, region.y1, region.y2];
  for (const r of rects) {
    xv.push(r.x1, r.x2, r.x1 - LANE, r.x2 + LANE, r.x1 - 2 * LANE, r.x2 + 2 * LANE);
    yv.push(r.y1, r.y2, r.y1 - LANE, r.y2 + LANE, r.y1 - 2 * LANE, r.y2 + 2 * LANE);
  }
  // Lanes beside the ends, so a conductor can run alongside a neighbour.
  for (const d of [-LANE, LANE, -2 * LANE, 2 * LANE]) {
    xv.push(s.x + d, t.x + d);
    yv.push(s.y + d, t.y + d);
  }
  const xs = uniqSorted(xv);
  const ys = uniqSorted(yv);
  const nx = xs.length;
  const ny = ys.length;
  if (nx * ny > 40000) return null;

  // Blocked grid edges. hBlock[j*nx+i]: edge (i,j)-(i+1,j); vBlock[j*nx+i]: edge (i,j)-(i,j+1).
  const hBlock = new Uint8Array(nx * ny);
  const vBlock = new Uint8Array(nx * ny);
  const lower = (arr: number[], v: number) => {
    let l = 0;
    let r = arr.length;
    while (l < r) {
      const m = (l + r) >> 1;
      if (arr[m]! < v) l = m + 1;
      else r = m;
    }
    return l;
  };
  for (const r of rects) {
    // Grid lines strictly inside the rectangle, and cells between its edges.
    const i0 = lower(xs, r.x1);
    const i1 = lower(xs, r.x2);
    const j0 = lower(ys, r.y1);
    const j1 = lower(ys, r.y2);
    for (let j = j0; j <= j1 && j < ny; j++) {
      const y = ys[j]!;
      for (let i = i0; i <= i1 && i < nx; i++) {
        const x = xs[i]!;
        if (i < nx - 1) {
          const mx = (x + xs[i + 1]!) / 2;
          if (y > r.y1 && y < r.y2 && mx > r.x1 && mx < r.x2) hBlock[j * nx + i] = 1;
        }
        if (j < ny - 1) {
          const my = (y + ys[j + 1]!) / 2;
          if (x > r.x1 && x < r.x2 && my > r.y1 && my < r.y2) vBlock[j * nx + i] = 1;
        }
      }
    }
  }

  const xi = (x: number) => {
    const k = lower(xs, Math.round(x));
    return xs[k] === Math.round(x) ? k : -1;
  };
  const yi = (y: number) => {
    const k = lower(ys, Math.round(y));
    return ys[k] === Math.round(y) ? k : -1;
  };
  const si = xi(s.x);
  const sj = yi(s.y);
  const ti = xi(t.x);
  const tj = yi(t.y);
  if (si < 0 || sj < 0 || ti < 0 || tj < 0) return null;

  const startDir = sideDir(from.side);
  // The lead into the destination terminal runs opposite to its side.
  const endDir = ((sideDir(to.side) + 2) % 4) as Dir;

  const N = nx * ny * 4;
  const g = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const heap = new Heap();
  const idx = (i: number, j: number, d: number) => ((j * nx + i) << 2) | d;
  const h = (i: number, j: number) => Math.abs(xs[i]! - xs[ti]!) + Math.abs(ys[j]! - ys[tj]!);

  const s0 = idx(si, sj, startDir);
  g[s0] = 0;
  heap.push(h(si, sj), s0);
  let best = -1;
  let bestCost = Infinity;

  while (heap.size) {
    const cur = heap.pop();
    const d = cur & 3;
    const cell = cur >> 2;
    const i = cell % nx;
    const j = (cell / nx) | 0;
    const gc = g[cur]!;
    if (gc + h(i, j) >= bestCost) break;
    if (i === ti && j === tj) {
      const turn = d === endDir ? 0 : (d + 2) % 4 === endDir ? BEND_COST * 3 : BEND_COST;
      if (gc + turn < bestCost) {
        bestCost = gc + turn;
        best = cur;
      }
      continue;
    }
    for (let nd = 0; nd < 4; nd++) {
      if ((nd + 2) % 4 === d) continue; // no U-turn on the spot
      let ni = i;
      let nj = j;
      if (nd === 0) {
        if (j === 0 || vBlock[(j - 1) * nx + i]) continue;
        nj = j - 1;
      } else if (nd === 2) {
        if (j === ny - 1 || vBlock[j * nx + i]) continue;
        nj = j + 1;
      } else if (nd === 3) {
        if (i === 0 || hBlock[j * nx + i - 1]) continue;
        ni = i - 1;
      } else {
        if (i === nx - 1 || hBlock[j * nx + i]) continue;
        ni = i + 1;
      }
      const horizontal = nd === 1 || nd === 3;
      const len = horizontal ? Math.abs(xs[ni]! - xs[i]!) : Math.abs(ys[nj]! - ys[j]!);
      let cost = len + (nd === d ? 0 : BEND_COST);
      if (occ) {
        const at = horizontal ? ys[j]! : xs[i]!;
        const a = horizontal ? xs[i]! : ys[j]!;
        const b = horizontal ? xs[ni]! : ys[nj]!;
        cost += occ.overlap(horizontal, at, a, b, net) * OVERLAP_COST;
        cost += occ.crossings(horizontal, at, a, b, net) * CROSS_COST;
      }
      const nxt = idx(ni, nj, nd);
      const ng = gc + cost;
      if (ng < g[nxt]!) {
        g[nxt] = ng;
        prev[nxt] = cur;
        heap.push(ng + h(ni, nj), nxt);
      }
    }
  }
  if (best < 0) return null;

  const cells: Point[] = [];
  for (let c = best; c >= 0; c = prev[c]!) {
    const cell = c >> 2;
    cells.push({ x: xs[cell % nx]!, y: ys[(cell / nx) | 0]! });
  }
  cells.reverse();
  return simplify([{ x: from.x, y: from.y }, ...cells, { x: to.x, y: to.y }]);
}

/** Drop repeated and collinear points. */
export function simplify(pts: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2]!;
      const b = out[out.length - 1]!;
      const col = (Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - p.x) < 0.01) || (Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - p.y) < 0.01);
      if (col) out[out.length - 1] = p;
      else out.push(p);
    } else out.push(p);
  }
  return out;
}
