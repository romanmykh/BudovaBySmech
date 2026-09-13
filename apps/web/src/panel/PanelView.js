import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDef, effectiveProps, moduleCount, } from '@budova/engine';
import { useProject, rowUsage } from '../store/project.js';
import { useSim } from '../store/sim.js';
import { useUi } from '../store/ui.js';
import { ratingText } from '../canvas/ComponentNode.js';
/** On-screen size of one 17,5 mm DIN module. */
const MOD = 26;
const ROW_H = 84;
const PAD = 18;
const HEADER = 30;
export function PanelView() {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const selection = useProject((s) => s.selection);
    const store = useProject;
    const ui = useUi();
    const results = useSim((s) => s.results);
    const operate = useSim((s) => s.operate);
    const running = useSim((s) => s.running);
    /*
     * The id of the device being dragged is kept in a ref rather than in state:
     * dragstart and drop can arrive in the same tick, and a state update would
     * not have landed by then.
     */
    const dragged = useRef(null);
    const modular = useMemo(() => project.components.filter((c) => moduleCount(c.type, c.props) > 0), [project.components]);
    const enclosureIds = new Set(project.enclosures.map((e) => e.id));
    const unplaced = modular.filter((c) => !c.panel || !enclosureIds.has(c.panel.enclosureId));
    const addEnclosure = () => store.getState().addEnclosure({
        name: t('panel.enclosure'),
        rows: 3,
        modulesPerRow: 12,
        mount: 'flush',
        ip: 'IP40',
        x: 0,
        y: 0,
        door: true,
    });
    return (_jsxs("div", { className: "flex h-full overflow-hidden", children: [_jsx("div", { className: "flex-1 overflow-auto p-4", style: { background: 'var(--canvas)' }, children: !project.enclosures.length ? (_jsxs("div", { className: "flex h-full flex-col items-center justify-center gap-2", children: [_jsx("div", { className: "dim", children: t('panel.noEnclosure') }), _jsx("button", { className: "btn", onClick: addEnclosure, children: t('panel.addEnclosure') })] })) : (_jsxs("div", { className: "flex flex-col gap-6", children: [project.enclosures.map((e) => (_jsx(EnclosureSvg, { enclosure: e, components: modular.filter((c) => c.panel?.enclosureId === e.id), selection: selection, results: results, running: running, onSelect: (id) => store.getState().select([id]), onOperate: (id) => operate(id, 'toggle'), onDropDevice: (row, slot) => {
                                const id = dragged.current;
                                if (!id)
                                    return;
                                store.getState().placeInPanel(id, e.id, row, slot);
                                dragged.current = null;
                            }, onRemove: (id) => store.getState().removeFromPanel(id) }, e.id))), _jsx("button", { className: "btn self-start no-print", onClick: addEnclosure, children: t('panel.addEnclosure') })] })) }), _jsxs("div", { className: "flex w-72 shrink-0 flex-col overflow-y-auto border-l no-print", style: { background: 'var(--bg-panel)', borderColor: 'var(--border)' }, children: [_jsxs("div", { className: "border-b p-2.5", style: { borderColor: 'var(--border)' }, children: [_jsx("div", { className: "sect-title mb-1", children: t('panel.unplaced') }), _jsx("div", { className: "faint mb-2 text-[11px]", children: t('panel.unplacedHint') }), !unplaced.length && _jsx("div", { className: "dim text-xs", children: "\u2014" }), _jsx("ul", { className: "flex flex-col gap-1", children: unplaced.map((c) => (_jsxs("li", { draggable: true, onDragStart: () => {
                                        dragged.current = c.id;
                                    }, onDragEnd: () => {
                                        dragged.current = null;
                                    }, className: "flex cursor-grab items-center gap-2 rounded px-1.5 py-1 text-xs", style: { background: 'var(--bg-sunken)' }, children: [_jsx("b", { children: c.label ?? '—' }), _jsx("span", { className: "dim truncate", children: t(`comp.${c.type}`) }), _jsx("span", { className: "faint ml-auto mono", children: moduleCount(c.type, c.props) })] }, c.id))) })] }), _jsx(EnclosureSettings, {}), _jsx(LabelSheet, {})] })] }));
}
function EnclosureSvg({ enclosure, components, selection, results, running, onSelect, onOperate, onDropDevice, onRemove, }) {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const width = enclosure.modulesPerRow * MOD + PAD * 2;
    const height = enclosure.rows * ROW_H + PAD * 2 + HEADER + 34;
    const busbars = project.busbars.filter((b) => b.enclosureId === enclosure.id);
    const totalUsed = components.reduce((n, c) => n + moduleCount(c.type, c.props), 0);
    const capacity = enclosure.rows * enclosure.modulesPerRow;
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-1 flex items-baseline gap-2", children: [_jsx("span", { className: "font-semibold", children: enclosure.name }), _jsxs("span", { className: "faint text-[11px]", children: [enclosure.rows, "\u00D7", enclosure.modulesPerRow, " \u00B7 ", t(`opt.mount.${enclosure.mount}`), " \u00B7 ", enclosure.ip] }), _jsx("span", { className: "ml-auto text-[11px] mono", style: { color: totalUsed > capacity ? 'var(--fail)' : 'var(--text-dim)' }, children: t('panel.modules', { used: totalUsed, total: capacity }) })] }), totalUsed > capacity && (_jsx("div", { className: "mb-1 text-xs", style: { color: 'var(--fail)' }, children: t('panel.full') })), _jsxs("svg", { width: width, height: height, id: `enclosure-${enclosure.id}`, style: { maxWidth: '100%' }, children: [_jsx("rect", { x: 1, y: 1, width: width - 2, height: height - 2, rx: 6, fill: "var(--bg-panel)", stroke: "var(--border-strong)", strokeWidth: 2 }), _jsx("text", { x: PAD, y: 20, fontSize: 12, fill: "var(--text-dim)", children: enclosure.name }), Array.from({ length: enclosure.rows }, (_, r) => {
                        const row = r + 1;
                        const y = HEADER + PAD + r * ROW_H;
                        const used = rowUsage(project, enclosure.id, row);
                        return (_jsxs("g", { children: [_jsx("rect", { x: PAD, y: y + 46, width: enclosure.modulesPerRow * MOD, height: 9, fill: "var(--bg-sunken)", stroke: "var(--border)" }), _jsx("text", { x: PAD - 6, y: y + 30, fontSize: 10, textAnchor: "end", fill: "var(--text-faint)", children: row }), Array.from({ length: enclosure.modulesPerRow }, (_, s) => (_jsx("rect", { x: PAD + s * MOD, y: y, width: MOD, height: 46, fill: "transparent", stroke: "var(--border)", strokeDasharray: "2 3", strokeWidth: 0.5, onDragOver: (e) => e.preventDefault(), onDrop: () => onDropDevice(row, s) }, s))), used > enclosure.modulesPerRow && (_jsx("text", { x: PAD + enclosure.modulesPerRow * MOD - 4, y: y + 12, fontSize: 10, textAnchor: "end", fill: "var(--fail)", children: t('panel.full') })), busbars
                                    .filter((b) => b.row === row)
                                    .map((b) => (_jsxs("g", { children: [_jsx("rect", { x: PAD + b.slot * MOD, y: y - 8, width: b.modules * MOD, height: 6, fill: "var(--live-l1)", fillOpacity: 0.55 }), _jsx("text", { x: PAD + b.slot * MOD + 2, y: y - 10, fontSize: 8, fill: "var(--text-faint)", children: b.kind })] }, b.id))), components
                                    .filter((c) => c.panel?.row === row)
                                    .map((c) => (_jsx(DeviceModule, { comp: c, x: PAD + (c.panel?.slot ?? 0) * MOD, y: y, selected: selection.includes(c.id), state: results.state[c.id] ?? {}, running: running, onSelect: () => onSelect(c.id), onOperate: () => onOperate(c.id), onRemove: () => onRemove(c.id) }, c.id)))] }, row));
                    }), _jsxs("g", { children: [_jsx("rect", { x: PAD, y: height - PAD - 26, width: (enclosure.modulesPerRow * MOD) / 2 - 4, height: 11, fill: "var(--live-n)", fillOpacity: 0.3 }), _jsx("text", { x: PAD + 4, y: height - PAD - 17, fontSize: 9, fill: "var(--text-dim)", children: "N" }), _jsx("rect", { x: PAD + (enclosure.modulesPerRow * MOD) / 2 + 4, y: height - PAD - 26, width: (enclosure.modulesPerRow * MOD) / 2 - 4, height: 11, fill: "var(--live-pe)", fillOpacity: 0.3 }), _jsx("text", { x: PAD + (enclosure.modulesPerRow * MOD) / 2 + 8, y: height - PAD - 17, fontSize: 9, fill: "var(--text-dim)", children: "PE" }), _jsx("text", { x: width - PAD, y: height - PAD - 2, fontSize: 9, textAnchor: "end", fill: "var(--text-faint)", children: t('panel.moduleWidth') })] })] })] }));
}
function DeviceModule({ comp, x, y, selected, state, running, onSelect, onOperate, onRemove, }) {
    const { t } = useTranslation();
    const n = moduleCount(comp.type, comp.props);
    const w = n * MOD;
    const props = effectiveProps(comp.type, comp.props);
    const def = getDef(comp.type);
    const tripped = !!state.tripped || !!state.blown;
    const closed = state.closed !== false && !tripped;
    const interactive = def?.interactive === 'toggle';
    return (_jsxs("g", { onClick: (e) => {
            if (running && interactive && !e.shiftKey)
                onOperate();
            else
                onSelect();
        }, onDoubleClick: onRemove, className: "cursor-pointer", children: [_jsx("rect", { x: x + 1, y: y + 1, width: w - 2, height: 44, rx: 2, fill: tripped ? 'var(--fail)' : 'var(--bg-sunken)', fillOpacity: tripped ? 0.18 : 1, stroke: selected ? 'var(--accent)' : tripped ? 'var(--fail)' : 'var(--border-strong)', strokeWidth: selected ? 2 : 1 }), interactive && (_jsx("rect", { x: x + w / 2 - 4, y: closed ? y + 6 : y + 18, width: 8, height: 12, rx: 1.5, fill: closed ? 'var(--ok)' : 'var(--text-faint)' })), _jsx("text", { x: x + w / 2, y: y + 38, fontSize: 9, textAnchor: "middle", fill: "var(--text)", children: comp.label ?? '' }), _jsx("text", { x: x + w / 2, y: y + 60, fontSize: fitFontSize(panelRating(comp.type, props), w - 2), textAnchor: "middle", fill: "var(--text-dim)", children: panelRating(comp.type, props) }), _jsx("title", { children: `${comp.label ?? ''} ${t(`comp.${comp.type}`)}` })] }));
}
/** Short rating for the narrow face of a modular device. */
function panelRating(type, props) {
    const bits = [];
    if (props.inA !== undefined)
        bits.push(`${props.curve ?? ''}${props.inA}`);
    if (props.idn !== undefined)
        bits.push(`${props.idn}mA${props.rcdType ?? ''}`);
    if (props.spdType)
        bits.push(String(props.spdType));
    if (props.setA !== undefined)
        bits.push(`${props.setA}A`);
    return bits.join(' ');
}
/** Shrink the label rather than let it run into the neighbouring device. */
function fitFontSize(text, width) {
    if (!text)
        return 8.5;
    const estimated = text.length * 4.6;
    if (estimated <= width)
        return 8.5;
    return Math.max(5.5, (8.5 * width) / estimated);
}
function EnclosureSettings() {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const commit = useProject((s) => s.commit);
    const [idx, setIdx] = useState(0);
    const e = project.enclosures[idx];
    if (!e)
        return null;
    const patch = (p) => commit((proj) => {
        const target = proj.enclosures.find((x) => x.id === e.id);
        if (target)
            Object.assign(target, p);
    });
    return (_jsxs("div", { className: "border-b p-2.5 text-xs", style: { borderColor: 'var(--border)' }, children: [_jsx("div", { className: "sect-title mb-1", children: t('panel.enclosure') }), project.enclosures.length > 1 && (_jsx("select", { className: "mb-1.5", value: idx, onChange: (ev) => setIdx(Number(ev.target.value)), children: project.enclosures.map((x, i) => (_jsx("option", { value: i, children: x.name }, x.id))) })), _jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('project.name') }), _jsx("input", { type: "text", value: e.name, onChange: (ev) => patch({ name: ev.target.value }) })] }), _jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('prop.rows') }), _jsx("input", { type: "number", min: 1, max: 6, value: e.rows, onChange: (ev) => patch({ rows: Number(ev.target.value) }) })] }), _jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('prop.modulesPerRow') }), _jsx("select", { value: e.modulesPerRow, onChange: (ev) => patch({ modulesPerRow: Number(ev.target.value) }), children: [12, 14, 18, 24].map((m) => (_jsx("option", { value: m, children: m }, m))) })] }), _jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('prop.mount') }), _jsxs("select", { value: e.mount, onChange: (ev) => patch({ mount: ev.target.value }), children: [_jsx("option", { value: "flush", children: t('opt.mount.flush') }), _jsx("option", { value: "surface", children: t('opt.mount.surface') })] })] }), _jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('prop.ip') }), _jsx("select", { value: e.ip, onChange: (ev) => patch({ ip: ev.target.value }), children: ['IP20', 'IP30', 'IP40', 'IP44', 'IP54', 'IP65'].map((x) => (_jsx("option", { value: x, children: x }, x))) })] }), _jsx("button", { className: "btn btn-sm", onClick: () => commit((proj) => {
                    proj.busbars.push({
                        id: `b${proj.busbars.length + 1}`,
                        enclosureId: e.id,
                        row: 1,
                        slot: 0,
                        modules: Math.min(12, e.modulesPerRow),
                        kind: '1P',
                        phase: 'L1',
                        inA: 63,
                    });
                }), children: t('panel.addBusbar') })] }));
}
/** Printable circuit schedule for the inside of the door. */
function LabelSheet() {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const rows = useMemo(() => {
        return project.components
            .filter((c) => {
            const d = getDef(c.type);
            return d?.flags?.overcurrent || d?.flags?.rcd;
        })
            .map((c) => {
            const circuit = project.circuits.find((x) => x.id === c.circuit);
            const wire = project.wires.find((w) => w.from.comp === c.id && w.role !== 'PE' && w.role !== 'N');
            return {
                id: c.id,
                label: c.label ?? '',
                circuit: circuit?.name ?? '—',
                rating: ratingText(c.type, effectiveProps(c.type, c.props)),
                cable: wire ? `${wire.csa} mm² · ${wire.length} m` : '—',
            };
        });
    }, [project]);
    return (_jsxs("div", { className: "p-2.5 text-xs", children: [_jsx("div", { className: "sect-title mb-1", children: t('panel.labelSheet') }), _jsx("div", { className: "faint mb-2 text-[11px]", children: t('panel.labelSheetHint') }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full border-collapse text-[11px]", children: [_jsx("thead", { children: _jsx("tr", { className: "dim", children: [
                                    t('panel.deviceColumn'),
                                    t('panel.circuitColumn'),
                                    t('panel.ratingColumn'),
                                    t('panel.cableColumn'),
                                ].map((h) => (_jsx("th", { className: "border-b pb-1 pr-2 text-left font-medium", style: { borderColor: 'var(--border)' }, children: h }, h))) }) }), _jsx("tbody", { children: rows.map((r) => (_jsxs("tr", { children: [_jsx("td", { className: "py-0.5 pr-2 font-semibold", children: r.label }), _jsx("td", { className: "py-0.5 pr-2", children: r.circuit }), _jsx("td", { className: "py-0.5 pr-2 mono whitespace-nowrap", children: r.rating }), _jsx("td", { className: "py-0.5 mono whitespace-nowrap", children: r.cable })] }, r.id))) })] }) }), _jsxs("button", { className: "btn btn-sm mt-2", onClick: () => window.print(), children: ["\u2399 ", t('action.exportLabels')] })] }));
}
