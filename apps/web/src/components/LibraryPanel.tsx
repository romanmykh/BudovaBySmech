import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_DEFS, CATEGORIES, getDef, sizeOf, type ComponentDef } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useUi } from '../store/ui.js';
import { nextPlacement, focusOn } from '../canvas/viewport.js';

/** The parts used in almost every basic drawing, shown first. */
const BASIC = [
  'mcb', 'rcd', 'rcbo', 'switch1', 'switch6', 'button', 'socket16', 'lampE27',
  'contactor', 'motorContactor', 'controlRelay', 'timeRelay', 'pushButton', 'overloadRelay', 'motor3f', 'signalLamp',
];

type Group = 'basic' | (typeof CATEGORIES)[number];

export function LibraryPanel(): JSX.Element {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  // Start with only the basic set open: thirteen expanded groups are a wall of text.
  const [open, setOpen] = useState<Set<Group>>(new Set(['basic']));
  const addComponent = useProject((s) => s.addComponent);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (d: ComponentDef): boolean => {
      if (!q) return true;
      const name = t(`comp.${d.type}`).toLowerCase();
      if (name.includes(q)) return true;
      if (d.type.toLowerCase().includes(q)) return true;
      return (d.keywords ?? []).some((k) => k.toLowerCase().includes(q));
    };
    const out: Array<{ cat: Group; items: ComponentDef[] }> = [];
    if (!q) out.push({ cat: 'basic', items: BASIC.map((x) => getDef(x)).filter((d): d is ComponentDef => !!d) });
    for (const cat of CATEGORIES) {
      const items = ALL_DEFS.filter((d) => d.category === cat && match(d));
      if (items.length) out.push({ cat, items });
    }
    return out;
  }, [query, t]);

  const place = (type: string) => {
    const at = nextPlacement();
    addComponent(type, at.x, at.y);
    const size = sizeOf(type, undefined);
    // Too small to tap its terminals? Zoom in on it.
    requestAnimationFrame(() => focusOn(at.x + size.w / 2, at.y + size.h / 2));
    const ui = useUi.getState();
    // On a phone the drawer covers the drawing: close it so the part is seen.
    if (ui.drawer === 'library') ui.set('drawer', null);
    if (ui.view !== 'schematic') ui.set('view', 'schematic');
  };

  const searching = query.trim().length > 0;

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg-panel)' }}>
      <div className="border-b p-2" style={{ borderColor: 'var(--border)' }}>
        <input
          type="search"
          value={query}
          placeholder={t('library.search')}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('library.search')}
          className="w-full rounded border px-2 py-1"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        />
        <div className="faint mt-1 text-[10px]">{t('library.tapHint')}</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!groups.length && <div className="dim p-3 text-center text-xs">{t('library.noResults')}</div>}
        {groups.map(({ cat, items }) => {
          const isOpen = searching || open.has(cat);
          return (
            <div key={cat}>
              <button
                className="sticky top-0 z-[1] flex w-full items-center justify-between px-2 py-2 text-left"
                style={{ background: 'var(--bg-sunken)', borderBottom: '1px solid var(--border)' }}
                onClick={() =>
                  setOpen((c) => {
                    const n = new Set(c);
                    if (n.has(cat)) n.delete(cat);
                    else n.add(cat);
                    return n;
                  })
                }
              >
                <span className="sect-title" style={cat === 'basic' ? { color: 'var(--accent)' } : undefined}>
                  {cat === 'basic' ? `★ ${t('library.basic')}` : t(`cat.${cat}`)}
                </span>
                <span className="faint text-[10px]">{isOpen ? '▾' : '▸'} {items.length}</span>
              </button>
              {isOpen && (
                <ul>
                  {items.map((d) => (
                    <li key={d.type}>
                      <button
                        className="lib-item flex w-full items-center gap-2 px-2 text-left hover:bg-[var(--bg-hover)]"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/x-budova-component', d.type);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => place(d.type)}
                        title={t('library.dragHint')}
                      >
                        <span className="faint w-4 shrink-0 text-center">+</span>
                        <span className="truncate">{t(`comp.${d.type}`)}</span>
                        {typeof d.modules === 'number' && d.modules > 0 && (
                          <span className="faint ml-auto shrink-0 text-[10px] mono">
                            {d.modules} {t('unit.modules')}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
