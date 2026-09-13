import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSim } from '../store/sim.js';
import { useProject } from '../store/project.js';
const LEVEL_COLOR = {
    info: 'var(--text-dim)',
    warn: 'var(--warn)',
    danger: 'var(--fail)',
    trip: 'var(--accent)',
};
export function LogPanel() {
    const { t } = useTranslation();
    const log = useSim((s) => s.log);
    const clearLog = useSim((s) => s.clearLog);
    const select = useProject((s) => s.select);
    const endRef = useRef(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'end' });
    }, [log.length]);
    return (_jsxs("div", { className: "flex h-full flex-col text-xs", children: [_jsxs("div", { className: "flex items-center justify-between border-b px-2.5 py-1.5", style: { borderColor: 'var(--border)' }, children: [_jsx("span", { className: "sect-title", children: t('log.title') }), _jsx("button", { className: "btn btn-sm", onClick: clearLog, children: t('action.clear') })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-1.5", children: [!log.length && _jsx("div", { className: "dim p-2 text-center", children: t('log.empty') }), _jsx("ul", { className: "flex flex-col gap-0.5", children: log.map((e, i) => (_jsxs("li", { className: "cursor-pointer rounded px-1.5 py-1 hover:bg-[var(--bg-hover)]", onClick: () => e.comp && select([e.comp]), children: [_jsxs("div", { className: "flex gap-2", children: [_jsxs("span", { className: "faint shrink-0 mono", children: [e.t.toFixed(2), " s"] }), _jsx("span", { style: { color: LEVEL_COLOR[e.level] ?? 'var(--text)' }, children: t(e.key, { ...(e.vars ?? {}), defaultValue: e.key }) })] }), e.ref && (_jsxs("div", { className: "faint pl-[52px] text-[10px]", children: [e.ref, e.refToVerify ? ` · ${t('report.toVerify')}` : ''] }))] }, `${e.t}-${i}`))) }), _jsx("div", { ref: endRef })] })] }));
}
