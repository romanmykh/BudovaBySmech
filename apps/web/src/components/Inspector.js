import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDef, effectiveProps, CSA_VALUES, } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';
import { terminalPositions } from '../canvas/geometry.js';
import { CircuitsPanel } from './CircuitsPanel.js';
const ROLES = ['L1', 'L2', 'L3', 'N', 'PE', 'PEN', 'CTRL', 'ELV+', 'ELV-'];
const METHODS = ['A1', 'A2', 'B1', 'B2', 'C', 'E'];
export function Inspector() {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const selection = useProject((s) => s.selection);
    const selectedWires = useProject((s) => s.selectedWires);
    const selectedAnnotations = useProject((s) => s.selectedAnnotations);
    if (selectedAnnotations.length === 1) {
        const note = project.annotations.find((a) => a.id === selectedAnnotations[0]);
        if (note)
            return _jsx(AnnotationInspector, { note: note });
    }
    if (selectedWires.length === 1) {
        const wire = project.wires.find((w) => w.id === selectedWires[0]);
        if (wire)
            return _jsx(WireInspector, { wire: wire });
    }
    if (selection.length === 1) {
        const comp = project.components.find((c) => c.id === selection[0]);
        if (comp)
            return _jsx(ComponentInspector, { comp: comp });
    }
    if (selection.length > 1) {
        return (_jsxs("div", { className: "p-3 text-xs", children: [_jsx("div", { className: "sect-title mb-2", children: t('inspector.title') }), _jsx("div", { className: "dim", children: t('inspector.multiple', { count: selection.length }) })] }));
    }
    return (_jsxs("div", { className: "flex h-full flex-col overflow-y-auto text-xs", children: [_jsxs("div", { className: "p-3", children: [_jsx("div", { className: "sect-title mb-2", children: t('inspector.title') }), _jsx("div", { className: "dim", children: t('inspector.nothing') })] }), _jsx(CircuitsPanel, {})] }));
}
function AnnotationInspector({ note }) {
    const { t } = useTranslation();
    const update = useProject((s) => s.updateAnnotation);
    const remove = useProject((s) => s.deleteSelection);
    return (_jsxs("div", { className: "flex h-full flex-col overflow-y-auto p-2.5 text-xs", children: [_jsx("div", { className: "sect-title mb-2", children: t('annotation.title') }), _jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('annotation.text') }), _jsx("textarea", { rows: 3, autoFocus: true, value: note.text ?? '', onChange: (e) => update(note.id, { text: e.target.value }) })] }), _jsx(Row, { label: t('annotation.fontSize'), children: _jsx("input", { type: "number", min: 8, max: 48, value: note.fontSize ?? 13, onChange: (e) => update(note.id, { fontSize: Number(e.target.value) }) }) }), _jsx(Row, { label: t('prop.color'), children: _jsx("input", { type: "color", className: "h-6 w-full rounded border", value: note.color ?? '#777777', onChange: (e) => update(note.id, { color: e.target.value }) }) }), _jsx("button", { className: "btn btn-sm btn-danger mt-2 self-start", onClick: () => remove(), children: t('action.delete') })] }));
}
function Row({ label, children }) {
    return (_jsxs("label", { className: "mb-1.5 grid grid-cols-[1fr_1.15fr] items-center gap-2", children: [_jsx("span", { className: "dim truncate text-[11px]", title: label, children: label }), children] }));
}
function ComponentInspector({ comp }) {
    const { t } = useTranslation();
    const def = getDef(comp.type);
    const props = effectiveProps(comp.type, comp.props);
    const setProps = useProject((s) => s.setProps);
    const setComponent = useProject((s) => s.setComponent);
    const project = useProject((s) => s.project);
    const results = useSim((s) => s.results);
    const operate = useSim((s) => s.operate);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const meas = results.meas[comp.id] ?? {};
    const state = results.state[comp.id] ?? {};
    const visible = (def?.props ?? []).filter((p) => !p.when || p.when(props));
    const basic = visible.filter((p) => !p.advanced);
    const advanced = visible.filter((p) => p.advanced);
    const terminals = terminalPositions(comp);
    const connected = new Set(project.wires.flatMap((w) => [
        w.from.comp === comp.id ? w.from.terminal : '',
        w.to.comp === comp.id ? w.to.terminal : '',
    ]));
    const renderProp = (spec) => {
        const value = props[spec.key];
        const label = t(spec.i18n ?? `prop.${spec.key}`);
        const onChange = (v) => setProps(comp.id, { [spec.key]: v });
        if (spec.type === 'bool') {
            return (_jsx(Row, { label: label, children: _jsx("input", { type: "checkbox", checked: !!value, onChange: (e) => onChange(e.target.checked) }) }, spec.key));
        }
        if (spec.type === 'select') {
            return (_jsx(Row, { label: label, children: _jsx("select", { value: String(value), onChange: (e) => {
                        const raw = e.target.value;
                        const opt = spec.options?.find((o) => String(o.value) === raw);
                        onChange(opt ? opt.value : raw);
                    }, children: (spec.options ?? []).map((o) => (_jsx("option", { value: String(o.value), children: optionLabel(t, spec.key, o.value, spec.unit) }, String(o.value)))) }) }, spec.key));
        }
        if (spec.type === 'number') {
            return (_jsx(Row, { label: spec.unit ? `${label} [${t(unitKey(spec.unit))}]` : label, children: _jsx("input", { type: "number", value: Number(value ?? 0), min: spec.min, max: spec.max, step: spec.step ?? 1, onChange: (e) => onChange(Number(e.target.value)) }) }, spec.key));
        }
        return (_jsx(Row, { label: label, children: _jsx("input", { type: "text", value: String(value ?? ''), onChange: (e) => onChange(e.target.value) }) }, spec.key));
    };
    return (_jsxs("div", { className: "flex h-full flex-col overflow-y-auto p-2.5 text-xs", children: [_jsx("div", { className: "sect-title mb-1", children: t('inspector.component') }), _jsx("div", { className: "mb-2 font-medium", children: t(`comp.${comp.type}`) }), _jsx(Row, { label: t('prop.label'), children: _jsx("input", { type: "text", value: comp.label ?? '', onChange: (e) => setComponent(comp.id, { label: e.target.value }) }) }), _jsx(Row, { label: t('prop.circuit'), children: _jsxs("select", { value: comp.circuit ?? '', onChange: (e) => setComponent(comp.id, { circuit: e.target.value || undefined }), children: [_jsx("option", { value: "", children: "\u2014" }), project.circuits.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] }) }), _jsx(Row, { label: t('prop.location'), children: _jsx("input", { type: "text", value: comp.location ?? '', onChange: (e) => setComponent(comp.id, { location: e.target.value }) }) }), basic.length > 0 && _jsx("div", { className: "sect-title mb-1 mt-3", children: t('inspector.title') }), basic.map(renderProp), advanced.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("button", { className: "btn btn-sm mt-2 self-start", onClick: () => setShowAdvanced((v) => !v), children: [showAdvanced ? '▾' : '▸', " ", t('prop.advanced')] }), showAdvanced && _jsx("div", { className: "mt-2", children: advanced.map(renderProp) })] })), (state.closed !== undefined || state.tripped !== undefined || state.blown !== undefined) && (_jsxs(_Fragment, { children: [_jsx("div", { className: "sect-title mb-1 mt-3", children: t('inspector.state') }), _jsxs("div", { className: "mb-2 flex flex-wrap gap-1", children: [_jsx("span", { className: "rounded px-1.5 py-0.5", style: {
                                    background: state.tripped || state.blown ? 'var(--fail)' : state.closed ? 'var(--ok)' : 'var(--bg-sunken)',
                                    color: state.tripped || state.blown || state.closed ? '#fff' : 'var(--text-dim)',
                                }, children: state.blown
                                    ? t('inspector.state.blown')
                                    : state.tripped
                                        ? t('inspector.state.tripped')
                                        : state.closed
                                            ? t('inspector.state.closed')
                                            : t('inspector.state.open') }), state.degraded && (_jsx("span", { className: "rounded px-1.5 py-0.5", style: { background: 'var(--fail)', color: '#fff' }, children: t('inspector.state.degraded') }))] }), _jsxs("div", { className: "flex flex-wrap gap-1", children: [_jsx("button", { className: "btn btn-sm", onClick: () => operate(comp.id, 'close'), children: t('inspector.state.closed') }), _jsx("button", { className: "btn btn-sm", onClick: () => operate(comp.id, 'open'), children: t('inspector.state.open') }), _jsx("button", { className: "btn btn-sm", onClick: () => operate(comp.id, 'reset'), children: t('action.reconnect') })] }), typeof meas.thermalLoad === 'number' && meas.thermalLoad > 0.001 && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "dim mb-0.5 text-[11px]", children: t('inspector.thermalLoad') }), _jsx("div", { className: "h-1.5 w-full rounded", style: { background: 'var(--bg-sunken)' }, children: _jsx("div", { className: "h-full rounded", style: {
                                        width: `${Math.min(100, meas.thermalLoad * 100)}%`,
                                        background: meas.thermalLoad > 0.8 ? 'var(--fail)' : 'var(--warn)',
                                    } }) }), typeof meas.tripIn === 'number' && Number.isFinite(meas.tripIn) && (_jsxs("div", { className: "faint mt-0.5 text-[11px] mono", children: [t('inspector.tripIn'), ": ", formatSeconds(meas.tripIn)] }))] }))] })), Object.keys(meas).length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "sect-title mb-1 mt-3", children: t('inspector.measurements') }), _jsx("table", { className: "w-full mono text-[11px]", children: _jsx("tbody", { children: Object.entries(meas)
                                .filter(([k]) => !['thermalLoad', 'tripIn', 'closed', 'brightness', 'classII'].includes(k))
                                .map(([k, v]) => (_jsxs("tr", { children: [_jsx("td", { className: "dim pr-2", children: k }), _jsx("td", { className: "text-right", children: formatMeas(k, v) })] }, k))) }) })] })), _jsx("div", { className: "sect-title mb-1 mt-3", children: t('inspector.terminals') }), _jsx("table", { className: "w-full text-[11px]", children: _jsx("tbody", { children: terminals.map((tp) => (_jsxs("tr", { children: [_jsx("td", { className: "mono dim pr-2", children: tp.def.mark ?? tp.id }), _jsxs("td", { className: "mono", children: [(results.nodeV[`${comp.id}:${tp.id}`] ?? 0).toFixed(1), " V"] }), _jsx("td", { className: "faint text-right", children: connected.has(tp.id) ? t('inspector.connected') : t('inspector.free') })] }, tp.id))) }) })] }));
}
function WireInspector({ wire }) {
    const { t } = useTranslation();
    const setWire = useProject((s) => s.setWire);
    const project = useProject((s) => s.project);
    const results = useSim((s) => s.results);
    const current = results.wireI[wire.id] ?? 0;
    return (_jsxs("div", { className: "flex h-full flex-col overflow-y-auto p-2.5 text-xs", children: [_jsx("div", { className: "sect-title mb-2", children: t('inspector.wire') }), _jsx(Row, { label: t('prop.role'), children: _jsx("select", { value: wire.role, onChange: (e) => setWire(wire.id, { role: e.target.value }), children: ROLES.map((r) => (_jsx("option", { value: r, children: t(`role.${r}`) }, r))) }) }), _jsx(Row, { label: `${t('prop.csa')} [${t('unit.mm2')}]`, children: _jsx("select", { value: wire.csa, onChange: (e) => setWire(wire.id, { csa: Number(e.target.value) }), children: CSA_VALUES.map((c) => (_jsx("option", { value: c, children: c }, c))) }) }), _jsx(Row, { label: `${t('prop.length')} [${t('unit.m')}]`, children: _jsx("input", { type: "number", min: 0, step: 0.5, value: wire.length, onChange: (e) => setWire(wire.id, { length: Number(e.target.value) }) }) }), _jsx(Row, { label: t('prop.material'), children: _jsxs("select", { value: wire.material, onChange: (e) => setWire(wire.id, { material: e.target.value }), children: [_jsx("option", { value: "Cu", children: t('opt.material.Cu') }), _jsx("option", { value: "Al", children: t('opt.material.Al') })] }) }), _jsx(Row, { label: t('prop.installMethod'), children: _jsx("select", { value: wire.installMethod ?? project.settings.defaultInstallMethod, onChange: (e) => setWire(wire.id, { installMethod: e.target.value }), children: METHODS.map((m) => (_jsx("option", { value: m, children: m }, m))) }) }), _jsx(Row, { label: t('prop.loadedConductors'), children: _jsxs("select", { value: wire.loadedConductors ?? 2, onChange: (e) => setWire(wire.id, { loadedConductors: Number(e.target.value) }), children: [_jsx("option", { value: 2, children: "2" }), _jsx("option", { value: 3, children: "3" })] }) }), _jsx(Row, { label: t('prop.circuit'), children: _jsxs("select", { value: wire.circuit ?? '', onChange: (e) => setWire(wire.id, { circuit: e.target.value || undefined }), children: [_jsx("option", { value: "", children: "\u2014" }), project.circuits.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] }) }), _jsx(Row, { label: t('prop.color'), children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("input", { type: "color", className: "h-6 w-10 rounded border", value: wire.color ?? '#888888', onChange: (e) => setWire(wire.id, { color: e.target.value }) }), _jsx("button", { className: "btn btn-sm", onClick: () => setWire(wire.id, { color: null }), children: t('action.reset') })] }) }), _jsx("div", { className: "sect-title mb-1 mt-3", children: t('inspector.measurements') }), _jsx("table", { className: "w-full mono text-[11px]", children: _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { className: "dim", children: "I" }), _jsx("td", { className: "text-right", children: current >= 1 ? `${current.toFixed(2)} A` : `${(current * 1000).toFixed(1)} mA` })] }) }) })] }));
}
function unitKey(unit) {
    const map = {
        A: 'unit.A', V: 'unit.V', W: 'unit.W', kW: 'unit.kW', VA: 'unit.VA', mA: 'unit.mA',
        'Ω': 'unit.ohm', m: 'unit.m', 'mm²': 'unit.mm2', s: 'unit.s', Hz: 'unit.Hz',
        '%': 'unit.percent', '°C': 'unit.degC', lx: 'unit.lx',
    };
    return map[unit] ?? 'unit.A';
}
function optionLabel(t, key, value, unit) {
    const specific = `opt.${key}.${String(value)}`;
    const translated = t(specific);
    if (translated !== specific)
        return translated;
    return unit ? `${value} ${t(unitKey(unit))}` : String(value);
}
export function formatSeconds(s) {
    if (!Number.isFinite(s))
        return '—';
    if (s < 1)
        return `${Math.round(s * 1000)} ms`;
    if (s < 90)
        return `${s.toFixed(1)} s`;
    const m = Math.floor(s / 60);
    return `${m} min ${Math.round(s - m * 60)} s`;
}
function formatMeas(key, v) {
    if (key.startsWith('U'))
        return `${v.toFixed(1)} V`;
    if (key.startsWith('I'))
        return v >= 1 ? `${v.toFixed(2)} A` : `${(v * 1000).toFixed(1)} mA`;
    if (key === 'P')
        return v >= 1000 ? `${(v / 1000).toFixed(2)} kW` : `${v.toFixed(0)} W`;
    if (key === 'E')
        return `${(v / 1000).toFixed(3)} kWh`;
    if (key === 'Idelta' || key === 'IdeltaDC')
        return `${(v * 1000).toFixed(1)} mA`;
    if (key === 'remaining' || key === 'timer')
        return formatSeconds(v);
    return v.toFixed(2);
}
