import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TEMPLATES, templateById, migrateProject, emptyProject, uid, } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useAuth } from '../store/auth.js';
import { useUi } from '../store/ui.js';
import { replaceSimulator, useSim } from '../store/sim.js';
import { localStore } from '../storage/local.js';
import { ApiError, api } from '../api/client.js';
import { download } from '../export/svg.js';
import { exportSvg, exportPng } from '../export/svg.js';
import { exportDrawingPdf } from '../export/pdf.js';
export function Dialogs() {
    const dialog = useUi((s) => s.dialog);
    if (!dialog)
        return null;
    return (_jsxs(Modal, { children: [dialog === 'auth' && _jsx(AuthDialog, {}), dialog === 'projects' && _jsx(ProjectsDialog, {}), dialog === 'templates' && _jsx(TemplatesDialog, {}), dialog === 'shortcuts' && _jsx(ShortcutsDialog, {}), dialog === 'settings' && _jsx(SettingsDialog, {}), dialog === 'export' && _jsx(ExportDialog, {})] }));
}
function Modal({ children }) {
    const close = () => useUi.getState().set('dialog', null);
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape')
                close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 no-print", style: { background: 'rgba(0,0,0,.45)' }, onPointerDown: (e) => e.target === e.currentTarget && close(), children: _jsx("div", { className: "fade-in w-full max-w-2xl rounded-lg p-4 shadow-xl", style: { background: 'var(--bg-panel)', border: '1px solid var(--border)' }, children: children }) }));
}
function Head({ title, children }) {
    const { t } = useTranslation();
    return (_jsxs("div", { className: "mb-3 flex items-center gap-2", children: [_jsx("h2", { className: "text-sm font-semibold", children: title }), _jsxs("div", { className: "ml-auto flex gap-1", children: [children, _jsx("button", { className: "btn btn-sm", onClick: () => useUi.getState().set('dialog', null), children: t('action.close') })] })] }));
}
/* ------------------------------------------------------------------ */
function AuthDialog() {
    const { t } = useTranslation();
    const auth = useAuth();
    const ui = useUi();
    const [mode, setMode] = useState('up');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const localCount = localStore.list().length;
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            if (mode === 'up')
                await auth.signup(email, password);
            else
                await auth.login(email, password);
            ui.set('dialog', null);
        }
        catch (err) {
            setError(err instanceof ApiError ? `auth.error.${err.code}` : 'auth.error.network');
        }
        finally {
            setBusy(false);
        }
    };
    if (auth.user) {
        return (_jsxs(_Fragment, { children: [_jsx(Head, { title: auth.user.email }), _jsxs("div", { className: "flex flex-col gap-2 text-xs", children: [localCount > 0 && (_jsxs("button", { className: "btn self-start", onClick: async () => {
                                const n = await auth.importLocalProjects();
                                ui.showToast(t('project.importedCount', { count: n }));
                                ui.set('dialog', null);
                            }, children: [t('action.moveLocal'), " (", localCount, ")"] })), _jsx("button", { className: "btn self-start", onClick: () => void auth.logout(), children: t('auth.signOut') })] })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(Head, { title: mode === 'up' ? t('auth.signUp') : t('auth.signIn') }), _jsxs("form", { onSubmit: submit, className: "flex flex-col gap-2 text-xs", children: [_jsxs("label", { children: [_jsx("span", { className: "dim", children: t('auth.email') }), _jsx("input", { type: "email", autoComplete: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true })] }), _jsxs("label", { children: [_jsx("span", { className: "dim", children: t('auth.password') }), _jsx("input", { type: "password", autoComplete: mode === 'up' ? 'new-password' : 'current-password', value: password, onChange: (e) => setPassword(e.target.value), required: true, minLength: 6 })] }), error && _jsx("div", { style: { color: 'var(--fail)' }, children: t(error) }), _jsxs("div", { className: "mt-1 flex items-center gap-2", children: [_jsx("button", { className: "btn", type: "submit", disabled: busy, children: mode === 'up' ? t('auth.signUp') : t('auth.signIn') }), _jsx("button", { type: "button", className: "btn btn-sm", onClick: () => setMode(mode === 'up' ? 'in' : 'up'), children: mode === 'up' ? t('auth.haveAccount') : t('auth.noAccount') }), _jsx("button", { type: "button", className: "btn btn-sm ml-auto", onClick: () => ui.set('dialog', null), children: t('auth.continueAsGuest') })] }), _jsx("div", { className: "faint mt-1", children: t('app.guestHint') })] })] }));
}
/* ------------------------------------------------------------------ */
function ProjectsDialog() {
    const { t } = useTranslation();
    const auth = useAuth();
    const ui = useUi();
    const store = useProject;
    const [localList, setLocalList] = useState(localStore.list());
    const fileRef = useRef(null);
    useEffect(() => {
        void auth.refreshProjects();
    }, []);
    const open = async (id, storage) => {
        try {
            if (storage === 'cloud') {
                const { project } = await api.get(id);
                const migrated = migrateProject(project.data);
                store.getState().loadProject(migrated.project, id, 'cloud');
                replaceSimulator(migrated.project);
            }
            else {
                const rec = localStore.get(id);
                if (!rec)
                    return;
                store.getState().loadProject(rec.data, id, 'local');
                replaceSimulator(rec.data);
            }
            ui.set('dialog', null);
        }
        catch (e) {
            ui.showToast(t('auth.error.network'), 'error');
        }
    };
    const newProject = () => {
        const p = emptyProject(uid('p'), t('project.new'));
        store.getState().loadProject(p, null, auth.user ? 'cloud' : 'local');
        replaceSimulator(p);
        ui.set('dialog', null);
    };
    const importFile = async (file) => {
        try {
            const raw = JSON.parse(await file.text());
            const { project, migratedFrom } = migrateProject(raw);
            store.getState().loadProject(project, null, auth.user ? 'cloud' : 'local');
            replaceSimulator(project);
            if (migratedFrom && migratedFrom !== project.schemaVersion) {
                ui.showToast(t('project.migrated', { from: migratedFrom }));
            }
            ui.set('dialog', null);
        }
        catch (e) {
            ui.showToast(t('project.importError', { message: String(e.message) }), 'error');
        }
    };
    const rows = [
        ...auth.cloudProjects.map((p) => ({ ...p, storage: 'cloud' })),
        ...localList.map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, storage: 'local' })),
    ];
    return (_jsxs(_Fragment, { children: [_jsxs(Head, { title: t('project.title'), children: [_jsx("button", { className: "btn btn-sm", onClick: newProject, children: t('project.new') }), _jsx("button", { className: "btn btn-sm", onClick: () => fileRef.current?.click(), children: t('project.importFile') })] }), _jsx("input", { ref: fileRef, type: "file", accept: "application/json,.json", className: "hidden", onChange: (e) => e.target.files?.[0] && void importFile(e.target.files[0]) }), !rows.length && _jsx("div", { className: "dim text-xs", children: t('project.none') }), _jsx("ul", { className: "flex max-h-[60vh] flex-col gap-1 overflow-y-auto text-xs", children: rows.map((p) => (_jsxs("li", { className: "flex items-center gap-2 rounded px-2 py-1.5", style: { background: 'var(--bg-sunken)' }, children: [_jsxs("button", { className: "min-w-0 flex-1 text-left", onClick: () => void open(p.id, p.storage), children: [_jsx("div", { className: "truncate font-medium", children: p.name }), _jsxs("div", { className: "faint text-[11px]", children: [p.storage === 'cloud' ? t('project.cloud') : t('project.local'), " \u00B7 ", t('project.updated'), ' ', new Date(p.updatedAt).toLocaleString()] })] }), _jsx("button", { className: "btn btn-sm", onClick: async () => {
                                const name = window.prompt(t('action.rename'), p.name);
                                if (name) {
                                    await auth.renameProject(p.id, p.storage, name);
                                    setLocalList(localStore.list());
                                }
                            }, children: t('action.rename') }), _jsx("button", { className: "btn btn-sm", onClick: async () => {
                                await auth.duplicateProject(p.id, p.storage, `${p.name} (${t('project.copySuffix')})`);
                                setLocalList(localStore.list());
                            }, children: t('action.duplicate') }), _jsx("button", { className: "btn btn-sm btn-danger", onClick: async () => {
                                if (!window.confirm(t('project.deleteConfirm', { name: p.name })))
                                    return;
                                await auth.deleteProject(p.id, p.storage);
                                setLocalList(localStore.list());
                            }, children: t('action.delete') })] }, `${p.storage}-${p.id}`))) })] }));
}
/* ------------------------------------------------------------------ */
function TemplatesDialog() {
    const { t } = useTranslation();
    const ui = useUi();
    const store = useProject;
    const groups = useMemo(() => [
        { key: 'board', items: TEMPLATES.filter((x) => x.category === 'board') },
        { key: 'teaching', items: TEMPLATES.filter((x) => x.category === 'teaching') },
    ], []);
    const load = (id) => {
        const p = templateById(id);
        if (!p)
            return;
        const project = { ...p, id: uid('p') };
        store.getState().loadProject(project, null, 'local');
        replaceSimulator(project);
        useSim.setState({ report: null });
        ui.set('dialog', null);
    };
    return (_jsxs(_Fragment, { children: [_jsx(Head, { title: t('template.title') }), _jsx("div", { className: "flex flex-col gap-4", children: groups.map((g) => (_jsxs("div", { children: [_jsx("div", { className: "sect-title mb-1", children: t(`template.${g.key}`) }), _jsx("ul", { className: "grid grid-cols-1 gap-1.5 sm:grid-cols-2", children: g.items.map((tpl) => (_jsx("li", { children: _jsxs("button", { className: "w-full rounded p-2 text-left hover:bg-[var(--bg-hover)]", style: { background: 'var(--bg-sunken)' }, onClick: () => load(tpl.id), children: [_jsx("div", { className: "text-xs font-medium", children: t(`template.${tpl.id}.name`) }), _jsx("div", { className: "dim mt-0.5 text-[11px]", children: t(`template.${tpl.id}.desc`) })] }) }, tpl.id))) })] }, g.key))) })] }));
}
/* ------------------------------------------------------------------ */
function ShortcutsDialog() {
    const { t } = useTranslation();
    const rows = [
        ['Delete / Backspace', t('shortcut.delete')],
        ['Ctrl+D', t('shortcut.duplicate')],
        ['W', t('shortcut.wire')],
        ['V', t('shortcut.select')],
        ['Space', t('shortcut.runStop')],
        ['Ctrl+Z / Ctrl+Shift+Z', t('shortcut.undoRedo')],
        ['Ctrl+S', t('shortcut.save')],
        ['R', t('shortcut.rotate')],
        ['Ctrl+0', t('shortcut.fit')],
        ['Esc', t('shortcut.escape')],
        ['Ctrl+C / Ctrl+V', `${t('action.copy')} / ${t('action.paste')}`],
        ['Ctrl+A', t('action.selectAll')],
    ];
    return (_jsxs(_Fragment, { children: [_jsx(Head, { title: t('shortcut.title') }), _jsx("table", { className: "w-full text-xs", children: _jsx("tbody", { children: rows.map(([k, v]) => (_jsxs("tr", { children: [_jsx("td", { className: "mono py-0.5 pr-4 font-semibold", children: k }), _jsx("td", { className: "dim py-0.5", children: v })] }, k))) }) })] }));
}
/* ------------------------------------------------------------------ */
function SettingsDialog() {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const setSettings = useProject((s) => s.setSettings);
    const s = project.settings;
    return (_jsxs(_Fragment, { children: [_jsx(Head, { title: t('project.settings') }), _jsxs("div", { className: "grid grid-cols-2 gap-x-4 gap-y-2 text-xs", children: [_jsxs("label", { children: [_jsx("span", { className: "dim", children: t('prop.system') }), _jsx("select", { value: s.system, onChange: (e) => setSettings({ system: e.target.value }), children: ['TN-C', 'TN-C-S', 'TN-S'].map((x) => (_jsx("option", { value: x, children: x }, x))) })] }), _jsxs("label", { children: [_jsx("span", { className: "dim", children: t('project.premises') }), _jsx("select", { value: s.premises, onChange: (e) => setSettings({ premises: e.target.value }), children: ['dwelling', 'commercial', 'industrial', 'outdoor'].map((x) => (_jsx("option", { value: x, children: t(`opt.premises.${x}`) }, x))) })] }), _jsxs("label", { children: [_jsxs("span", { className: "dim", children: [t('prop.voltageLN'), " [V]"] }), _jsx("input", { type: "number", value: s.voltageLN, onChange: (e) => setSettings({ voltageLN: Number(e.target.value) }) })] }), _jsxs("label", { children: [_jsx("span", { className: "dim", children: t('prop.installMethod') }), _jsx("select", { value: s.defaultInstallMethod, onChange: (e) => setSettings({ defaultInstallMethod: e.target.value }), children: ['A1', 'A2', 'B1', 'B2', 'C', 'E'].map((x) => (_jsx("option", { value: x, children: x }, x))) })] }), _jsxs("label", { children: [_jsxs("span", { className: "dim", children: [t('prop.frequency'), " [Hz]"] }), _jsx("input", { type: "number", value: s.ambientTemp, onChange: (e) => setSettings({ ambientTemp: Number(e.target.value) }) })] }), _jsxs("label", { children: [_jsxs("span", { className: "dim", children: [t('rule.voltageDrop.title'), " \u2014 ", t('circuitKind.lighting'), " [%]"] }), _jsx("input", { type: "number", step: 0.5, value: s.voltageDropLighting, onChange: (e) => setSettings({ voltageDropLighting: Number(e.target.value) }) })] }), _jsxs("label", { children: [_jsxs("span", { className: "dim", children: [t('rule.voltageDrop.title'), " \u2014 ", t('circuitKind.other'), " [%]"] }), _jsx("input", { type: "number", step: 0.5, value: s.voltageDropOther, onChange: (e) => setSettings({ voltageDropOther: Number(e.target.value) }) })] })] })] }));
}
/* ------------------------------------------------------------------ */
function ExportDialog() {
    const { t } = useTranslation();
    const project = useProject((s) => s.project);
    const ui = useUi();
    const drawing = () => document.querySelector('#schematic-root')?.closest('svg') ??
        document.querySelector('svg[id^="enclosure-"]');
    const run = async (kind) => {
        const el = drawing();
        if (!el) {
            ui.showToast(t('canvas.emptyTitle'), 'error');
            return;
        }
        try {
            if (kind === 'svg')
                exportSvg(el, project.name || 'schema');
            else if (kind === 'png')
                await exportPng(el, project.name || 'schema');
            else
                await exportDrawingPdf(el, project.name || 'schema');
            ui.set('dialog', null);
        }
        catch (e) {
            ui.showToast(String(e.message), 'error');
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(Head, { title: t('action.export') }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { className: "btn", onClick: () => {
                            download(`${project.name || 'project'}.json`, JSON.stringify(project, null, 2), 'application/json');
                            ui.set('dialog', null);
                        }, children: t('action.exportJson') }), _jsx("button", { className: "btn", onClick: () => void run('svg'), children: t('action.exportSvg') }), _jsx("button", { className: "btn", onClick: () => void run('png'), children: t('action.exportPng') }), _jsx("button", { className: "btn", onClick: () => void run('pdf'), children: t('action.exportPdf') })] }), _jsx("div", { className: "faint mt-3 text-[11px]", children: t('panel.labelSheetHint') })] }));
}
