import { type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';
import { useUi } from '../store/ui.js';
import { useIsTouch } from '../hooks/useMediaQuery.js';

/**
 * Alignment and grouping tools, shown only while several items are selected so
 * that they do not take up room in the main toolbar the rest of the time.
 */
export function SelectionBar(): JSX.Element | null {
  const { t } = useTranslation();
  const selection = useProject((s) => s.selection);
  const selectedWires = useProject((s) => s.selectedWires);
  const project = useProject((s) => s.project);
  const running = useSim((s) => s.running);
  const store = useProject;
  const isTouch = useIsTouch();
  const btn = isTouch ? 'btn btn-touch !px-2.5' : 'btn btn-sm';

  const openProps = () => {
    const ui = useUi.getState();
    ui.set('sidePanel', 'inspector');
    if (window.matchMedia('(max-width: 900px)').matches) ui.set('drawer', 'side');
    else ui.set('inspectorOpen', true);
  };

  // One device or conductor: the actions a thumb needs, without hunting in menus.
  if (selection.length === 1 || (selection.length === 0 && selectedWires.length > 0)) {
    const comp = project.components.find((c) => c.id === selection[0]);
    const name = comp ? comp.label || t(`comp.${comp.type}`) : t('inspector.wire');
    return (
      <div
        className="fade-in absolute left-1/2 top-2 z-10 flex max-w-[96vw] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-lg px-1.5 py-1 shadow-md no-print"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
      >
        <span className="max-w-[9rem] truncate px-1 text-[12px] font-medium">{name}</span>
        {comp && !running && (
          <button className={btn} onClick={() => store.getState().rotateSelection()} title={`${t('action.rotate')} (R)`} aria-label={t('action.rotate')}>
            ⟳
          </button>
        )}
        <button className={btn} onClick={openProps}>{t('tab.inspector')}</button>
        {comp && !running && (
          <button className={btn} onClick={() => store.getState().duplicateSelection()} title="Ctrl+D" aria-label={t('action.duplicate')}>
            ⧉
          </button>
        )}
        {!running && (
          <button className={`${btn} btn-danger`} onClick={() => store.getState().deleteSelection()} title="Del" aria-label={t('action.delete')}>
            ✕
          </button>
        )}
      </div>
    );
  }
  if (selection.length < 2) return null;

  const align = (edge: 'left' | 'top' | 'right' | 'bottom') => () => store.getState().alignSelection(edge);

  return (
    <div
      className="fade-in absolute left-1/2 top-2 z-10 flex max-w-[96vw] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded px-1.5 py-1 shadow-md no-print"
      style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
    >
      <span className="faint px-1 text-[11px]">{t('inspector.multiple', { count: selection.length })}</span>
      <button className="btn btn-sm" onClick={align('left')} title={t('action.alignLeft')}>⌐</button>
      <button className="btn btn-sm" onClick={align('right')} title={t('action.alignRight')}>¬</button>
      <button className="btn btn-sm" onClick={align('top')} title={t('action.alignTop')}>⌃</button>
      <button className="btn btn-sm" onClick={align('bottom')} title={t('action.alignBottom')}>⌄</button>
      <span className="mx-0.5 h-4 w-px" style={{ background: 'var(--border)' }} />
      <button
        className="btn btn-sm"
        disabled={selection.length < 3}
        onClick={() => store.getState().distributeSelection('h')}
        title={t('action.distributeH')}
      >
        ↔
      </button>
      <button
        className="btn btn-sm"
        disabled={selection.length < 3}
        onClick={() => store.getState().distributeSelection('v')}
        title={t('action.distributeV')}
      >
        ↕
      </button>
      <span className="mx-0.5 h-4 w-px" style={{ background: 'var(--border)' }} />
      <button className="btn btn-sm" onClick={() => store.getState().groupSelection()} title="Ctrl+G">
        {t('action.group')}
      </button>
      <button className="btn btn-sm" onClick={() => store.getState().ungroupSelection()} title="Ctrl+Shift+G">
        {t('action.ungroup')}
      </button>
      <span className="mx-0.5 h-4 w-px" style={{ background: 'var(--border)' }} />
      <button className="btn btn-sm" onClick={() => store.getState().duplicateSelection()} title="Ctrl+D">
        {t('action.duplicate')}
      </button>
      <button className="btn btn-sm btn-danger" onClick={() => store.getState().deleteSelection()} title="Del">
        {t('action.delete')}
      </button>
    </div>
  );
}
