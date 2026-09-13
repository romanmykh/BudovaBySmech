import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_DEFS, CATEGORIES } from '@budova/engine';
import { useProject } from '../store/project.js';
export function LibraryPanel() {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState(new Set());
    const addComponent = useProject((s) => s.addComponent);
    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const match = (d) => {
            if (!q)
                return true;
            const name = t(`comp.${d.type}`).toLowerCase();
            if (name.includes(q))
                return true;
            if (d.type.toLowerCase().includes(q))
                return true;
            return (d.keywords ?? []).some((k) => k.toLowerCase().includes(q));
        };
        return CATEGORIES.map((cat) => ({
            cat,
            items: ALL_DEFS.filter((d) => d.category === cat && match(d)),
        })).filter((g) => g.items.length);
    }, [query, t]);
    return (_jsxs("div", { className: "flex h-full flex-col", style: { background: 'var(--bg-panel)' }, children: [_jsx("div", { className: "border-b p-2", style: { borderColor: 'var(--border)' }, children: _jsx("input", { type: "text", value: query, placeholder: t('library.search'), onChange: (e) => setQuery(e.target.value), "aria-label": t('library.search') }) }), _jsxs("div", { className: "flex-1 overflow-y-auto", children: [!groups.length && _jsx("div", { className: "dim p-3 text-center text-xs", children: t('library.noResults') }), groups.map(({ cat, items }) => (_jsxs("div", { children: [_jsxs("button", { className: "sticky top-0 flex w-full items-center justify-between px-2 py-1.5 text-left", style: { background: 'var(--bg-sunken)', borderBottom: '1px solid var(--border)' }, onClick: () => setCollapsed((c) => {
                                    const n = new Set(c);
                                    if (n.has(cat))
                                        n.delete(cat);
                                    else
                                        n.add(cat);
                                    return n;
                                }), children: [_jsx("span", { className: "sect-title", children: t(`cat.${cat}`) }), _jsxs("span", { className: "faint text-[10px]", children: [collapsed.has(cat) ? '▸' : '▾', " ", items.length] })] }), !collapsed.has(cat) && (_jsx("ul", { children: items.map((d) => (_jsx("li", { children: _jsxs("button", { className: "flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-[var(--bg-hover)]", draggable: true, onDragStart: (e) => {
                                            e.dataTransfer.setData('application/x-budova-component', d.type);
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }, onDoubleClick: () => addComponent(d.type, 120, 120), title: t('library.dragHint'), children: [_jsx("span", { className: "truncate", children: t(`comp.${d.type}`) }), typeof d.modules === 'number' && d.modules > 0 && (_jsxs("span", { className: "faint ml-auto shrink-0 text-[10px] mono", children: [d.modules, " ", t('unit.modules')] }))] }) }, d.type))) }))] }, cat)))] })] }));
}
