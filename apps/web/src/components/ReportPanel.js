import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSim } from '../store/sim.js';
import { useUi } from '../store/ui.js';
import { useProject } from '../store/project.js';
import { exportReportPdf } from '../export/pdf.js';
const STATUS_COLOR = {
    pass: 'var(--ok)',
    warn: 'var(--warn)',
    fail: 'var(--fail)',
    na: 'var(--text-faint)',
};
export function ReportPanel() {
    const { t } = useTranslation();
    const report = useSim((s) => s.report);
    const runCheck = useSim((s) => s.runCheck);
    const project = useProject((s) => s.project);
    const ui = useUi();
    const [filter, setFilter] = useState('all');
    useEffect(() => {
        if (!report)
            runCheck();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const findings = useMemo(() => (report ? report.findings.filter((f) => filter === 'all' || f.status === filter) : []), [report, filter]);
    const standards = useMemo(() => {
        const set = new Set();
        for (const f of report?.findings ?? [])
            if (f.ref)
                set.add(f.ref.split(',')[0]);
        return [...set].sort();
    }, [report]);
    if (!report) {
        return (_jsx("div", { className: "flex h-full items-center justify-center", children: _jsx("button", { className: "btn", onClick: () => runCheck(), children: t('report.run') }) }));
    }
    const failed = report.summary.fail > 0;
    return (_jsxs("div", { className: "flex h-full flex-col overflow-hidden", style: { background: 'var(--bg)' }, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b px-3 py-2 no-print", style: { background: 'var(--bg-panel)', borderColor: 'var(--border)' }, children: [_jsxs("div", { children: [_jsx("div", { className: "font-semibold", children: t('report.title') }), _jsx("div", { className: "faint text-[11px]", children: t('report.subtitle') })] }), _jsx("div", { className: "ml-2 flex gap-1", children: ['all', 'fail', 'warn', 'pass', 'na'].map((s) => (_jsxs("button", { className: "btn btn-sm", "data-on": filter === s, onClick: () => setFilter(s), children: [s === 'all' ? t('report.all') : t(`report.${s}`), s !== 'all' && _jsx("span", { className: "faint ml-1", children: report.summary[s] })] }, s))) }), _jsxs("div", { className: "ml-auto flex gap-1", children: [_jsx("button", { className: "btn btn-sm", onClick: () => runCheck(), children: t('action.check') }), _jsx("button", { className: "btn btn-sm", onClick: () => exportReportPdf(project, report, t), children: t('action.exportPdf') }), _jsx("button", { className: "btn btn-sm", onClick: () => window.print(), children: "\u2399" })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-3", children: _jsxs("div", { className: "mx-auto max-w-4xl", children: [_jsxs("div", { className: "mb-3 rounded p-3", style: {
                                background: 'var(--bg-panel)',
                                border: `1px solid ${failed ? 'var(--fail)' : 'var(--ok)'}`,
                            }, children: [_jsx("div", { className: "text-sm font-semibold", style: { color: failed ? 'var(--fail)' : 'var(--ok)' }, children: failed ? t('report.overallFail') : t('report.overallPass') }), _jsx("div", { className: "dim mt-1 text-xs", children: t('report.summary', report.summary) }), _jsxs("div", { className: "faint mt-1 text-[11px]", children: [t('report.project'), ": ", report.projectName, " \u00B7 ", t('report.generatedAt'), ":", ' ', new Date(report.generatedAt).toLocaleString()] })] }), _jsx("ul", { className: "flex flex-col gap-1.5", children: findings.map((f, i) => (_jsx(FindingRow, { f: f, onShow: () => ui.setHighlight(f.components ?? [], f.wires ?? []) }, `${f.rule}-${i}`))) }), standards.length > 0 && (_jsxs("div", { className: "mt-5 rounded p-3 text-xs", style: { background: 'var(--bg-panel)', border: '1px solid var(--border)' }, children: [_jsx("div", { className: "sect-title mb-1", children: t('report.standards') }), _jsx("ul", { className: "dim flex flex-col gap-0.5", children: standards.map((s) => (_jsx("li", { children: s }, s))) }), _jsx("div", { className: "faint mt-2 text-[11px]", children: t('report.toVerifyHint') })] }))] }) })] }));
}
function FindingRow({ f, onShow }) {
    const { t } = useTranslation();
    const ui = useUi();
    const vars = { ...(f.vars ?? {}) };
    // Appliance and circuit-kind variables carry keys, not display text.
    if (typeof vars.appliance === 'string')
        vars.appliance = t(`comp.${applianceType(vars.appliance)}`);
    if (typeof vars.kind === 'string')
        vars.kind = t(`circuitKind.${vars.kind}`, { defaultValue: vars.kind });
    return (_jsx("li", { className: "rounded p-2", style: { background: 'var(--bg-panel)', border: '1px solid var(--border)' }, children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx("span", { className: "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", style: { background: STATUS_COLOR[f.status], color: '#fff' }, children: t(`report.${f.status}`) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-xs font-semibold", children: t(`rule.${f.rule}.title`, { defaultValue: f.rule }) }), _jsx("div", { className: "mt-0.5 text-xs", children: t(f.key, { ...vars, defaultValue: f.key }) }), f.ref && (_jsxs("div", { className: "faint mt-1 text-[11px]", children: [t('report.reference'), ": ", f.ref, f.refToVerify && _jsxs("span", { style: { color: 'var(--warn)' }, children: [" \u00B7 ", t('report.toVerify')] })] }))] }), (f.components?.length || f.wires?.length) && (_jsx("button", { className: "btn btn-sm no-print", onClick: () => {
                        onShow();
                        ui.set('view', 'schematic');
                    }, children: t('report.showOn') }))] }) }));
}
function applianceType(key) {
    const map = {
        cooker: 'cooker3f',
        boiler: 'boiler',
        washingMachine: 'washingMachine',
        dishwasher: 'dishwasher',
        evse: 'evse',
    };
    return map[key] ?? key;
}
