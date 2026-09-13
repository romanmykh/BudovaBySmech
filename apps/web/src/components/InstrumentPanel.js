import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { terminalsOf, measureVoltage, measureClamp, measureInsulation, measureLoop, testRcd, measureRotation, testSocket, getDef, } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';
export function InstrumentPanel() {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const sim = useSim((s) => s.simulator());
    const tick = useSim((s) => s.tick);
    const [tool, setTool] = useState('multimeter');
    const [a, setA] = useState({ comp: '', terminal: '' });
    const [b, setB] = useState({ comp: '', terminal: '' });
    const [wireId, setWireId] = useState('');
    const [socketId, setSocketId] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [testV, setTestV] = useState(500);
    const [result, setResult] = useState(null);
    const sockets = useMemo(() => project.components.filter((c) => getDef(c.type)?.flags?.socket), [project.components]);
    const run = () => {
        try {
            switch (tool) {
                case 'multimeter': {
                    if (!a.comp || !b.comp)
                        return;
                    const v = measureVoltage(sim, a, b);
                    setResult(_jsx(Value, { label: t('inst.reading'), value: `${v.toFixed(2)} V` }));
                    break;
                }
                case 'clamp': {
                    const i = measureClamp(sim, wireId);
                    setResult(_jsx(Value, { label: t('inst.reading'), value: i >= 1 ? `${i.toFixed(3)} A` : `${(i * 1000).toFixed(1)} mA` }));
                    break;
                }
                case 'insulation': {
                    if (!a.comp || !b.comp)
                        return;
                    const r = measureInsulation(sim, a, b, testV);
                    setResult(_jsxs(_Fragment, { children: [_jsx(Value, { label: t('inst.insulation'), value: r.megohms > 999 ? '> 999 MΩ' : `${r.megohms.toFixed(1)} MΩ` }), _jsx(Verdict, { ok: r.pass }), _jsxs("div", { className: "faint mt-1", children: [t('inst.limit'), ": ", (r.limit / 1e6).toFixed(0), " M\u03A9 @ ", r.testVoltage, " V"] })] }));
                    break;
                }
                case 'loop': {
                    if (!a.comp || !b.comp)
                        return;
                    const r = measureLoop(sim, a, b, 'L-PE');
                    setResult(_jsxs(_Fragment, { children: [_jsx(Value, { label: t('inst.zs'), value: Number.isFinite(r.zs) ? `${r.zs.toFixed(3)} Ω` : '∞' }), _jsx(Value, { label: t('inst.ipf'), value: `${r.ipf.toFixed(0)} A` })] }));
                    break;
                }
                case 'rcd': {
                    if (!a.comp)
                        return;
                    const r = testRcd(sim, a, multiplier);
                    if (!r.found) {
                        setResult(_jsx("div", { style: { color: 'var(--fail)' }, children: t('inst.noRcd') }));
                        break;
                    }
                    setResult(_jsxs(_Fragment, { children: [_jsx(Value, { label: t('prop.idn'), value: `${Math.round((r.idn ?? 0) * 1000)} mA ${r.type}` }), _jsx(Value, { label: t('inst.tripTime'), value: r.tripMs === null ? '—' : `${r.tripMs} ms` }), r.limitMs !== null && _jsxs("div", { className: "faint", children: [t('inst.limit'), ": ", r.limitMs, " ms"] }), r.tripCurrentMa && _jsx(Value, { label: t('inst.tripCurrent'), value: `${r.tripCurrentMa} mA` }), r.note && _jsx("div", { className: "dim mt-1", children: t(`inst.${r.note}`, { defaultValue: r.note }) }), _jsx(Verdict, { ok: r.pass })] }));
                    break;
                }
                case 'rotation': {
                    const supply = project.components.find((c) => c.type === 'supply');
                    if (!supply)
                        return;
                    const r = measureRotation(sim, { comp: supply.id, terminal: 'L1' }, { comp: supply.id, terminal: 'L2' }, { comp: supply.id, terminal: 'L3' });
                    setResult(_jsxs(_Fragment, { children: [_jsx(Value, { label: t('inst.rotation'), value: r.rotation === 'incomplete' ? t('inst.rotation.incomplete') : r.rotation }), _jsx("div", { className: "faint mono mt-1", children: ['L1', 'L2', 'L3'].map((k) => `${k} ${r.voltages[k].toFixed(0)} V`).join(' · ') })] }));
                    break;
                }
                case 'socket': {
                    if (!socketId)
                        return;
                    const r = testSocket(sim, socketId);
                    setResult(_jsxs(_Fragment, { children: [_jsx(Value, { label: "U L-N", value: `${r.uLN.toFixed(1)} V` }), _jsx(Value, { label: "U L-PE", value: `${r.uLPE.toFixed(1)} V` }), _jsx(Value, { label: "U N-PE", value: `${r.uNPE.toFixed(1)} V` }), r.correct ? (_jsx("div", { className: "mt-1", style: { color: 'var(--ok)' }, children: t('inst.socketOk') })) : (_jsx("ul", { className: "mt-1", children: r.faults.map((f) => (_jsx("li", { style: { color: 'var(--fail)' }, children: t(`inst.socket.${f}`, { defaultValue: f }) }, f))) }))] }));
                    break;
                }
            }
        }
        catch (err) {
            setResult(_jsx("div", { style: { color: 'var(--fail)' }, children: String(err.message) }));
        }
    };
    return (_jsxs("div", { className: "flex h-full flex-col overflow-y-auto p-2.5 text-xs", children: [_jsx("div", { className: "sect-title mb-2", children: t('inst.title') }), _jsxs("select", { className: "mb-2", value: tool, onChange: (e) => { setTool(e.target.value); setResult(null); }, children: [_jsx("option", { value: "multimeter", children: t('comp.multimeter') }), _jsx("option", { value: "clamp", children: t('comp.clampMeter') }), _jsx("option", { value: "insulation", children: t('comp.insulationTester') }), _jsx("option", { value: "loop", children: t('comp.loopTester') }), _jsx("option", { value: "rcd", children: t('comp.rcdTester') }), _jsx("option", { value: "rotation", children: t('comp.phaseTester') }), _jsx("option", { value: "socket", children: t('comp.socketTester') })] }), (tool === 'multimeter' || tool === 'insulation' || tool === 'loop' || tool === 'rcd') && (_jsx(ProbePicker, { label: t('inst.probeA'), value: a, onChange: setA })), (tool === 'multimeter' || tool === 'insulation' || tool === 'loop') && (_jsx(ProbePicker, { label: t('inst.probeB'), value: b, onChange: setB })), tool === 'clamp' && (_jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('prop.wireId') }), _jsxs("select", { value: wireId, onChange: (e) => setWireId(e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), project.wires.map((w) => {
                                const from = project.components.find((c) => c.id === w.from.comp);
                                const to = project.components.find((c) => c.id === w.to.comp);
                                return (_jsx("option", { value: w.id, children: `${w.role} ${w.csa} — ${from?.label ?? from?.type ?? '?'} → ${to?.label ?? to?.type ?? '?'}` }, w.id));
                            })] })] })), tool === 'socket' && (_jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('comp.socket16') }), _jsxs("select", { value: socketId, onChange: (e) => setSocketId(e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), sockets.map((s) => (_jsx("option", { value: s.id, children: s.label ?? s.id }, s.id)))] })] })), tool === 'insulation' && (_jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('prop.testV') }), _jsx("select", { value: testV, onChange: (e) => setTestV(Number(e.target.value)), children: [250, 500, 1000].map((v) => (_jsxs("option", { value: v, children: [v, " V"] }, v))) })] })), tool === 'rcd' && (_jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('prop.multiplier') }), _jsx("select", { value: multiplier, onChange: (e) => setMultiplier(Number(e.target.value)), children: [0.5, 1, 2, 5].map((m) => (_jsxs("option", { value: m, children: [m, "\u00D7 I\u0394n"] }, m))) })] })), _jsx("button", { className: "btn mt-1", onClick: run, children: t('inst.measure') }), result && (_jsx("div", { className: "mt-3 rounded p-2", style: { background: 'var(--bg-sunken)' }, children: result }))] }, tick));
}
function ProbePicker({ label, value, onChange, }) {
    const project = useProject((s) => s.project);
    const comp = project.components.find((c) => c.id === value.comp);
    const terms = comp ? terminalsOf(comp.type, comp.props) : [];
    return (_jsxs("div", { className: "mb-1.5", children: [_jsx("span", { className: "dim text-[11px]", children: label }), _jsxs("div", { className: "flex gap-1", children: [_jsxs("select", { value: value.comp, onChange: (e) => onChange({ comp: e.target.value, terminal: '' }), children: [_jsx("option", { value: "", children: "\u2014" }), project.components.map((c) => (_jsx("option", { value: c.id, children: c.label ?? c.id }, c.id)))] }), _jsxs("select", { value: value.terminal, onChange: (e) => onChange({ ...value, terminal: e.target.value }), children: [_jsx("option", { value: "", children: "\u2014" }), terms.map((x) => (_jsx("option", { value: x.id, children: x.mark ?? x.id }, x.id)))] })] })] }));
}
function Value({ label, value }) {
    return (_jsxs("div", { className: "flex items-baseline justify-between gap-2", children: [_jsx("span", { className: "dim", children: label }), _jsx("span", { className: "mono text-sm font-semibold", children: value })] }));
}
function Verdict({ ok }) {
    const { t } = useTranslation();
    return (_jsx("div", { className: "mt-1 font-semibold", style: { color: ok ? 'var(--ok)' : 'var(--fail)' }, children: ok ? t('report.pass') : t('report.fail') }));
}
