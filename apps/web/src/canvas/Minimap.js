import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { roleColor } from '@budova/engine';
import { boxOf, contentBounds, terminalPos } from './geometry.js';
const W = 180;
const H = 120;
export function Minimap({ project, view, onJump }) {
    const bounds = useMemo(() => contentBounds(project.components.map(boxOf), 80), [project.components]);
    if (!project.components.length)
        return null;
    const scale = Math.min(W / bounds.w, H / bounds.h);
    return (_jsx("div", { className: "absolute bottom-2 right-2 overflow-hidden rounded no-print", style: { width: W, height: H, background: 'var(--bg-panel)', border: '1px solid var(--border)' }, children: _jsx("svg", { width: W, height: H, onPointerDown: (e) => {
                const r = e.target.closest('svg').getBoundingClientRect();
                onJump(bounds.x + (e.clientX - r.left) / scale, bounds.y + (e.clientY - r.top) / scale);
            }, className: "cursor-pointer", children: _jsxs("g", { transform: `scale(${scale}) translate(${-bounds.x} ${-bounds.y})`, children: [project.wires.map((w) => {
                        const a = project.components.find((c) => c.id === w.from.comp);
                        const b = project.components.find((c) => c.id === w.to.comp);
                        if (!a || !b)
                            return null;
                        const ta = terminalPos(a, w.from.terminal);
                        const tb = terminalPos(b, w.to.terminal);
                        if (!ta || !tb)
                            return null;
                        return (_jsx("line", { x1: ta.x, y1: ta.y, x2: tb.x, y2: tb.y, stroke: roleColor(w), strokeWidth: 1 / scale, strokeOpacity: 0.7 }, w.id));
                    }), project.components.map((c) => {
                        const b = boxOf(c);
                        return (_jsx("rect", { x: b.x, y: b.y, width: b.w, height: b.h, fill: "var(--text-dim)", fillOpacity: 0.55 }, c.id));
                    })] }) }) }));
}
