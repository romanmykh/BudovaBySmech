import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDef, effectiveProps, sizeOf } from '@budova/engine';
import { renderSymbol } from './symbols.js';
import { terminalPositions, boxOf } from './geometry.js';
/** Matrix that maps the symbol's own coordinates into the rotated footprint. */
export function symbolTransform(w, h, rot, mirror) {
    const r = ((rot % 360) + 360) % 360;
    const rotM = r === 90 ? `matrix(0 1 -1 0 ${h} 0)`
        : r === 180 ? `matrix(-1 0 0 -1 ${w} ${h})`
            : r === 270 ? `matrix(0 -1 1 0 0 ${w})`
                : '';
    const mirM = mirror ? `matrix(-1 0 0 1 ${w} 0)` : '';
    return [rotM, mirM].filter(Boolean).join(' ');
}
/** Colour a terminal by the potential it actually sits at. */
function potentialColor(v) {
    if (v > 400)
        return 'var(--fail)';
    if (v > 150)
        return 'var(--live-l1)';
    if (v > 50)
        return 'var(--warn)';
    if (v > 10)
        return 'var(--live-n)';
    return 'var(--text-faint)';
}
function ComponentNodeImpl(p) {
    const { t } = useTranslation();
    const { comp } = p;
    const def = getDef(comp.type);
    const props = effectiveProps(comp.type, comp.props);
    const base = sizeOf(comp.type, comp.props);
    const box = boxOf(comp);
    const terms = terminalPositions(comp);
    const tripped = !!p.state?.tripped || !!p.state?.blown;
    const rating = ratingText(comp.type, props);
    return (_jsxs("g", { "data-comp": comp.id, className: "cursor-move", onPointerDown: (e) => p.onPointerDownBody(e, comp.id), onDoubleClick: (e) => p.onActivate(comp.id, e), children: [(p.selected || p.highlighted) && (_jsx("rect", { x: box.x - 5, y: box.y - 5, width: box.w + 10, height: box.h + 10, rx: 4, fill: p.highlighted ? 'var(--warn)' : 'var(--accent)', fillOpacity: 0.1, stroke: p.highlighted ? 'var(--warn)' : 'var(--accent)', strokeWidth: 1.5, strokeDasharray: p.highlighted ? '5 3' : undefined })), _jsxs("g", { transform: `translate(${comp.x} ${comp.y}) ${symbolTransform(base.w, base.h, comp.rot ?? 0, !!comp.mirror)}`, stroke: tripped ? 'var(--fail)' : 'var(--text)', fill: "none", pointerEvents: "all", children: [_jsx("rect", { x: 0, y: 0, width: base.w, height: base.h, fill: "transparent", stroke: "none" }), renderSymbol(def?.symbol ?? 'generic', {
                        w: base.w,
                        h: base.h,
                        props,
                        state: p.state ?? {},
                        meas: p.meas ?? {},
                        live: p.live,
                    })] }), p.showTerminals &&
                terms.map((tp) => {
                    const v = p.nodeV[`${comp.id}:${tp.id}`] ?? 0;
                    const pending = p.pendingTerminal === tp.id;
                    const compatible = p.compatibleTerminals?.has(`${comp.id}:${tp.id}`);
                    return (_jsxs("g", { "data-terminal": tp.id, onPointerDown: (e) => p.onTerminalClick(e, comp.id, tp.id), children: [_jsx("title", { children: tp.def.mark ?? tp.id }), _jsx("circle", { cx: tp.x, cy: tp.y, r: 7, fill: "transparent", className: "cursor-crosshair" }), _jsx("circle", { cx: tp.x, cy: tp.y, r: pending ? 4.5 : compatible ? 4 : 2.6, fill: pending ? 'var(--accent)' : compatible ? 'var(--ok)' : potentialColor(v), stroke: compatible || pending ? 'var(--bg-panel)' : 'none', strokeWidth: 1 })] }, tp.id));
                }), comp.label && (_jsx("text", { x: box.x + box.w / 2, y: box.y - 9, fontSize: 11, textAnchor: "middle", fill: "var(--text)", fontWeight: 600, pointerEvents: "none", children: comp.label })), rating && (_jsx("text", { x: box.x + box.w / 2, y: box.y + box.h + 13, fontSize: 10, textAnchor: "middle", fill: "var(--text-dim)", pointerEvents: "none", children: rating })), tripped && (_jsx("text", { x: box.x + box.w - 2, y: box.y + 2, fontSize: 10, textAnchor: "end", fill: "var(--fail)", fontWeight: 700, pointerEvents: "none", children: t(p.state?.blown ? 'inspector.state.blown' : 'inspector.state.tripped') }))] }));
}
/** One-line summary of the electrical rating, drawn under the symbol. */
export function ratingText(type, props) {
    const bits = [];
    if (props.inA !== undefined && type !== 'socket16' && type !== 'socketUsb') {
        bits.push(`${props.curve ?? ''}${props.inA} A`);
    }
    if (props.idn !== undefined)
        bits.push(`${props.idn} mA ${props.rcdType ?? ''}`.trim());
    if (props.watts !== undefined && Number(props.watts) > 0) {
        const w = Number(props.watts);
        bits.push(w >= 1000 ? `${(w / 1000).toFixed(w % 1000 ? 1 : 0)} kW` : `${w} W`);
    }
    if (type === 'evse')
        bits.push(`${props.powerKw} kW`);
    if (props.setA !== undefined)
        bits.push(`${props.setA} A`);
    return bits.join(' · ');
}
export const ComponentNode = memo(ComponentNodeImpl);
