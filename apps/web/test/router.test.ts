import { describe, it, expect } from 'vitest';
import { houseBoard, contactorMotor, reversingMotor, TEMPLATES } from '@budova/engine';
import { routeAll, boxOf } from '../src/canvas/geometry.js';

/** Does a polyline pass through the body of a device it does not end on? */
function crossesBodies(pts: { x: number; y: number }[], boxes: { id: string; x: number; y: number; w: number; h: number }[], ends: string[]): string[] {
  const hits: string[] = [];
  for (const b of boxes) {
    if (ends.includes(b.id)) continue;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]!;
      const q = pts[i]!;
      const x1 = Math.min(p.x, q.x), x2 = Math.max(p.x, q.x), y1 = Math.min(p.y, q.y), y2 = Math.max(p.y, q.y);
      if (x2 > b.x + 1 && x1 < b.x + b.w - 1 && y2 > b.y + 1 && y1 < b.y + b.h - 1) {
        hits.push(b.id);
        break;
      }
    }
  }
  return hits;
}

describe('conductor routing', () => {
  for (const build of [houseBoard, contactorMotor, reversingMotor]) {
    it(`keeps conductors off device bodies in ${build.name}`, () => {
      const p = build();
      const t0 = performance.now();
      const routes = routeAll(p.components, p.wires);
      const ms = performance.now() - t0;
      const boxes = p.components.map((c) => ({ id: c.id, ...boxOf(c) }));
      let bad = 0;
      for (const w of p.wires) {
        const pts = routes.get(w.id)!;
        expect(pts.length).toBeGreaterThanOrEqual(2);
        // every segment is horizontal or vertical
        for (let i = 1; i < pts.length; i++) expect(pts[i]!.x === pts[i - 1]!.x || pts[i]!.y === pts[i - 1]!.y).toBe(true);
        bad += crossesBodies(pts, boxes, [w.from.comp, w.to.comp]).length;
      }
      console.log(build.name, p.wires.length, 'wires', ms.toFixed(1), 'ms, crossings', bad);
      expect(bad).toBe(0);
    });
  }
  it('routes every template quickly', () => {
    for (const t of TEMPLATES) {
      const p = t.build();
      const t0 = performance.now();
      routeAll(p.components, p.wires);
      expect(performance.now() - t0).toBeLessThan(400);
    }
  });
});
