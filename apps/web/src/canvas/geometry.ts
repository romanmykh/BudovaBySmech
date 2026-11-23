import { sizeOf, terminalsOf, type ComponentInstance, type TerminalDef, type Point, type Wire } from '@budova/engine';
import { routeAround, Occupancy, LEAD, type Obstacle } from './router.js';

export const GRID = 10;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Footprint of a component after rotation. */
export function boxOf(c: ComponentInstance): Box {
  const s = sizeOf(c.type, c.props);
  const rot = c.rot ?? 0;
  const swap = rot === 90 || rot === 270;
  return { x: c.x, y: c.y, w: swap ? s.h : s.w, h: swap ? s.w : s.h };
}

/** Terminal position inside the rotated footprint. */
export function localTerminal(t: TerminalDef, w: number, h: number, rot: number, mirror = false): Point {
  let x = t.x;
  let y = t.y;
  if (mirror) x = w - x;
  switch (((rot % 360) + 360) % 360) {
    case 90:
      return { x: h - y, y: x };
    case 180:
      return { x: w - x, y: h - y };
    case 270:
      return { x: y, y: w - x };
    default:
      return { x, y };
  }
}

export type Side = 'top' | 'bottom' | 'left' | 'right';

export function rotateSide(side: Side | undefined, rot: number, mirror = false): Side {
  const order: Side[] = ['top', 'right', 'bottom', 'left'];
  let s: Side = side ?? 'top';
  if (mirror && (s === 'left' || s === 'right')) s = s === 'left' ? 'right' : 'left';
  const steps = ((((rot % 360) + 360) % 360) / 90) | 0;
  return order[(order.indexOf(s) + steps) % 4];
}

export interface TerminalPos {
  id: string;
  def: TerminalDef;
  /** Absolute canvas coordinates. */
  x: number;
  y: number;
  side: Side;
}

export function terminalPositions(c: ComponentInstance): TerminalPos[] {
  const s = sizeOf(c.type, c.props);
  const rot = c.rot ?? 0;
  return terminalsOf(c.type, c.props).map((t) => {
    const p = localTerminal(t, s.w, s.h, rot, c.mirror);
    return {
      id: t.id,
      def: t,
      x: c.x + p.x,
      y: c.y + p.y,
      side: rotateSide(t.side, rot, c.mirror),
    };
  });
}

export function terminalPos(c: ComponentInstance, terminalId: string): TerminalPos | null {
  return terminalPositions(c).find((t) => t.id === terminalId) ?? null;
}

/** A short stub leaving the terminal perpendicular to the device body. */
function stub(p: TerminalPos, len = LEAD): Point {
  switch (p.side) {
    case 'top':
      return { x: p.x, y: p.y - len };
    case 'bottom':
      return { x: p.x, y: p.y + len };
    case 'left':
      return { x: p.x - len, y: p.y };
    default:
      return { x: p.x + len, y: p.y };
  }
}

const isVertical = (s: Side) => s === 'top' || s === 'bottom';

/**
 * Orthogonal route between two terminals through any manual bend points.
 * Segments are always horizontal or vertical, the way a wiring diagram is drawn.
 */
export function routeWire(from: TerminalPos, to: TerminalPos, bends: Point[] = []): Point[] {
  const pts: Point[] = [{ x: from.x, y: from.y }, stub(from)];
  const tail: Point[] = [stub(to), { x: to.x, y: to.y }];
  let cursor = pts[pts.length - 1];
  let preferVertical = isVertical(from.side);

  const mids = [...bends, tail[0]];
  for (const target of mids) {
    if (Math.abs(cursor.x - target.x) > 0.5 && Math.abs(cursor.y - target.y) > 0.5) {
      pts.push(preferVertical ? { x: cursor.x, y: target.y } : { x: target.x, y: cursor.y });
    }
    pts.push(target);
    cursor = target;
    preferVertical = !preferVertical;
  }
  pts.push(tail[1]);
  return dedupe(pts);
}

function dedupe(pts: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) out.push(p);
  }
  return out;
}

export function pathOf(points: Point[]): string {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

/** Midpoint of a polyline, used to place labels on a conductor. */
export function polylineMid(points: Point[]): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  let total = 0;
  const lens: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const l = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lens.push(l);
    total += l;
  }
  let target = total / 2;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i]) {
      const f = lens[i] === 0 ? 0 : target / lens[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * f,
        y: points[i].y + (points[i + 1].y - points[i].y) * f,
      };
    }
    target -= lens[i];
  }
  return points[points.length - 1];
}

export const snap = (v: number, on = true, grid = GRID) => (on ? Math.round(v / grid) * grid : Math.round(v));

export function boxesIntersect(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function contentBounds(boxes: Box[], pad = 60): Box {
  if (!boxes.length) return { x: 0, y: 0, w: 800, h: 600 };
  const x1 = Math.min(...boxes.map((b) => b.x)) - pad;
  const y1 = Math.min(...boxes.map((b) => b.y)) - pad;
  const x2 = Math.max(...boxes.map((b) => b.x + b.w)) + pad;
  const y2 = Math.max(...boxes.map((b) => b.y + b.h)) + pad;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Whether two terminals may sensibly be joined by a conductor of this role. */
export function terminalsCompatible(a: TerminalDef, b: TerminalDef, role: string): boolean {
  const wants = (t: TerminalDef): string[] => {
    switch (t.role) {
      case 'L':
        return ['L1', 'L2', 'L3', 'PEN'];
      case 'N':
        return ['N', 'PEN'];
      case 'PE':
      case 'earth':
        return ['PE', 'PEN'];
      case 'ctrl':
        return ['L1', 'L2', 'L3', 'N', 'CTRL'];
      case 'elv':
        return ['ELV+', 'ELV-', 'CTRL'];
      default:
        return ['L1', 'L2', 'L3', 'N', 'PE', 'PEN', 'CTRL', 'ELV+', 'ELV-'];
    }
  };
  return wants(a).includes(role) && wants(b).includes(role);
}

/* ------------------------------------------------------------------ */
/* Whole-drawing routing                                               */
/* ------------------------------------------------------------------ */

/**
 * Routes for every conductor. Conductors with manual bend points keep the
 * route the user drew; all others are routed around the devices and off each
 * other's runs. Short conductors are routed first so that they take the
 * direct paths and the long runs go round them.
 */
export function routeAll(components: ComponentInstance[], wires: Wire[], auto = true): Map<string, Point[]> {
  const byId = new Map(components.map((c) => [c.id, c]));
  const out = new Map<string, Point[]>();
  const obstacles: Obstacle[] = components.map((c) => ({ id: c.id, ...boxOf(c) }));

  // Conductors joined at a terminal are one net and may share a run.
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  const key = (e: { comp: string; terminal: string }) => `${e.comp}:${e.terminal}`;
  for (const w of wires) {
    const a = find(key(w.from));
    const b = find(key(w.to));
    if (a !== b) parent.set(a, b);
  }

  const jobs: Array<{ w: Wire; a: TerminalPos; b: TerminalPos; d: number }> = [];
  const occ = new Occupancy();
  for (const w of wires) {
    const ca = byId.get(w.from.comp);
    const cb = byId.get(w.to.comp);
    if (!ca || !cb) continue;
    const a = terminalPos(ca, w.from.terminal);
    const b = terminalPos(cb, w.to.terminal);
    if (!a || !b) continue;
    if (!auto || (w.points?.length ?? 0) > 0) {
      const pts = routeWire(a, b, w.points ?? []);
      out.set(w.id, pts);
      occ.add(pts, find(key(w.from)));
      continue;
    }
    jobs.push({ w, a, b, d: Math.abs(a.x - b.x) + Math.abs(a.y - b.y) });
  }
  jobs.sort((p, q) => p.d - q.d);
  for (const { w, a, b } of jobs) {
    const net = find(key(w.from));
    const pts = routeAround(a, b, obstacles, occ, net) ?? routeWire(a, b);
    out.set(w.id, pts);
    occ.add(pts, net);
  }
  return out;
}

/** SVG path with small rounded corners, the way a drawn schematic looks. */
export function roundedPathOf(points: Point[], r = 4): string {
  if (points.length < 3) return pathOf(points);
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr < 0.5) {
      d += ` L${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      continue;
    }
    const a = { x: p1.x + ((p0.x - p1.x) / l1) * rr, y: p1.y + ((p0.y - p1.y) / l1) * rr };
    const b = { x: p1.x + ((p2.x - p1.x) / l2) * rr, y: p1.y + ((p2.y - p1.y) / l2) * rr };
    d += ` L${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
}
