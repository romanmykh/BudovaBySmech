import { type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { CSA_VALUES, type ConductorRole } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim, SPEEDS } from '../store/sim.js';
import { useUi } from '../store/ui.js';
import { useAuth } from '../store/auth.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';

const ROLES: ConductorRole[] = ['L1', 'L2', 'L3', 'N', 'PE', 'PEN', 'CTRL'];

/**
 * Compact glyphs for the drawing modes. Spelling the modes out costs most of a
 * phone's width and pushes the conductor selectors off screen, so they are
 * drawn instead and carry their full name as the accessible label.
 */
function ModeIcon({ mode }: { mode: 'select' | 'wire' | 'pan' | 'text' }): JSX.Element {
  const common = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (mode) {
    case 'select':
      return (
        <svg {...common} aria-hidden>
          <path d="M4 3 L13 9.5 L9 10.5 L11 14.5 L9.3 15.3 L7.3 11.3 L4.5 13.5 Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'wire':
      return (
        <svg {...common} aria-hidden>
          <circle cx="3.5" cy="4.5" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="13.5" r="1.8" fill="currentColor" stroke="none" />
          <path d="M3.5 6.3 V11 H14.5 V11.7" />
        </svg>
      );
    case 'pan':
      return (
        <svg {...common} aria-hidden>
          <path d="M9 2.5 V15.5 M2.5 9 H15.5" />
          <path d="M9 2.5 L7 4.6 M9 2.5 L11 4.6 M9 15.5 L7 13.4 M9 15.5 L11 13.4" />
          <path d="M2.5 9 L4.6 7 M2.5 9 L4.6 11 M15.5 9 L13.4 7 M15.5 9 L13.4 11" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <path d="M3.5 4 H14.5 M9 4 V14.5 M6.8 14.5 H11.2" />
        </svg>
      );
  }
}

/**
 * Phone layout. The desktop toolbar puts forty controls in one row, which is
 * unusable with a thumb; here the essentials sit in reach and everything else
 * moves into a sheet.
 */
export function MobileTopBar(): JSX.Element {
  const { t } = useTranslation();
  const ui = useUi();
  const project = useProject((s) => s.project);
  const dirty = useProject((s) => s.dirty);
  const running = useSim((s) => s.running);
  const sim = useSim();
  const saveState = useAuth((s) => s.saveState);
  const past = useProject((s) => s.past.length);
  const future = useProject((s) => s.future.length);

  return (
    <div
      className="shrink-0 border-b no-print"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button className="btn btn-touch" onClick={() => ui.set('drawer', 'menu')} aria-label={t('mobile.menu')}>
          ☰
        </button>
        <input
          type="text"
          className="min-w-0 flex-1"
          value={project.name}
          onChange={(e) => useProject.getState().setName(e.target.value)}
          aria-label={t('project.name')}
        />
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          title={dirty ? t('project.unsaved') : t('action.saved')}
          style={{
            background:
              saveState === 'saving' ? 'var(--warn)' : dirty ? 'var(--text-faint)' : 'var(--ok)',
          }}
        />
        <button className="btn btn-touch" data-on={running} onClick={() => sim.toggle()}>
          {running ? `■` : `▶`}
        </button>
      </div>

      {/* Drawing controls, only where they apply. */}
      {ui.view === 'schematic' && (
        <div className="flex items-center gap-1 overflow-x-auto px-2 pb-1.5">
          {(['select', 'wire', 'pan', 'text'] as const).map((m) => {
            const label = t(
              m === 'select' ? 'action.selectMode'
              : m === 'wire' ? 'action.wireMode'
              : m === 'pan' ? 'action.panMode'
              : 'action.textMode',
            );
            return (
              <button
                key={m}
                className="btn btn-touch shrink-0 !px-2"
                data-on={ui.mode === m}
                onClick={() => ui.set('mode', m)}
                aria-label={label}
                title={label}
              >
                <ModeIcon mode={m} />
              </button>
            );
          })}
          <span className="mx-0.5 h-5 w-px shrink-0" style={{ background: 'var(--border)' }} />
          <button className="btn btn-touch shrink-0 !px-2.5" disabled={!past} onClick={() => useProject.getState().undo()} aria-label={t('action.undo')}>↶</button>
          <button className="btn btn-touch shrink-0 !px-2.5" disabled={!future} onClick={() => useProject.getState().redo()} aria-label={t('action.redo')}>↷</button>
          <span className="mx-0.5 h-5 w-px shrink-0" style={{ background: 'var(--border)' }} />
          <select
            className="!w-auto shrink-0"
            value={ui.drawRole}
            onChange={(e) => ui.set('drawRole', e.target.value)}
            aria-label={t('canvas.role')}
          >
            <option value="auto">{t('canvas.roleAuto')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            className="!w-auto shrink-0"
            value={ui.drawCsa}
            onChange={(e) => ui.set('drawCsa', Number(e.target.value))}
            aria-label={t('prop.csa')}
          >
            {CSA_VALUES.map((c) => (
              <option key={c} value={c}>{c} mm²</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/** Thumb-reachable view switching and drawer access. */
export function MobileBottomBar(): JSX.Element {
  const { t } = useTranslation();
  const ui = useUi();
  const selection = useProject((s) => s.selection.length + s.selectedWires.length);

  const Tab = ({
    label,
    active,
    onClick,
    badge,
  }: {
    label: string;
    active: boolean;
    onClick(): void;
    badge?: number;
  }) => (
    <button
      className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[10px]"
      style={{ color: active ? 'var(--accent)' : 'var(--text-dim)', background: active ? 'var(--bg-hover)' : undefined }}
      onClick={onClick}
    >
      <span className="w-full truncate text-center">{label}</span>
      {!!badge && (
        <span
          className="absolute right-0.5 top-0.5 min-w-[14px] rounded text-center text-[9px] leading-[14px]"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <nav
      className="flex shrink-0 border-t no-print"
      style={{
        background: 'var(--bg-panel)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {ui.view !== 'report' && (
        <Tab label={t('mobile.library')} active={ui.drawer === 'library'} onClick={() => ui.set('drawer', ui.drawer === 'library' ? null : 'library')} />
      )}
      <Tab label={t('view.schematic')} active={ui.view === 'schematic' && !ui.drawer} onClick={() => { ui.set('view', 'schematic'); ui.set('drawer', null); }} />
      <Tab label={t('view.panel')} active={ui.view === 'panel' && !ui.drawer} onClick={() => { ui.set('view', 'panel'); ui.set('drawer', null); }} />
      <Tab label={t('view.report')} active={ui.view === 'report' && !ui.drawer} onClick={() => { ui.set('view', 'report'); ui.set('drawer', null); }} />
      {ui.view !== 'report' && (
        <Tab
          label={t('inspector.title')}
          active={ui.drawer === 'side'}
          badge={selection || undefined}
          onClick={() => ui.set('drawer', ui.drawer === 'side' ? null : 'side')}
        />
      )}
    </nav>
  );
}

/** Everything that does not fit on the phone's top bar. */
export function MobileMenuSheet(): JSX.Element | null {
  const { t } = useTranslation();
  const ui = useUi();
  const auth = useAuth();
  const past = useProject((s) => s.past.length);
  const future = useProject((s) => s.future.length);
  const speed = useSim((s) => s.speed);
  const sim = useSim();
  if (ui.drawer !== 'menu') return null;

  const close = () => ui.set('drawer', null);
  const go = (dialog: 'projects' | 'templates' | 'export' | 'settings' | 'shortcuts' | 'auth') => () => {
    close();
    ui.set('dialog', dialog);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-3">
      <div className="sect-title mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end no-print" style={{ background: 'rgba(0,0,0,.45)' }} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div
        className="fade-in max-h-[80vh] overflow-y-auto rounded-t-xl p-3"
        style={{ background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="mb-3 flex items-center">
          <span className="text-sm font-semibold">{t('mobile.menu')}</span>
          <button className="btn btn-touch ml-auto" onClick={close}>{t('mobile.done')}</button>
        </div>

        <Section title={t('mobile.file')}>
          <button className="btn btn-touch" onClick={() => { close(); void auth.save(true); }}>{t('action.save')}</button>
          <button className="btn btn-touch" onClick={go('projects')}>{t('action.open')}</button>
          <button className="btn btn-touch" onClick={go('templates')}>{t('action.templates')}</button>
          <button className="btn btn-touch" onClick={go('export')}>{t('action.export')}</button>
        </Section>

        <Section title={t('mobile.edit')}>
          <button className="btn btn-touch" disabled={!past} onClick={() => useProject.getState().undo()}>↶ {t('action.undo')}</button>
          <button className="btn btn-touch" disabled={!future} onClick={() => useProject.getState().redo()}>↷ {t('action.redo')}</button>
          <button className="btn btn-touch" onClick={() => useProject.getState().duplicateSelection()}>{t('action.duplicate')}</button>
          <button className="btn btn-touch btn-danger" onClick={() => useProject.getState().deleteSelection()}>{t('action.delete')}</button>
        </Section>

        <Section title={t('action.run')}>
          <button className="btn btn-touch" onClick={() => sim.reset()}>{t('action.reset')}</button>
          <label className="flex items-center gap-1.5">
            <span className="dim text-[11px]">{t('action.speed')}</span>
            <select className="!w-auto" value={speed} onChange={(e) => sim.setSpeed(Number(e.target.value))}>
              {SPEEDS.map((s) => (
                <option key={s} value={s}>{s}×</option>
              ))}
            </select>
          </label>
        </Section>

        <Section title={t('mobile.viewSettings')}>
          <button className="btn btn-touch" onClick={ui.toggleTheme}>
            {ui.theme === 'dark' ? `☀ ${t('theme.light')}` : `☾ ${t('theme.dark')}`}
          </button>
          <button className="btn btn-touch" data-on={ui.showGrid} onClick={() => ui.set('showGrid', !ui.showGrid)}>{t('action.grid')}</button>
          <button className="btn btn-touch" data-on={ui.snap} onClick={() => ui.set('snap', !ui.snap)}>{t('action.snap')}</button>
          <button className="btn btn-touch" onClick={go('settings')}>{t('project.settings')}</button>
          <LanguageSwitcher />
        </Section>

        <Section title={auth.user ? auth.user.email : t('app.guest')}>
          <button className="btn btn-touch" onClick={go('auth')}>
            {auth.user ? t('auth.signOut') : auth.serverUp ? t('auth.signIn') : t('app.localOnlyShort')}
          </button>
        </Section>
      </div>
    </div>
  );
}

/** Slide-over holding the library or the inspector on a phone. */
export function MobileDrawer({ side, children }: { side: 'library' | 'side'; children: React.ReactNode }): JSX.Element | null {
  const ui = useUi();
  const { t } = useTranslation();
  if (ui.drawer !== side) return null;
  return (
    <div
      className="fixed inset-0 z-30 flex no-print"
      style={{ background: 'rgba(0,0,0,.4)' }}
      onPointerDown={(e) => e.target === e.currentTarget && ui.set('drawer', null)}
    >
      <div
        className={`fade-in flex h-full w-[86%] max-w-sm flex-col ${side === 'library' ? '' : 'ml-auto'}`}
        style={{ background: 'var(--bg-panel)', boxShadow: '0 0 24px rgba(0,0,0,.3)' }}
      >
        <div className="flex shrink-0 items-center border-b px-2 py-1.5" style={{ borderColor: 'var(--border)' }}>
          <span className="sect-title">{t(side === 'library' ? 'library.title' : 'inspector.title')}</span>
          <button className="btn btn-touch ml-auto" onClick={() => ui.set('drawer', null)}>
            {t('mobile.done')}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
