export const GRID = 10;
/** Convenience builders for terminal layouts. */
export function topBottom(w, h, pairs) {
    const n = pairs.length;
    const out = [];
    pairs.forEach(([id, role, mark], i) => {
        const x = ((i + 1) * w) / (n + 1);
        out.push({ id: `in.${id}`, role, mark, x, y: 0, side: 'top' });
        out.push({ id: `out.${id}`, role, mark, x, y: h, side: 'bottom' });
    });
    return out;
}
