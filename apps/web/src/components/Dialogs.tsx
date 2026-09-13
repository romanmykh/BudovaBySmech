import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TEMPLATES, templateById, migrateProject, emptyProject, uid,
  type Project, type EarthingSystem, type InstallMethod,
} from '@budova/engine';
import { useProject } from '../store/project.js';
import { useAuth } from '../store/auth.js';
import { useUi } from '../store/ui.js';
import { replaceSimulator, useSim } from '../store/sim.js';
import { localStore } from '../storage/local.js';
import { ApiError, api } from '../api/client.js';
import { download } from '../export/svg.js';
import { exportSvg, exportPng } from '../export/svg.js';
import { exportDrawingPdf } from '../export/pdf.js';

export function Dialogs(): JSX.Element | null {
  const dialog = useUi((s) => s.dialog);
  if (!dialog) return null;
  return (
    <Modal>
      {dialog === 'auth' && <AuthDialog />}
      {dialog === 'projects' && <ProjectsDialog />}
      {dialog === 'templates' && <TemplatesDialog />}
      {dialog === 'shortcuts' && <ShortcutsDialog />}
      {dialog === 'settings' && <SettingsDialog />}
      {dialog === 'export' && <ExportDialog />}
    </Modal>
  );
}

function Modal({ children }: { children: React.ReactNode }): JSX.Element {
  const close = () => useUi.getState().set('dialog', null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 no-print"
      style={{ background: 'rgba(0,0,0,.45)' }}
      onPointerDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="dialog-sheet fade-in w-full max-w-2xl rounded-lg p-4 shadow-xl"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
      >
        {children}
      </div>
    </div>
  );
}

function Head({ title, children }: { title: string; children?: React.ReactNode }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="ml-auto flex gap-1">
        {children}
        <button className="btn btn-sm" onClick={() => useUi.getState().set('dialog', null)}>
          {t('action.close')}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AuthDialog(): JSX.Element {
  const { t } = useTranslation();
  const auth = useAuth();
  const ui = useUi();
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const localCount = localStore.list().length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'up') await auth.signup(email, password);
      else await auth.login(email, password);
      ui.set('dialog', null);
    } catch (err) {
      setError(err instanceof ApiError ? `auth.error.${err.code}` : 'auth.error.network');
    } finally {
      setBusy(false);
    }
  };

  if (!auth.serverUp && !auth.user) {
    return (
      <>
        <Head title={t('app.localOnlyShort')} />
        <div className="flex flex-col gap-2 text-xs">
          <p className="dim">{t('app.localOnly')}</p>
          <div className="flex gap-2">
            <button className="btn" onClick={() => ui.set('dialog', 'projects')}>
              {t('project.title')}
            </button>
            <button className="btn" onClick={() => ui.set('dialog', 'export')}>
              {t('action.export')}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (auth.user) {
    return (
      <>
        <Head title={auth.user.email} />
        <div className="flex flex-col gap-2 text-xs">
          {localCount > 0 && (
            <button
              className="btn self-start"
              onClick={async () => {
                const n = await auth.importLocalProjects();
                ui.showToast(t('project.importedCount', { count: n }));
                ui.set('dialog', null);
              }}
            >
              {t('action.moveLocal')} ({localCount})
            </button>
          )}
          <button className="btn self-start" onClick={() => void auth.logout()}>
            {t('auth.signOut')}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Head title={mode === 'up' ? t('auth.signUp') : t('auth.signIn')} />
      <form onSubmit={submit} className="flex flex-col gap-2 text-xs">
        <label>
          <span className="dim">{t('auth.email')}</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span className="dim">{t('auth.password')}</span>
          <input
            type="password"
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && <div style={{ color: 'var(--fail)' }}>{t(error)}</div>}
        <div className="mt-1 flex items-center gap-2">
          <button className="btn" type="submit" disabled={busy}>
            {mode === 'up' ? t('auth.signUp') : t('auth.signIn')}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setMode(mode === 'up' ? 'in' : 'up')}>
            {mode === 'up' ? t('auth.haveAccount') : t('auth.noAccount')}
          </button>
          <button type="button" className="btn btn-sm ml-auto" onClick={() => ui.set('dialog', null)}>
            {t('auth.continueAsGuest')}
          </button>
        </div>
        <div className="faint mt-1">{t('app.guestHint')}</div>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ProjectsDialog(): JSX.Element {
  const { t } = useTranslation();
  const auth = useAuth();
  const ui = useUi();
  const store = useProject;
  const [localList, setLocalList] = useState(localStore.list());
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void auth.refreshProjects();
  }, []);

  const open = async (id: string, storage: 'local' | 'cloud') => {
    try {
      if (storage === 'cloud') {
        const { project } = await api.get(id);
        const migrated = migrateProject(project.data);
        store.getState().loadProject(migrated.project, id, 'cloud');
        replaceSimulator(migrated.project);
      } else {
        const rec = localStore.get(id);
        if (!rec) return;
        store.getState().loadProject(rec.data, id, 'local');
        replaceSimulator(rec.data);
      }
      ui.set('dialog', null);
    } catch (e) {
      ui.showToast(t('auth.error.network'), 'error');
    }
  };

  const newProject = () => {
    const p = emptyProject(uid('p'), t('project.new'));
    store.getState().loadProject(p, null, auth.user ? 'cloud' : 'local');
    replaceSimulator(p);
    ui.set('dialog', null);
  };

  const importFile = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      const { project, migratedFrom } = migrateProject(raw);
      store.getState().loadProject(project, null, auth.user ? 'cloud' : 'local');
      replaceSimulator(project);
      if (migratedFrom && migratedFrom !== project.schemaVersion) {
        ui.showToast(t('project.migrated', { from: migratedFrom }));
      }
      ui.set('dialog', null);
    } catch (e) {
      ui.showToast(t('project.importError', { message: String((e as Error).message) }), 'error');
    }
  };

  const rows = [
    ...auth.cloudProjects.map((p) => ({ ...p, storage: 'cloud' as const })),
    ...localList.map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, storage: 'local' as const })),
  ];

  return (
    <>
      <Head title={t('project.title')}>
        <button className="btn btn-sm" onClick={newProject}>
          {t('project.new')}
        </button>
        <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
          {t('project.importFile')}
        </button>
      </Head>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])}
      />
      {!rows.length && <div className="dim text-xs">{t('project.none')}</div>}
      <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto text-xs">
        {rows.map((p) => (
          <li
            key={`${p.storage}-${p.id}`}
            className="flex items-center gap-2 rounded px-2 py-1.5"
            style={{ background: 'var(--bg-sunken)' }}
          >
            <button className="min-w-0 flex-1 text-left" onClick={() => void open(p.id, p.storage)}>
              <div className="truncate font-medium">{p.name}</div>
              <div className="faint text-[11px]">
                {p.storage === 'cloud' ? t('project.cloud') : t('project.local')} · {t('project.updated')}{' '}
                {new Date(p.updatedAt).toLocaleString()}
              </div>
            </button>
            <button
              className="btn btn-sm"
              onClick={async () => {
                const name = window.prompt(t('action.rename'), p.name);
                if (name) {
                  await auth.renameProject(p.id, p.storage, name);
                  setLocalList(localStore.list());
                }
              }}
            >
              {t('action.rename')}
            </button>
            <button
              className="btn btn-sm"
              onClick={async () => {
                await auth.duplicateProject(p.id, p.storage, `${p.name} (${t('project.copySuffix')})`);
                setLocalList(localStore.list());
              }}
            >
              {t('action.duplicate')}
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={async () => {
                if (!window.confirm(t('project.deleteConfirm', { name: p.name }))) return;
                await auth.deleteProject(p.id, p.storage);
                setLocalList(localStore.list());
              }}
            >
              {t('action.delete')}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------ */

function TemplatesDialog(): JSX.Element {
  const { t } = useTranslation();
  const ui = useUi();
  const store = useProject;
  const groups = useMemo(
    () => [
      { key: 'board', items: TEMPLATES.filter((x) => x.category === 'board') },
      { key: 'teaching', items: TEMPLATES.filter((x) => x.category === 'teaching') },
    ],
    [],
  );

  const load = (id: string) => {
    const p = templateById(id);
    if (!p) return;
    const project: Project = { ...p, id: uid('p') };
    store.getState().loadProject(project, null, 'local');
    replaceSimulator(project);
    useSim.setState({ report: null });
    ui.set('dialog', null);
  };

  return (
    <>
      <Head title={t('template.title')} />
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="sect-title mb-1">{t(`template.${g.key}`)}</div>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {g.items.map((tpl) => (
                <li key={tpl.id}>
                  <button
                    className="w-full rounded p-2 text-left hover:bg-[var(--bg-hover)]"
                    style={{ background: 'var(--bg-sunken)' }}
                    onClick={() => load(tpl.id)}
                  >
                    <div className="text-xs font-medium">{t(`template.${tpl.id}.name`)}</div>
                    <div className="dim mt-0.5 text-[11px]">{t(`template.${tpl.id}.desc`)}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ShortcutsDialog(): JSX.Element {
  const { t } = useTranslation();
  const rows: Array<[string, string]> = [
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
  return (
    <>
      <Head title={t('shortcut.title')} />
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="mono py-0.5 pr-4 font-semibold">{k}</td>
              <td className="dim py-0.5">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ------------------------------------------------------------------ */

function SettingsDialog(): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const setSettings = useProject((s) => s.setSettings);
  const s = project.settings;
  return (
    <>
      <Head title={t('project.settings')} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <label>
          <span className="dim">{t('prop.system')}</span>
          <select value={s.system} onChange={(e) => setSettings({ system: e.target.value as EarthingSystem })}>
            {['TN-C', 'TN-C-S', 'TN-S'].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="dim">{t('project.premises')}</span>
          <select value={s.premises} onChange={(e) => setSettings({ premises: e.target.value as any })}>
            {['dwelling', 'commercial', 'industrial', 'outdoor'].map((x) => (
              <option key={x} value={x}>
                {t(`opt.premises.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="dim">{t('prop.voltageLN')} [V]</span>
          <input type="number" value={s.voltageLN} onChange={(e) => setSettings({ voltageLN: Number(e.target.value) })} />
        </label>
        <label>
          <span className="dim">{t('prop.installMethod')}</span>
          <select
            value={s.defaultInstallMethod}
            onChange={(e) => setSettings({ defaultInstallMethod: e.target.value as InstallMethod })}
          >
            {['A1', 'A2', 'B1', 'B2', 'C', 'E'].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="dim">{t('prop.frequency')} [Hz]</span>
          <input type="number" value={s.ambientTemp} onChange={(e) => setSettings({ ambientTemp: Number(e.target.value) })} />
        </label>
        <label>
          <span className="dim">{t('rule.voltageDrop.title')} — {t('circuitKind.lighting')} [%]</span>
          <input
            type="number"
            step={0.5}
            value={s.voltageDropLighting}
            onChange={(e) => setSettings({ voltageDropLighting: Number(e.target.value) })}
          />
        </label>
        <label>
          <span className="dim">{t('rule.voltageDrop.title')} — {t('circuitKind.other')} [%]</span>
          <input
            type="number"
            step={0.5}
            value={s.voltageDropOther}
            onChange={(e) => setSettings({ voltageDropOther: Number(e.target.value) })}
          />
        </label>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ExportDialog(): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const ui = useUi();

  const drawing = (): SVGSVGElement | null =>
    (document.querySelector('#schematic-root')?.closest('svg') as SVGSVGElement | null) ??
    (document.querySelector('svg[id^="enclosure-"]') as SVGSVGElement | null);

  const run = async (kind: 'svg' | 'png' | 'pdf') => {
    const el = drawing();
    if (!el) {
      ui.showToast(t('canvas.emptyTitle'), 'error');
      return;
    }
    try {
      if (kind === 'svg') exportSvg(el, project.name || 'schema');
      else if (kind === 'png') await exportPng(el, project.name || 'schema');
      else await exportDrawingPdf(el, project.name || 'schema');
      ui.set('dialog', null);
    } catch (e) {
      ui.showToast(String((e as Error).message), 'error');
    }
  };

  return (
    <>
      <Head title={t('action.export')} />
      <div className="flex flex-wrap gap-2">
        <button
          className="btn"
          onClick={() => {
            download(`${project.name || 'project'}.json`, JSON.stringify(project, null, 2), 'application/json');
            ui.set('dialog', null);
          }}
        >
          {t('action.exportJson')}
        </button>
        <button className="btn" onClick={() => void run('svg')}>
          {t('action.exportSvg')}
        </button>
        <button className="btn" onClick={() => void run('png')}>
          {t('action.exportPng')}
        </button>
        <button className="btn" onClick={() => void run('pdf')}>
          {t('action.exportPdf')}
        </button>
      </div>
      <div className="faint mt-3 text-[11px]">{t('panel.labelSheetHint')}</div>
    </>
  );
}
