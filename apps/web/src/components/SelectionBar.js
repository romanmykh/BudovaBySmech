import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useProject } from '../store/project.js';
/**
 * Alignment and grouping tools, shown only while several items are selected so
 * that they do not take up room in the main toolbar the rest of the time.
 */
export function SelectionBar() {
    const { t } = useTranslation();
    const selection = useProject((s) => s.selection);
    const store = useProject;
    if (selection.length < 2)
        return null;
    const align = (edge) => () => store.getState().alignSelection(edge);
    return (_jsxs("div", { className: "fade-in absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1 rounded px-1.5 py-1 shadow-md no-print", style: { background: 'var(--bg-panel)', border: '1px solid var(--border)' }, children: [_jsx("span", { className: "faint px-1 text-[11px]", children: t('inspector.multiple', { count: selection.length }) }), _jsx("button", { className: "btn btn-sm", onClick: align('left'), title: t('action.alignLeft'), children: "\u2310" }), _jsx("button", { className: "btn btn-sm", onClick: align('right'), title: t('action.alignRight'), children: "\u00AC" }), _jsx("button", { className: "btn btn-sm", onClick: align('top'), title: t('action.alignTop'), children: "\u2303" }), _jsx("button", { className: "btn btn-sm", onClick: align('bottom'), title: t('action.alignBottom'), children: "\u2304" }), _jsx("span", { className: "mx-0.5 h-4 w-px", style: { background: 'var(--border)' } }), _jsx("button", { className: "btn btn-sm", disabled: selection.length < 3, onClick: () => store.getState().distributeSelection('h'), title: t('action.distributeH'), children: "\u2194" }), _jsx("button", { className: "btn btn-sm", disabled: selection.length < 3, onClick: () => store.getState().distributeSelection('v'), title: t('action.distributeV'), children: "\u2195" }), _jsx("span", { className: "mx-0.5 h-4 w-px", style: { background: 'var(--border)' } }), _jsx("button", { className: "btn btn-sm", onClick: () => store.getState().groupSelection(), title: "Ctrl+G", children: t('action.group') }), _jsx("button", { className: "btn btn-sm", onClick: () => store.getState().ungroupSelection(), title: "Ctrl+Shift+G", children: t('action.ungroup') }), _jsx("span", { className: "mx-0.5 h-4 w-px", style: { background: 'var(--border)' } }), _jsx("button", { className: "btn btn-sm", onClick: () => store.getState().duplicateSelection(), title: "Ctrl+D", children: t('action.duplicate') }), _jsx("button", { className: "btn btn-sm btn-danger", onClick: () => store.getState().deleteSelection(), title: "Del", children: t('action.delete') })] }));
}
