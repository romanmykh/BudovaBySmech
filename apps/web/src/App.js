import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Toolbar } from './components/Toolbar.js';
import { StatusBar } from './components/StatusBar.js';
import { LibraryPanel } from './components/LibraryPanel.js';
import { Inspector } from './components/Inspector.js';
import { FaultPanel } from './components/FaultPanel.js';
import { LogPanel } from './components/LogPanel.js';
import { InstrumentPanel } from './components/InstrumentPanel.js';
import { ReportPanel } from './components/ReportPanel.js';
import { Dialogs } from './components/Dialogs.js';
import { SchematicCanvas } from './canvas/SchematicCanvas.js';
import { SelectionBar } from './components/SelectionBar.js';
import { PanelView } from './panel/PanelView.js';
import { useUi } from './store/ui.js';
import { useProject } from './store/project.js';
import { useSim } from './store/sim.js';
import { useAuth, startAutosave } from './store/auth.js';
export function App() {
    const { t } = useTranslation();
    const ui = useUi();
    const view = useUi((s) => s.view);
    const auth = useAuth();
    useEffect(() => {
        void auth.init();
        return startAutosave();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useKeyboardShortcuts();
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(Toolbar, {}), _jsxs("div", { className: "flex min-h-0 flex-1", children: [ui.libraryOpen && view !== 'report' && (_jsx("div", { className: "w-56 shrink-0 border-r no-print", style: { borderColor: 'var(--border)' }, children: _jsx(LibraryPanel, {}) })), _jsxs("div", { className: "relative min-w-0 flex-1", children: [view === 'schematic' && (_jsxs(_Fragment, { children: [_jsx(SchematicCanvas, {}), _jsx(SelectionBar, {})] })), view === 'panel' && _jsx(PanelView, {}), view === 'report' && _jsx(ReportPanel, {})] }), ui.inspectorOpen && view !== 'report' && (_jsxs("div", { className: "flex w-72 shrink-0 flex-col border-l no-print", style: { background: 'var(--bg-panel)', borderColor: 'var(--border)' }, children: [_jsx("div", { className: "flex shrink-0 border-b", style: { borderColor: 'var(--border)' }, children: ['inspector', 'faults', 'instruments', 'log'].map((p) => (_jsx("button", { className: "btn btn-sm min-w-0 flex-1 justify-center truncate !rounded-none !border-0 !px-1 !text-[11px]", "data-on": ui.sidePanel === p, onClick: () => ui.set('sidePanel', p), title: t(p === 'inspector' ? 'inspector.title'
                                        : p === 'faults' ? 'fault.title'
                                            : p === 'instruments' ? 'inst.title'
                                                : 'log.title'), children: _jsx("span", { className: "truncate", children: t(`tab.${p}`) }) }, p))) }), _jsxs("div", { className: "min-h-0 flex-1 overflow-hidden", children: [ui.sidePanel === 'inspector' && _jsx(Inspector, {}), ui.sidePanel === 'faults' && _jsx(FaultPanel, {}), ui.sidePanel === 'instruments' && _jsx(InstrumentPanel, {}), ui.sidePanel === 'log' && _jsx(LogPanel, {})] })] }))] }), _jsx(StatusBar, {}), _jsx(Dialogs, {}), _jsx(Toast, {})] }));
}
function Toast() {
    const toast = useUi((s) => s.toast);
    if (!toast)
        return null;
    return (_jsx("div", { className: "fade-in fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded px-3 py-1.5 text-xs shadow-lg no-print", style: {
            background: 'var(--bg-panel)',
            border: `1px solid ${toast.kind === 'error' ? 'var(--fail)' : 'var(--border)'}`,
            color: toast.kind === 'error' ? 'var(--fail)' : 'var(--text)',
        }, children: toast.text }));
}
function useKeyboardShortcuts() {
    useEffect(() => {
        const onKey = (e) => {
            const target = e.target;
            const typing = target &&
                (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable ||
                    target.tagName === 'SELECT');
            const proj = useProject.getState();
            const ui = useUi.getState();
            const mod = e.ctrlKey || e.metaKey;
            if (mod && e.key.toLowerCase() === 's') {
                e.preventDefault();
                void useAuth.getState().save(true);
                return;
            }
            if (typing)
                return;
            if (mod && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey)
                    proj.redo();
                else
                    proj.undo();
                return;
            }
            if (mod && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                proj.redo();
                return;
            }
            if (mod && e.key.toLowerCase() === 'c') {
                proj.copySelection();
                return;
            }
            if (mod && e.key.toLowerCase() === 'v') {
                proj.paste();
                return;
            }
            if (mod && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                proj.duplicateSelection();
                return;
            }
            if (mod && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                proj.select(proj.project.components.map((c) => c.id));
                return;
            }
            if (mod && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                if (e.shiftKey)
                    proj.ungroupSelection();
                else
                    proj.groupSelection();
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                proj.deleteSelection();
                return;
            }
            if (e.key === ' ') {
                e.preventDefault();
                useSim.getState().toggle();
                return;
            }
            switch (e.key.toLowerCase()) {
                case 'w':
                    ui.set('mode', 'wire');
                    break;
                case 'v':
                    ui.set('mode', 'select');
                    break;
                case 'h':
                    ui.set('mode', 'pan');
                    break;
                case 'r':
                    proj.rotateSelection();
                    break;
                case 'l':
                    ui.set('libraryOpen', !ui.libraryOpen);
                    break;
                case 'i':
                    ui.set('inspectorOpen', !ui.inspectorOpen);
                    break;
                case 'escape':
                    ui.setHighlight([]);
                    break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
}
