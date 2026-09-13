import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_DEFS, CATEGORIES, type Category, type ComponentDef } from '@budova/engine';
import { useProject } from '../store/project.js';

export function LibraryPanel(): JSX.Element {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<Category>>(new Set());
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
    return CATEGORIES.map((cat) => ({
      cat,
      items: ALL_DEFS.filter((d) => d.category === cat && match(d)),
    })).filter((g) => g.items.length);
  }, [query, t]);

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg-panel)' }}>
      <div className="border-b p-2" style={{ borderColor: 'var(--border)' }}>
        <input
          type="text"
          value={query}
          placeholder={t('library.search')}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('library.search')}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {!groups.length && <div className="dim p-3 text-center text-xs">{t('library.noResults')}</div>}
        {groups.map(({ cat, items }) => (
          <div key={cat}>
            <button
              className="sticky top-0 flex w-full items-center justify-between px-2 py-1.5 text-left"
              style={{ background: 'var(--bg-sunken)', borderBottom: '1px solid var(--border)' }}
              onClick={() =>
                setCollapsed((c) => {
                  const n = new Set(c);
                  if (n.has(cat)) n.delete(cat);
                  else n.add(cat);
                  return n;
                })
              }
            >
              <span className="sect-title">{t(`cat.${cat}`)}</span>
              <span className="faint text-[10px]">{collapsed.has(cat) ? '▸' : '▾'} {items.length}</span>
            </button>
            {!collapsed.has(cat) && (
              <ul>
                {items.map((d) => (
                  <li key={d.type}>
                    <button
                      className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-[var(--bg-hover)]"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-budova-component', d.type);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onDoubleClick={() => addComponent(d.type, 120, 120)}
                      title={t('library.dragHint')}
                    >
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
        ))}
      </div>
    </div>
  );
}
