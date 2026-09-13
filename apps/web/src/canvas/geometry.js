import { sizeOf, terminalsOf } from '@budova/engine';
export const GRID = 10;
/** Footprint of a component after rotation. */
export function boxOf(c) {
    const s = sizeOf(c.type, c.props);
    const rot = c.rot ?? 0;
    const swap = rot === 90 || rot === 270;
    return { x: c.x, y: c.y, w: swap ? s.h : s.w, h: swap ? s.w : s.h };
}
/** Terminal position inside the rotated footprint. */
export function localTerminal(t, w, h, rot, mirror = false) {
    let x = t.x;
    let y = t.y;
    if (mirror)
        x = w - x;
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
export function rotateSide(side, rot, mirror = false) {
    const order = ['top', 'right', 'bottom', 'left'];
    let s = side ?? 'top';
    if (mirror && (s === 'left' || s === 'right'))
        s = s === 'left' ? 'right' : 'left';
    const steps = ((((rot % 360) + 360) % 360) / 90) | 0;
    return order[(order.indexOf(s) + steps) % 4];
}
export function terminalPositions(c) {
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
export function terminalPos(c, terminalId) {
    return terminalPositions(c).find((t) => t.id === terminalId) ?? null;
}
/** A short stub leaving the terminal perpendicular to the device body. */
function stub(p, len = 12) {
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
const isVertical = (s) => s === 'top' || s === 'bottom';
/**
 * Orthogonal route between two terminals through any manual bend points.
 * Segments are always horizontal or vertical, the way a wiring diagram is drawn.
 */
export function routeWire(from, to, bends = []) {
    const pts = [{ x: from.x, y: from.y }, stub(from)];
    const tail = [stub(to), { x: to.x, y: to.y }];
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
function dedupe(pts) {
    const out = [];
    for (const p of pts) {
        const last = out[out.length - 1];
        if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01)
            out.push(p);
    }
    return out;
}
export function pathOf(points) {
    if (!points.length)
        return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}
/** Midpoint of a polyline, used to place labels on a conductor. */
export function polylineMid(points) {
    if (points.length < 2)
        return points[0] ?? { x: 0, y: 0 };
    let total = 0;
    const lens = [];
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
export const snap = (v, on = true, grid = GRID) => (on ? Math.round(v / grid) * grid : Math.round(v));
export function boxesIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function contentBounds(boxes, pad = 60) {
    if (!boxes.length)
        return { x: 0, y: 0, w: 800, h: 600 };
    const x1 = Math.min(...boxes.map((b) => b.x)) - pad;
    const y1 = Math.min(...boxes.map((b) => b.y)) - pad;
    const x2 = Math.max(...boxes.map((b) => b.x + b.w)) + pad;
    const y2 = Math.max(...boxes.map((b) => b.y + b.h)) + pad;
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}
/** Whether two terminals may sensibly be joined by a conductor of this role. */
export function terminalsCompatible(a, b, role) {
    const wants = (t) => {
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
