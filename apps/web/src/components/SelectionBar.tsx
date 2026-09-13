import { type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../store/project.js';

/**
 * Alignment and grouping tools, shown only while several items are selected so
 * that they do not take up room in the main toolbar the rest of the time.
 */
export function SelectionBar(): JSX.Element | null {
  const { t } = useTranslation();
  const selection = useProject((s) => s.selection);
  const store = useProject;
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
