import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDef, terminalsOf, } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';
import { useUi } from '../store/ui.js';
import { ComponentNode } from './ComponentNode.js';
import { WireLayer } from './WireLayer.js';
import { boxOf, contentBounds, snap, terminalPositions, terminalsCompatible, routeWire, pathOf, } from './geometry.js';
import { Minimap } from './Minimap.js';
export function SchematicCanvas() {
    const { t } = useTranslation();
    const svgRef = useRef(null);
    const project = useProject((s) => s.project);
    const selection = useProject((s) => s.selection);
    const selectedWires = useProject((s) => s.selectedWires);
    const selectedAnnotations = useProject((s) => s.selectedAnnotations);
    const store = useProject;
    const ui = useUi();
    const results = useSim((s) => s.results);
    const running = useSim((s) => s.running);
    const operate = useSim((s) => s.operate);
    const [view, setView] = useState({ x: 60, y: 40, zoom: 1 });
    const [pending, setPending] = useState(null);
    const [cursor, setCursor] = useState({ x: 0, y: 0 });
    const [marquee, setMarquee] = useState(null);
    const drag = useRef(null);
    /* ---------------- coordinate helpers ---------------- */
    const toWorld = useCallback((clientX, clientY) => {
        const r = svgRef.current?.getBoundingClientRect();
        if (!r)
            return { x: 0, y: 0 };
        return { x: (clientX - r.left - view.x) / view.zoom, y: (clientY - r.top - view.y) / view.zoom };
    }, [view]);
    const fit = useCallback(() => {
        const boxes = project.components.map(boxOf);
        const b = contentBounds(boxes);
        const r = svgRef.current?.getBoundingClientRect();
        if (!r)
            return;
        const zoom = Math.min(3, Math.max(0.15, Math.min(r.width / b.w, r.height / b.h)));
        setView({ x: -b.x * zoom + (r.width - b.w * zoom) / 2, y: -b.y * zoom + (r.height - b.h * zoom) / 2, zoom });
    }, [project.components]);
    useEffect(() => {
        if (project.components.length && view.zoom === 1 && view.x === 60 && view.y === 40)
            fit();
        // Only on the first project that arrives.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.id]);
    /* ---------------- wiring ---------------- */
    const compatible = useMemo(() => {
        if (!pending)
            return null;
        const from = project.components.find((c) => c.id === pending.comp);
        if (!from)
            return null;
        const fromDef = terminalsOf(from.type, from.props).find((x) => x.id === pending.terminal);
        if (!fromDef)
            return null;
        const set = new Set();
        for (const c of project.components) {
            for (const term of terminalsOf(c.type, c.props)) {
                if (c.id === pending.comp && term.id === pending.terminal)
                    continue;
                if (terminalsCompatible(fromDef, term, ui.drawRole))
                    set.add(`${c.id}:${term.id}`);
            }
        }
        return set;
    }, [pending, project.components, ui.drawRole]);
    const completeWire = useCallback((compId, terminalId) => {
        if (!pending)
            return;
        if (pending.comp === compId && pending.terminal === terminalId) {
            setPending(null);
            return;
        }
        const id = store.getState().addWire({
            from: { comp: pending.comp, terminal: pending.terminal },
            to: { comp: compId, terminal: terminalId },
            role: ui.drawRole,
            csa: ui.drawCsa,
            length: ui.drawLength,
            material: 'Cu',
            color: null,
            points: [],
            installMethod: project.settings.defaultInstallMethod,
        });
        if (!id)
            ui.showToast(t('canvas.alreadyConnected'), 'error');
        setPending(null);
    }, [pending, store, ui, project.settings.defaultInstallMethod, t]);
    const onTerminalClick = useCallback((e, compId, terminalId) => {
        e.stopPropagation();
        if (e.button !== 0)
            return;
        if (pending)
            completeWire(compId, terminalId);
        else
            setPending({ comp: compId, terminal: terminalId });
    }, [pending, completeWire]);
    /* ---------------- pointer handling ---------------- */
    const onPointerDownBody = useCallback((e, id) => {
        if (e.button !== 0)
            return;
        // While placing a note, a click belongs to the canvas even when it lands
        // on top of a device.
        if (ui.mode === 'text')
            return;
        e.stopPropagation();
        // In live mode a click operates the device instead of selecting it.
        const comp = project.components.find((c) => c.id === id);
        const def = comp ? getDef(comp.type) : undefined;
        if (running && def?.interactive && def.interactive !== 'none' && !e.shiftKey && !e.altKey) {
            if (def.interactive === 'button') {
                operate(id, 'press');
                const up = () => {
                    operate(id, 'release');
                    window.removeEventListener('pointerup', up);
                };
                window.addEventListener('pointerup', up);
            }
            else if (def.interactive === 'plug') {
                operate(id, 'toggle');
            }
            else {
                operate(id, 'toggle');
            }
            return;
        }
        if (!selection.includes(id))
            store.getState().toggleSelect(id, e.shiftKey);
        store.getState().beginGesture();
        drag.current = { kind: 'move', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
        e.target.setPointerCapture?.(e.pointerId);
    }, [project.components, running, operate, selection, store, ui.mode]);
    const onSvgPointerDown = useCallback((e) => {
        const isPan = e.button === 1 || ui.mode === 'pan' || e.altKey;
        if (isPan) {
            drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
            return;
        }
        if (e.button !== 0)
            return;
        if (pending) {
            setPending(null);
            return;
        }
        if (ui.mode === 'text') {
            const at = toWorld(e.clientX, e.clientY);
            store.getState().addAnnotation({
                kind: 'text',
                x: snap(at.x, ui.snap),
                y: snap(at.y, ui.snap),
                text: '',
                fontSize: 13,
                view: 'schematic',
            });
            ui.set('mode', 'select');
            return;
        }
        if (!e.shiftKey)
            store.getState().clearSelection();
        const w = toWorld(e.clientX, e.clientY);
        drag.current = { kind: 'select', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
        setMarquee({ x: w.x, y: w.y, w: 0, h: 0 });
    }, [ui.mode, pending, store, toWorld]);
    const onPointerMove = useCallback((e) => {
        const w = toWorld(e.clientX, e.clientY);
        setCursor(w);
        const d = drag.current;
        if (!d)
            return;
        const dx = e.clientX - d.lastX;
        const dy = e.clientY - d.lastY;
        if (Math.abs(e.clientX - d.startX) > 2 || Math.abs(e.clientY - d.startY) > 2)
            d.moved = true;
        d.lastX = e.clientX;
        d.lastY = e.clientY;
        if (d.kind === 'pan') {
            setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
        }
        else if (d.kind === 'move') {
            store.getState().moveSelection(dx / view.zoom, dy / view.zoom, false);
        }
        else if (d.kind === 'select') {
            const start = toWorld(d.startX, d.startY);
            setMarquee({
                x: Math.min(start.x, w.x),
                y: Math.min(start.y, w.y),
                w: Math.abs(w.x - start.x),
                h: Math.abs(w.y - start.y),
            });
        }
        else if (d.kind === 'annotation' && d.annotationId) {
            store.getState().touch((p) => {
                const a = p.annotations.find((x) => x.id === d.annotationId);
                if (a) {
                    a.x += dx / view.zoom;
                    a.y += dy / view.zoom;
                }
            });
        }
        else if (d.kind === 'bend' && d.wireId !== undefined && d.bendIndex !== undefined) {
            const wire = project.wires.find((x) => x.id === d.wireId);
            if (wire) {
                store.getState().touch((p) => {
                    const target = p.wires.find((x) => x.id === d.wireId);
                    if (target?.points?.[d.bendIndex]) {
                        target.points[d.bendIndex] = { x: snap(w.x, ui.snap), y: snap(w.y, ui.snap) };
                    }
                });
            }
        }
    }, [toWorld, view.zoom, store, project.wires, ui.snap]);
    const onPointerUp = useCallback(() => {
        const d = drag.current;
        drag.current = null;
        if (!d)
            return;
        if (d.kind === 'move') {
            if (d.moved) {
                // Snap the whole selection to the grid once, at the end of the drag.
                store.getState().endGesture((p) => {
                    const ids = new Set(store.getState().selection);
                    for (const c of p.components) {
                        if (ids.has(c.id)) {
                            c.x = snap(c.x, ui.snap);
                            c.y = snap(c.y, ui.snap);
                        }
                    }
                });
            }
            else {
                // A click that selected something is not a history entry.
                store.getState().cancelGesture();
            }
        }
        if (d.kind === 'bend' || d.kind === 'annotation') {
            if (d.moved) {
                store.getState().endGesture((p) => {
                    if (d.kind !== 'annotation' || !d.annotationId)
                        return;
                    const a = p.annotations.find((x) => x.id === d.annotationId);
                    if (a) {
                        a.x = snap(a.x, ui.snap);
                        a.y = snap(a.y, ui.snap);
                    }
                });
            }
            else
                store.getState().cancelGesture();
        }
        if (d.kind === 'select' && marquee && (marquee.w > 4 || marquee.h > 4)) {
            const hits = project.components
                .filter((c) => {
                const b = boxOf(c);
                return (b.x < marquee.x + marquee.w && b.x + b.w > marquee.x &&
                    b.y < marquee.y + marquee.h && b.y + b.h > marquee.y);
            })
                .map((c) => c.id);
            store.getState().select(hits);
        }
        setMarquee(null);
    }, [store, ui.snap, marquee, project.components]);
    const onWheel = useCallback((e) => {
        const r = svgRef.current?.getBoundingClientRect();
        if (!r)
            return;
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        const factor = Math.exp(-e.deltaY * 0.0014);
        setView((v) => {
            const zoom = Math.min(6, Math.max(0.1, v.zoom * factor));
            const k = zoom / v.zoom;
            return { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
        });
    }, []);
    /* ---------------- drag & drop from the library ---------------- */
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/x-budova-component');
        if (!type)
            return;
        const w = toWorld(e.clientX, e.clientY);
        store.getState().addComponent(type, snap(w.x - 30, ui.snap), snap(w.y - 30, ui.snap));
    }, [toWorld, store, ui.snap]);
    /* ---------------- keyboard ---------------- */
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape')
                setPending(null);
            if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                fit();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [fit]);
    /* ---------------- render ---------------- */
    const pendingPos = useMemo(() => {
        if (!pending)
            return null;
        const c = project.components.find((x) => x.id === pending.comp);
        if (!c)
            return null;
        return terminalPositions(c).find((x) => x.id === pending.terminal) ?? null;
    }, [pending, project.components]);
    const gridSize = 10 * view.zoom;
    const showGridDots = ui.showGrid && gridSize > 4;
    return (_jsxs("div", { className: "relative h-full w-full overflow-hidden", style: { background: 'var(--canvas)' }, children: [_jsxs("svg", { ref: svgRef, className: "h-full w-full touch-none select-none", onPointerDown: onSvgPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerLeave: onPointerUp, onWheel: onWheel, onDragOver: (e) => e.preventDefault(), onDrop: handleDrop, style: { cursor: ui.mode === 'pan' ? 'grab' : pending ? 'crosshair' : 'default' }, children: [_jsxs("defs", { children: [_jsx("pattern", { id: "grid-fine", width: gridSize, height: gridSize, patternUnits: "userSpaceOnUse", patternTransform: `translate(${view.x % gridSize} ${view.y % gridSize})`, children: _jsx("circle", { cx: 0.5, cy: 0.5, r: 0.6, fill: "var(--grid-strong)" }) }), _jsx("pattern", { id: "grid-coarse", width: gridSize * 10, height: gridSize * 10, patternUnits: "userSpaceOnUse", patternTransform: `translate(${view.x % (gridSize * 10)} ${view.y % (gridSize * 10)})`, children: _jsx("rect", { width: gridSize * 10, height: gridSize * 10, fill: "none", stroke: "var(--grid)", strokeWidth: 1 }) })] }), showGridDots && _jsx("rect", { x: 0, y: 0, width: "100%", height: "100%", fill: "url(#grid-fine)" }), ui.showGrid && _jsx("rect", { x: 0, y: 0, width: "100%", height: "100%", fill: "url(#grid-coarse)" }), _jsxs("g", { transform: `translate(${view.x} ${view.y}) scale(${view.zoom})`, id: "schematic-root", children: [project.annotations
                                .filter((a) => (a.view ?? 'schematic') === 'schematic')
                                .map((a) => {
                                const isSel = selectedAnnotations.includes(a.id);
                                const onDown = (e) => {
                                    e.stopPropagation();
                                    store.getState().select([], [], [a.id]);
                                    store.getState().beginGesture();
                                    drag.current = {
                                        kind: 'annotation',
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        lastX: e.clientX,
                                        lastY: e.clientY,
                                        annotationId: a.id,
                                        moved: false,
                                    };
                                };
                                return (_jsx("g", { onPointerDown: onDown, className: "cursor-move", children: a.kind === 'rect' ? (_jsx("rect", { x: a.x, y: a.y, width: a.w ?? 100, height: a.h ?? 60, fill: a.color ?? 'var(--accent)', fillOpacity: 0.06, stroke: isSel ? 'var(--accent)' : a.color ?? 'var(--border-strong)', strokeDasharray: "4 3" })) : (_jsxs(_Fragment, { children: [isSel && (_jsx("rect", { x: a.x - 4, y: a.y - (a.fontSize ?? 13), width: Math.max(40, (a.text ?? '').length * (a.fontSize ?? 13) * 0.58) + 8, height: (a.fontSize ?? 13) * 1.5, fill: "var(--accent)", fillOpacity: 0.1, stroke: "var(--accent)", strokeDasharray: "3 2" })), _jsx("text", { x: a.x, y: a.y, fontSize: a.fontSize ?? 13, fill: a.color ?? 'var(--text-dim)', children: a.text || t('canvas.notePlaceholder') })] })) }, a.id));
                            }), _jsx(WireLayer, { project: project, wireI: results.wireI, selected: selectedWires, highlighted: ui.highlightWires, live: running, showLabels: view.zoom > 1.6 && !running, showCurrents: running && view.zoom > 0.95, onSelect: (e, id) => {
                                    if (ui.mode === 'text')
                                        return;
                                    e.stopPropagation();
                                    store.getState().select([], [id], []);
                                }, toWorld: (e) => toWorld(e.clientX, e.clientY), onAddBend: (id, x, y) => {
                                    store.getState().commit((p) => {
                                        const wire = p.wires.find((w) => w.id === id);
                                        if (!wire)
                                            return;
                                        const pt = { x: snap(x, ui.snap), y: snap(y, ui.snap) };
                                        // Insert the new bend at the nearest position along the run.
                                        const pts = [...(wire.points ?? [])];
                                        let best = pts.length;
                                        let bestD = Infinity;
                                        pts.forEach((existing, i) => {
                                            const dd = Math.hypot(existing.x - pt.x, existing.y - pt.y);
                                            if (dd < bestD) {
                                                bestD = dd;
                                                best = i;
                                            }
                                        });
                                        pts.splice(best === pts.length ? pts.length : best + 1, 0, pt);
                                        wire.points = pts;
                                    });
                                }, onBendDown: (e, id, index) => {
                                    store.getState().select([], [id]);
                                    store.getState().beginGesture();
                                    drag.current = {
                                        kind: 'bend',
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        lastX: e.clientX,
                                        lastY: e.clientY,
                                        wireId: id,
                                        bendIndex: index,
                                        moved: false,
                                    };
                                }, onBendRemove: (id, index) => {
                                    store.getState().commit((p) => {
                                        const wire = p.wires.find((w) => w.id === id);
                                        if (wire?.points)
                                            wire.points = wire.points.filter((_, i) => i !== index);
                                    });
                                } }), project.components.map((c) => (_jsx(ComponentNode, { comp: c, selected: selection.includes(c.id), highlighted: ui.highlight.includes(c.id), live: running, state: results.state[c.id] ?? {}, meas: results.meas[c.id] ?? {}, nodeV: results.nodeV, pendingTerminal: pending?.comp === c.id ? pending.terminal : null, compatibleTerminals: compatible, showTerminals: view.zoom > 0.4, onPointerDownBody: onPointerDownBody, onTerminalClick: onTerminalClick, onActivate: (id) => store.getState().select([id]) }, c.id))), pendingPos && (_jsx("path", { d: pathOf(routeWire(pendingPos, {
                                    id: 'cursor',
                                    def: { id: 'cursor', role: 'any', x: 0, y: 0 },
                                    x: cursor.x,
                                    y: cursor.y,
                                    side: 'top',
                                })), stroke: "var(--accent)", strokeWidth: 2, strokeDasharray: "5 4", fill: "none", pointerEvents: "none" })), marquee && (_jsx("rect", { x: marquee.x, y: marquee.y, width: marquee.w, height: marquee.h, fill: "var(--accent)", fillOpacity: 0.08, stroke: "var(--accent)", strokeDasharray: "4 3", pointerEvents: "none" }))] })] }), pending && (_jsxs("div", { className: "pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded px-3 py-1 text-xs", style: { background: 'var(--bg-panel)', border: '1px solid var(--border)' }, children: [t('canvas.wireHint'), " \u00B7 ", t('canvas.wireCancel')] })), !project.components.length && (_jsxs("div", { className: "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center", children: [_jsx("div", { className: "text-base font-medium", children: t('canvas.emptyTitle') }), _jsx("div", { className: "dim max-w-sm text-xs", children: t('canvas.emptyHint') })] })), _jsxs("div", { className: "absolute bottom-2 left-2 flex items-center gap-1 no-print", children: [_jsx("button", { className: "btn btn-sm", onClick: () => setView((v) => ({ ...v, zoom: Math.min(6, v.zoom * 1.25) })), children: "+" }), _jsx("button", { className: "btn btn-sm", onClick: () => setView((v) => ({ ...v, zoom: Math.max(0.1, v.zoom / 1.25) })), children: "\u2212" }), _jsx("button", { className: "btn btn-sm", onClick: fit, title: t('action.zoomFit'), children: "\u2922" }), _jsxs("span", { className: "faint ml-1 text-[11px] mono", children: [Math.round(view.zoom * 100), " %"] })] }), ui.showMinimap && (_jsx(Minimap, { project: project, view: view, onJump: (x, y) => {
                    const r = svgRef.current?.getBoundingClientRect();
                    if (!r)
                        return;
                    setView((v) => ({ ...v, x: r.width / 2 - x * v.zoom, y: r.height / 2 - y * v.zoom }));
                } }))] }));
}
