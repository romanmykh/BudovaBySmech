import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDef, effectiveProps } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';
export function StatusBar() {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const results = useSim((s) => s.results);
    const running = useSim((s) => s.running);
    const installed = useMemo(() => project.components.reduce((sum, c) => {
        const def = getDef(c.type);
        if (!def?.flags?.load)
            return sum;
        const p = effectiveProps(c.type, c.props);
        const w = c.type === 'evse' ? Number(p.powerKw) * 1000 : Number(p.watts);
        return sum + (Number.isFinite(w) ? w : 0);
    }, 0), [project.components]);
    const i = results.phaseI;
    const maxI = Math.max(i.L1, i.L2, i.L3);
    const minI = Math.min(i.L1, i.L2, i.L3);
    const imbalance = maxI > 0.05 ? ((maxI - minI) / maxI) * 100 : 0;
    const trippedCount = Object.values(results.state).filter((s) => s?.tripped || s?.blown).length;
    return (_jsxs("div", { className: "flex shrink-0 flex-wrap items-center gap-x-4 gap-y-0.5 border-t px-2 py-1 text-[11px] no-print mono", style: { background: 'var(--bg-panel)', borderColor: 'var(--border)' }, children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-2 w-2 rounded-full", style: { background: running ? 'var(--ok)' : 'var(--text-faint)' } }), running ? t('status.running') : t('status.stopped')] }), _jsxs("span", { className: "dim", children: [t('status.simTime'), " ", _jsx("b", { className: "text-[var(--text)]", children: formatTime(results.t) })] }), _jsxs("span", { className: "dim", children: [t('status.perPhase'), ' ', _jsx("b", { className: "text-[var(--live-l1)]", children: i.L1.toFixed(1) }), "/", _jsx("b", { className: "text-[var(--live-l2)]", children: i.L2.toFixed(1) }), "/", _jsx("b", { className: "text-[var(--live-l3)]", children: i.L3.toFixed(1) }), " A"] }), _jsxs("span", { className: "dim", children: [t('status.imbalance'), " ", _jsxs("b", { className: "text-[var(--text)]", children: [imbalance.toFixed(0), " %"] })] }), _jsxs("span", { className: "dim", children: [t('status.simultaneous'), " ", _jsxs("b", { className: "text-[var(--text)]", children: [(results.totalP / 1000).toFixed(2), " kW"] })] }), _jsxs("span", { className: "dim", children: [t('status.installed'), " ", _jsxs("b", { className: "text-[var(--text)]", children: [(installed / 1000).toFixed(2), " kW"] })] }), results.maxTouchVoltage > 25 && (_jsxs("span", { style: { color: 'var(--fail)' }, children: [t('status.touchVoltage'), " ", _jsxs("b", { children: [results.maxTouchVoltage.toFixed(0), " V"] })] })), results.bodyCurrent > 0.0005 && (_jsxs("span", { style: { color: 'var(--fail)' }, children: [t('status.bodyCurrent'), " ", _jsxs("b", { children: [(results.bodyCurrent * 1000).toFixed(1), " mA"] })] })), trippedCount > 0 && (_jsx("span", { style: { color: 'var(--warn)' }, children: t('status.tripped', { count: trippedCount }) }))] }));
}
function formatTime(s) {
    if (s < 60)
        return `${s.toFixed(2)} s`;
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0)
        return `${h}:${String(m % 60).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
