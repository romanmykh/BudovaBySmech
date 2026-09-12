import type { ComponentDef, TerminalDef } from './types.js';
import { numOptions, strOptions } from './common.js';

function bar(id: string, role: 'N' | 'PE' | 'any', ways: number, w: number): TerminalDef[] {
  return Array.from({ length: ways }, (_, i) => ({
    id: `t${i + 1}`,
    role,
    mark: String(i + 1),
    x: Math.round(((i + 1) * w) / (ways + 1)),
    y: 25,
    side: 'bottom' as const,
  }));
}

export const terminalDefs: ComponentDef[] = [
  {
    type: 'peBar',
    category: 'terminals',
    symbol: 'peBar',
    modules: 0,
    size: (p) => ({ w: Math.max(80, (Number(p.ways) || 8) * 16), h: 25 }),
    keywords: ['PE svorkovnice', 'PE bar', 'listwa PE', 'шина PE'],
    defaultProps: { ways: 8 },
    props: [{ key: 'ways', type: 'number', min: 2, max: 24, step: 1 }],
    terminals: (p) => bar('pe', 'PE', Math.max(2, Number(p.ways) || 8), Math.max(80, (Number(p.ways) || 8) * 16)),
    stamp: (ctx) => {
      const n = Math.max(2, Number(ctx.props.ways) || 8);
      const bus = ctx.net.node(`${ctx.comp.id}::bus`);
      for (let i = 1; i <= n; i++) ctx.R(ctx.node(`t${i}`), bus, 1e-4, `b${i}`);
    },
  },
  {
    type: 'nBar',
    category: 'terminals',
    symbol: 'nBar',
    modules: 0,
    size: (p) => ({ w: Math.max(80, (Number(p.ways) || 8) * 16), h: 25 }),
    keywords: ['N svorkovnice', 'N bar', 'listwa N', 'шина N'],
    defaultProps: { ways: 8 },
    props: [{ key: 'ways', type: 'number', min: 2, max: 24, step: 1 }],
    terminals: (p) => bar('n', 'N', Math.max(2, Number(p.ways) || 8), Math.max(80, (Number(p.ways) || 8) * 16)),
    stamp: (ctx) => {
      const n = Math.max(2, Number(ctx.props.ways) || 8);
      const bus = ctx.net.node(`${ctx.comp.id}::bus`);
      for (let i = 1; i <= n; i++) ctx.R(ctx.node(`t${i}`), bus, 1e-4, `b${i}`);
    },
  },
  {
    type: 'wago',
    category: 'terminals',
    symbol: 'wago',
    modules: 0,
    size: (p) => ({ w: (Number(p.ways) || 3) * 18 + 10, h: 24 }),
    keywords: ['WAGO', 'svorka', 'złączka', 'клема', 'lever connector'],
    defaultProps: { ways: 3, role: 'any' },
    props: [
      { key: 'ways', type: 'select', options: numOptions([2, 3, 5, 8]) },
      { key: 'role', type: 'select', options: strOptions(['any', 'L', 'N', 'PE']) },
    ],
    terminals: (p) => {
      const n = Number(p.ways) || 3;
      const w = n * 18 + 10;
      const role = (p.role === 'any' ? 'any' : p.role) as any;
      return Array.from({ length: n }, (_, i) => ({
        id: `t${i + 1}`,
        role,
        mark: String(i + 1),
        x: Math.round(((i + 1) * w) / (n + 1)),
        y: 24,
        side: 'bottom' as const,
      }));
    },
    stamp: (ctx) => {
      const n = Number(ctx.props.ways) || 3;
      const bus = ctx.net.node(`${ctx.comp.id}::bus`);
      for (let i = 1; i <= n; i++) ctx.R(ctx.node(`t${i}`), bus, 1e-4, `b${i}`);
    },
  },
  {
    type: 'junctionBox',
    category: 'terminals',
    symbol: 'junctionBox',
    modules: 0,
    size: () => ({ w: 70, h: 70 }),
    keywords: ['krabice', 'junction box', 'puszka', 'розподільна коробка'],
    defaultProps: { groups: 3, ways: 4, ip: 'IP20' },
    props: [
      { key: 'groups', type: 'number', min: 1, max: 5, step: 1 },
      { key: 'ways', type: 'number', min: 2, max: 8, step: 1 },
      { key: 'ip', type: 'select', options: strOptions(['IP20', 'IP44', 'IP54', 'IP65']) },
    ],
    terminals: (p) => {
      const g = Math.max(1, Number(p.groups) || 3);
      const w = Math.max(2, Number(p.ways) || 4);
      const out: TerminalDef[] = [];
      for (let gi = 0; gi < g; gi++) {
        for (let wi = 0; wi < w; wi++) {
          out.push({
            id: `g${gi + 1}.t${wi + 1}`,
            role: gi === 0 ? 'L' : gi === 1 ? 'N' : 'PE',
            mark: `${gi + 1}.${wi + 1}`,
            x: 10 + wi * (50 / Math.max(1, w - 1)),
            y: 10 + gi * (50 / Math.max(1, g - 1)),
            side: wi < w / 2 ? 'left' : 'right',
          });
        }
      }
      return out;
    },
    stamp: (ctx) => {
      const g = Math.max(1, Number(ctx.props.groups) || 3);
      const w = Math.max(2, Number(ctx.props.ways) || 4);
      for (let gi = 1; gi <= g; gi++) {
        const bus = ctx.net.node(`${ctx.comp.id}::g${gi}`);
        for (let wi = 1; wi <= w; wi++) ctx.R(ctx.node(`g${gi}.t${wi}`), bus, 1e-4, `b${gi}.${wi}`);
      }
    },
  },
  {
    type: 'dinRail',
    category: 'terminals',
    symbol: 'dinRail',
    modules: 0,
    size: (p) => ({ w: (Number(p.modulesWide) || 12) * 20, h: 16 }),
    keywords: ['DIN lišta', 'DIN rail', 'szyna DIN'],
    defaultProps: { modulesWide: 12 },
    props: [{ key: 'modulesWide', type: 'select', options: numOptions([12, 14, 18, 24]) }],
    terminals: () => [],
  },
  {
    type: 'cableGland',
    category: 'terminals',
    symbol: 'gland',
    modules: 0,
    size: () => ({ w: 30, h: 30 }),
    keywords: ['vývodka', 'cable gland', 'dławnica'],
    defaultProps: { size: 'M20' },
    props: [{ key: 'size', type: 'select', options: strOptions(['M16', 'M20', 'M25', 'M32', 'M40']) }],
    terminals: () => [],
  },
  {
    type: 'combBusbar',
    category: 'terminals',
    symbol: 'comb',
    modules: 0,
    size: (p) => ({ w: (Number(p.modulesWide) || 12) * 20, h: 20 }),
    keywords: ['hřebenová lišta', 'comb busbar', 'grzebień', 'гребінка'],
    defaultProps: { kind: '1P', modulesWide: 12, inA: 63, phase: 'L1' },
    props: [
      { key: 'kind', type: 'select', options: strOptions(['1P', '1P+N', '3P', '3P+N']) },
      { key: 'modulesWide', type: 'select', options: numOptions([6, 12, 18, 24, 36, 57]) },
      { key: 'inA', type: 'select', options: numOptions([63, 80, 100]), unit: 'A' },
      { key: 'phase', type: 'select', options: strOptions(['L1', 'L2', 'L3']), when: (p) => p.kind === '1P' || p.kind === '1P+N' },
    ],
    terminals: (p) => {
      const n = Number(p.modulesWide) || 12;
      const roles: Array<'L' | 'N'> =
        p.kind === '1P' ? ['L'] : p.kind === '1P+N' ? ['L', 'N'] : p.kind === '3P' ? ['L', 'L', 'L'] : ['L', 'L', 'L', 'N'];
      const out: TerminalDef[] = [];
      const marks = p.kind === '3P' || p.kind === '3P+N' ? ['L1', 'L2', 'L3', 'N'] : p.kind === '1P+N' ? ['L', 'N'] : ['L'];
      for (let i = 0; i < n; i++) {
        roles.forEach((r, j) => {
          out.push({
            id: `m${i + 1}.${marks[j]}`,
            role: r,
            mark: marks[j],
            x: i * 20 + 10,
            y: 20,
            side: 'bottom',
            comb: true,
          });
        });
      }
      out.push({ id: 'feed.L1', role: 'L', mark: 'L1', x: 5, y: 0, side: 'top' });
      if (p.kind === '3P' || p.kind === '3P+N') {
        out.push({ id: 'feed.L2', role: 'L', mark: 'L2', x: 20, y: 0, side: 'top' });
        out.push({ id: 'feed.L3', role: 'L', mark: 'L3', x: 35, y: 0, side: 'top' });
      }
      if (p.kind === '1P+N' || p.kind === '3P+N') {
        out.push({ id: 'feed.N', role: 'N', mark: 'N', x: 50, y: 0, side: 'top' });
      }
      return out;
    },
    stamp: (ctx) => {
      const p = ctx.props;
      const n = Number(p.modulesWide) || 12;
      const marks = p.kind === '3P' || p.kind === '3P+N' ? ['L1', 'L2', 'L3', 'N'] : p.kind === '1P+N' ? ['L', 'N'] : ['L'];
      const lanes = p.kind === '1P' ? ['L1'] : p.kind === '1P+N' ? ['L1', 'N'] : p.kind === '3P' ? ['L1', 'L2', 'L3'] : ['L1', 'L2', 'L3', 'N'];
      lanes.forEach((lane, j) => {
        const bus = ctx.net.node(`${ctx.comp.id}::${lane}`);
        const feedId = p.kind === '1P' ? 'feed.L1' : `feed.${lane}`;
        if (ctx.net.hasNode(`${ctx.comp.id}:${feedId}`) || true) {
          ctx.R(ctx.node(feedId), bus, 1e-4, `f.${lane}`);
        }
        for (let i = 0; i < n; i++) {
          ctx.R(ctx.node(`m${i + 1}.${marks[j]}`), bus, 5e-4, `m${i}.${lane}`);
        }
      });
    },
  },
];
