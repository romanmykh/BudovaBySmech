import { type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../store/project.js';
import { useSim, SPEEDS } from '../store/sim.js';
import { useUi } from '../store/ui.js';
import { useAuth } from '../store/auth.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { CSA_VALUES, type ConductorRole } from '@budova/engine';

const ROLES: ConductorRole[] = ['L1', 'L2', 'L3', 'N', 'PE', 'PEN', 'CTRL'];

export function Toolbar(): JSX.Element {
  const { t } = useTranslation();
  const ui = useUi();
  const project = useProject((s) => s.project);
  const dirty = useProject((s) => s.dirty);
  const past = useProject((s) => s.past.length);
  const future = useProject((s) => s.future.length);
  const running = useSim((s) => s.running);
  const speed = useSim((s) => s.speed);
  const sim = useSim();
  const auth = useAuth();

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-1 border-b px-2 py-1.5 no-print"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      <span className="mr-1 font-semibold">⚡</span>

      <input
        type="text"
        className="!w-44"
        value={project.name}
        onChange={(e) => useProject.getState().setName(e.target.value)}
        aria-label={t('project.name')}
      />
      <span className="faint w-14 text-[11px]">
        {auth.saveState === 'saving' ? t('action.saving') : dirty ? t('project.unsaved') : t('action.saved')}
      </span>

      <button className="btn btn-sm" onClick={() => void auth.save(true)} title="Ctrl+S">
        {t('action.save')}
      </button>
      <button className="btn btn-sm" onClick={() => ui.set('dialog', 'projects')}>
        {t('action.open')}
      </button>
      <button className="btn btn-sm" onClick={() => ui.set('dialog', 'templates')}>
        {t('action.templates')}
      </button>
      <button className="btn btn-sm" onClick={() => ui.set('dialog', 'export')}>
        {t('action.export')}
      </button>

      <Sep />

      <button className="btn btn-sm" disabled={!past} onClick={() => useProject.getState().undo()} title="Ctrl+Z">
        ↶
      </button>
      <button className="btn btn-sm" disabled={!future} onClick={() => useProject.getState().redo()} title="Ctrl+Shift+Z">
        ↷
      </button>

      <Sep />

      <button className="btn btn-sm" data-on={ui.mode === 'select'} onClick={() => ui.set('mode', 'select')} title="V">
        {t('action.selectMode')}
      </button>
      <button className="btn btn-sm" data-on={ui.mode === 'wire'} onClick={() => ui.set('mode', 'wire')} title="W">
        {t('action.wireMode')}
      </button>
      <button className="btn btn-sm" data-on={ui.mode === 'pan'} onClick={() => ui.set('mode', 'pan')}>
        {t('action.panMode')}
      </button>
      <button
        className="btn btn-sm"
        data-on={ui.mode === 'text'}
        onClick={() => ui.set('mode', ui.mode === 'text' ? 'select' : 'text')}
        title={t('annotation.addHint')}
      >
        {t('action.textMode')}
      </button>

      <select
        className="!w-auto"
        value={ui.drawRole}
        onChange={(e) => ui.set('drawRole', e.target.value)}
        title={t('canvas.role')}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        className="!w-auto"
        value={ui.drawCsa}
        onChange={(e) => ui.set('drawCsa', Number(e.target.value))}
        title={t('prop.csa')}
      >
        {CSA_VALUES.map((c) => (
          <option key={c} value={c}>
            {c} mm²
          </option>
        ))}
      </select>
      <input
        type="number"
        className="!w-16"
        min={0}
        step={0.5}
        value={ui.drawLength}
        onChange={(e) => ui.set('drawLength', Number(e.target.value))}
        title={t('prop.length')}
      />

      <Sep />

      <button className="btn btn-sm" data-on={running} onClick={() => sim.toggle()} title="Space">
        {running ? `■ ${t('action.stop')}` : `▶ ${t('action.run')}`}
      </button>
      <button className="btn btn-sm" onClick={() => sim.stepOnce(0.02)} title={t('action.step')}>
        ⏭
      </button>
      <button className="btn btn-sm" onClick={() => sim.reset()}>
        {t('action.reset')}
      </button>
      <select
        className="!w-auto"
        value={speed}
        onChange={(e) => sim.setSpeed(Number(e.target.value))}
        title={t('action.speed')}
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>

      <Sep />

      <div className="flex rounded" style={{ border: '1px solid var(--border)' }}>
        {(['schematic', 'panel', 'report'] as const).map((v) => (
          <button
            key={v}
            className="btn btn-sm !rounded-none !border-0"
            data-on={ui.view === v}
            onClick={() => ui.set('view', v)}
          >
            {t(`view.${v}`)}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button className="btn btn-sm" onClick={() => ui.set('dialog', 'settings')} title={t('project.settings')}>
          ⚙
        </button>
        <button className="btn btn-sm" onClick={() => ui.set('dialog', 'shortcuts')} title={t('action.shortcuts')}>
          ⌨
        </button>
        <button className="btn btn-sm" onClick={ui.toggleTheme} title={t(ui.theme === 'dark' ? 'theme.light' : 'theme.dark')}>
          {ui.theme === 'dark' ? '☀' : '☾'}
        </button>
        <LanguageSwitcher />
        <button
          className="btn btn-sm"
          onClick={() => ui.set('dialog', 'auth')}
          title={auth.user?.email ?? (auth.serverUp ? undefined : t('app.localOnly'))}
        >
          {auth.user
            ? auth.user.email.split('@')[0]
            : auth.serverUp
              ? t('auth.signIn')
              : t('app.localOnlyShort')}
        </button>
      </div>
    </div>
  );
}

function Sep(): JSX.Element {
  return <span className="mx-1 h-5 w-px" style={{ background: 'var(--border)' }} />;
}
