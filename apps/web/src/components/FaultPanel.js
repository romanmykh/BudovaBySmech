import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { terminalsOf, uid } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';
const KINDS = [
    'shortLN', 'shortLPE', 'shortLL', 'earthFault', 'touch', 'insulation',
    'lossPE', 'lossPhase', 'surge', 'cableDamage', 'arc', 'dcResidual',
];
export function FaultPanel() {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const selection = useProject((s) => s.selection);
    const faults = useSim((s) => s.faults);
    const sim = useSim();
    const [kind, setKind] = useState('shortLN');
    const [target, setTarget] = useState('');
    const [terminal, setTerminal] = useState('');
    const [terminal2, setTerminal2] = useState('');
    const [resistance, setResistance] = useState(0.01);
    const [bodyR, setBodyR] = useState(1000);
    const [standR, setStandR] = useState(1000);
    const [surgeV, setSurgeV] = useState(4000);
    const [arcA, setArcA] = useState(5);
    const [dcMa, setDcMa] = useState(10);
    const [wire, setWire] = useState('');
    const effectiveTarget = target || selection[0] || project.components[0]?.id || '';
    const targetComp = project.components.find((c) => c.id === effectiveTarget);
    const terminals = useMemo(() => (targetComp ? terminalsOf(targetComp.type, targetComp.props) : []), [targetComp]);
    const needsTerminal = ['shortLN', 'shortLPE', 'shortLL', 'earthFault', 'touch', 'insulation', 'lossPhase'].includes(kind);
    const needsSecond = ['shortLN', 'shortLPE', 'shortLL'].includes(kind);
    const needsWire = kind === 'cableDamage' || kind === 'lossPE';
    const add = () => {
        if (!effectiveTarget)
            return;
        sim.addFault({
            id: uid('f'),
            kind,
            target: effectiveTarget,
            terminal: needsTerminal ? terminal || undefined : undefined,
            terminal2: needsSecond ? terminal2 || undefined : undefined,
            resistance: ['shortLN', 'shortLPE', 'shortLL', 'earthFault', 'insulation'].includes(kind)
                ? resistance
                : kind === 'cableDamage' || kind === 'lossPE'
                    ? 1e9
                    : undefined,
            bodyResistance: kind === 'touch' ? bodyR : undefined,
            standingResistance: kind === 'touch' ? standR : undefined,
            surgeV: kind === 'surge' ? surgeV : undefined,
            arcCurrent: kind === 'arc' ? arcA : undefined,
            dcResidual: kind === 'dcResidual' ? dcMa / 1000 : undefined,
            wire: needsWire ? wire || undefined : undefined,
            enabled: true,
        });
    };
    return (_jsxs("div", { className: "flex h-full flex-col overflow-y-auto p-2.5 text-xs", children: [_jsx("div", { className: "sect-title mb-2", children: t('fault.title') }), _jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('prop.kind') }), _jsx("select", { value: kind, onChange: (e) => setKind(e.target.value), children: KINDS.map((k) => (_jsx("option", { value: k, children: t(`fault.kind.${k}`) }, k))) })] }), _jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('fault.target') }), _jsx("select", { value: effectiveTarget, onChange: (e) => setTarget(e.target.value), children: project.components.map((c) => (_jsx("option", { value: c.id, children: (c.label ? `${c.label} — ` : '') + t(`comp.${c.type}`) }, c.id))) })] }), needsTerminal && (_jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('fault.terminal') }), _jsxs("select", { value: terminal, onChange: (e) => setTerminal(e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), kind === 'touch' && _jsx("option", { value: "::case", children: t('prop.classI') }), terminals.map((x) => (_jsx("option", { value: x.id, children: x.mark ?? x.id }, x.id)))] })] })), needsSecond && (_jsxs("label", { className: "mb-1.5 block", children: [_jsxs("span", { className: "dim text-[11px]", children: [t('fault.terminal'), " 2"] }), _jsxs("select", { value: terminal2, onChange: (e) => setTerminal2(e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), terminals.map((x) => (_jsx("option", { value: x.id, children: x.mark ?? x.id }, x.id)))] })] })), needsWire && (_jsxs("label", { className: "mb-1.5 block", children: [_jsx("span", { className: "dim text-[11px]", children: t('fault.wire') }), _jsxs("select", { value: wire, onChange: (e) => setWire(e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), project.wires
                                .filter((w) => !effectiveTarget || w.from.comp === effectiveTarget || w.to.comp === effectiveTarget)
                                .map((w) => (_jsx("option", { value: w.id, children: `${w.role} ${w.csa} mm² · ${w.length} m` }, w.id)))] })] })), ['shortLN', 'shortLPE', 'shortLL', 'earthFault', 'insulation'].includes(kind) && (_jsxs("label", { className: "mb-1.5 block", children: [_jsxs("span", { className: "dim text-[11px]", children: [t('fault.resistance'), " [", t('unit.ohm'), "]"] }), _jsx("input", { type: "number", min: 0.001, step: 0.01, value: resistance, onChange: (e) => setResistance(Number(e.target.value)) })] })), kind === 'touch' && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "mb-1.5 block", children: [_jsxs("span", { className: "dim text-[11px]", children: [t('fault.bodyResistance'), " [", t('unit.ohm'), "]"] }), _jsx("input", { type: "number", min: 200, step: 100, value: bodyR, onChange: (e) => setBodyR(Number(e.target.value)) })] }), _jsxs("label", { className: "mb-1.5 block", children: [_jsxs("span", { className: "dim text-[11px]", children: [t('fault.standingResistance'), " [", t('unit.ohm'), "]"] }), _jsx("input", { type: "number", min: 0, step: 100, value: standR, onChange: (e) => setStandR(Number(e.target.value)) })] })] })), kind === 'surge' && (_jsxs("label", { className: "mb-1.5 block", children: [_jsxs("span", { className: "dim text-[11px]", children: [t('fault.surgeV'), " [", t('unit.V'), "]"] }), _jsx("input", { type: "number", min: 500, step: 500, value: surgeV, onChange: (e) => setSurgeV(Number(e.target.value)) })] })), kind === 'arc' && (_jsxs("label", { className: "mb-1.5 block", children: [_jsxs("span", { className: "dim text-[11px]", children: [t('fault.arcCurrent'), " [", t('unit.A'), "]"] }), _jsx("input", { type: "number", min: 0.5, step: 0.5, value: arcA, onChange: (e) => setArcA(Number(e.target.value)) })] })), kind === 'dcResidual' && (_jsxs("label", { className: "mb-1.5 block", children: [_jsxs("span", { className: "dim text-[11px]", children: [t('fault.dcResidual'), " [", t('unit.mA'), "]"] }), _jsx("input", { type: "number", min: 1, step: 1, value: dcMa, onChange: (e) => setDcMa(Number(e.target.value)) })] })), _jsx("button", { className: "btn mt-1", onClick: add, children: t('fault.add') }), _jsx("div", { className: "sect-title mb-1 mt-4", children: t('fault.active') }), !faults.length && _jsx("div", { className: "dim", children: t('fault.none') }), _jsx("ul", { className: "flex flex-col gap-1", children: faults.map((f) => {
                    const comp = project.components.find((c) => c.id === f.target);
                    return (_jsxs("li", { className: "flex items-center gap-2 rounded px-1.5 py-1", style: { background: 'var(--bg-sunken)' }, children: [_jsxs("span", { className: "flex-1 truncate", children: [_jsx("b", { children: t(`fault.kind.${f.kind}`) }), _jsxs("span", { className: "dim", children: [" \u00B7 ", comp?.label || t(`comp.${comp?.type ?? 'genericLoad'}`)] })] }), _jsx("button", { className: "btn btn-sm btn-danger", onClick: () => sim.removeFault(f.id), children: "\u2715" })] }, f.id));
                }) }), faults.length > 0 && (_jsx("button", { className: "btn btn-sm mt-2 self-start", onClick: () => sim.clearFaults(), children: t('action.clear') }))] }));
}
