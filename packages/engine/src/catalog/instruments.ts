import type { ComponentDef } from './types.js';
import { numOptions, strOptions } from './common.js';

export const instrumentDefs: ComponentDef[] = [
  {
    type: 'multimeter',
    category: 'instruments',
    symbol: 'multimeter',
    size: () => ({ w: 70, h: 90 }),
    flags: { instrument: true },
    keywords: ['multimetr', 'multimeter', 'miernik', 'мультиметр'],
    defaultProps: { mode: 'V' },
    props: [{ key: 'mode', type: 'select', options: strOptions(['V', 'A', 'R', 'continuity']) }],
    terminals: () => [
      { id: 'p1', role: 'any', mark: '+', x: 20, y: 90, side: 'bottom' },
      { id: 'p2', role: 'any', mark: 'COM', x: 50, y: 90, side: 'bottom' },
    ],
    stamp: (ctx) => {
      const mode = ctx.props.mode || 'V';
      // Voltmeter burden 10 MΩ; ammeter shunt 10 mΩ; resistance ranges are
      // measured by the instrument model outside the energised network.
      const r = mode === 'A' ? 0.01 : 1e7;
      ctx.R(ctx.node('p1'), ctx.node('p2'), r, 'probe');
    },
    update: (ctx) => {
      const mode = ctx.props.mode || 'V';
      if (mode === 'V') ctx.meas('reading', ctx.vd(ctx.node('p1'), ctx.node('p2')));
      else if (mode === 'A') ctx.meas('reading', ctx.i('probe'));
    },
  },
  {
    type: 'clampMeter',
    category: 'instruments',
    symbol: 'clampMeter',
    size: () => ({ w: 60, h: 90 }),
    flags: { instrument: true },
    keywords: ['klešťový ampérmetr', 'clamp meter', 'cęgowy', 'струмові кліщі'],
    defaultProps: { wireId: '' },
    props: [{ key: 'wireId', type: 'text' }],
    terminals: () => [],
  },
  {
    type: 'insulationTester',
    category: 'instruments',
    symbol: 'insulationTester',
    size: () => ({ w: 80, h: 90 }),
    flags: { instrument: true },
    keywords: ['měřič izolačního odporu', 'insulation tester', 'megger', 'мегомметр'],
    defaultProps: { testV: 500 },
    props: [{ key: 'testV', type: 'select', options: numOptions([250, 500, 1000]), unit: 'V' }],
    terminals: () => [
      { id: 'p1', role: 'any', mark: '+', x: 25, y: 90, side: 'bottom' },
      { id: 'p2', role: 'any', mark: '−', x: 55, y: 90, side: 'bottom' },
    ],
  },
  {
    type: 'loopTester',
    category: 'instruments',
    symbol: 'loopTester',
    size: () => ({ w: 80, h: 90 }),
    flags: { instrument: true },
    keywords: ['měřič impedance smyčky', 'Zs', 'loop impedance', 'pętla zwarcia'],
    defaultProps: { loop: 'L-PE' },
    props: [{ key: 'loop', type: 'select', options: strOptions(['L-PE', 'L-N']) }],
    terminals: () => [
      { id: 'L', role: 'L', mark: 'L', x: 20, y: 90, side: 'bottom' },
      { id: 'N', role: 'N', mark: 'N', x: 40, y: 90, side: 'bottom' },
      { id: 'PE', role: 'PE', mark: 'PE', x: 60, y: 90, side: 'bottom' },
    ],
  },
  {
    type: 'rcdTester',
    category: 'instruments',
    symbol: 'rcdTester',
    size: () => ({ w: 80, h: 90 }),
    flags: { instrument: true },
    keywords: ['tester chráničů', 'RCD tester', 'tester RCD'],
    defaultProps: { multiplier: 1, halfWave: false },
    props: [
      { key: 'multiplier', type: 'select', options: numOptions([0.5, 1, 2, 5]) },
      { key: 'halfWave', type: 'bool', advanced: true },
    ],
    terminals: () => [
      { id: 'L', role: 'L', mark: 'L', x: 20, y: 90, side: 'bottom' },
      { id: 'N', role: 'N', mark: 'N', x: 40, y: 90, side: 'bottom' },
      { id: 'PE', role: 'PE', mark: 'PE', x: 60, y: 90, side: 'bottom' },
    ],
  },
  {
    type: 'phaseTester',
    category: 'instruments',
    symbol: 'phaseTester',
    size: () => ({ w: 80, h: 80 }),
    flags: { instrument: true },
    keywords: ['sled fází', 'phase rotation', 'kolejność faz', 'чергування фаз'],
    defaultProps: {},
    props: [],
    terminals: () => [
      { id: 'L1', role: 'L', mark: 'L1', x: 20, y: 80, side: 'bottom' },
      { id: 'L2', role: 'L', mark: 'L2', x: 40, y: 80, side: 'bottom' },
      { id: 'L3', role: 'L', mark: 'L3', x: 60, y: 80, side: 'bottom' },
    ],
    stamp: (ctx) => {
      for (const c of ['L1', 'L2', 'L3']) ctx.R(ctx.node(c), ctx.earth, 2e6, `s.${c}`);
    },
  },
  {
    type: 'socketTester',
    category: 'instruments',
    symbol: 'socketTester',
    size: () => ({ w: 60, h: 70 }),
    flags: { instrument: true },
    keywords: ['zkoušečka zásuvek', 'socket tester', 'tester gniazd'],
    defaultProps: {},
    props: [],
    terminals: () => [
      { id: 'L', role: 'L', mark: 'L', x: 15, y: 70, side: 'bottom' },
      { id: 'N', role: 'N', mark: 'N', x: 30, y: 70, side: 'bottom' },
      { id: 'PE', role: 'PE', mark: 'PE', x: 45, y: 70, side: 'bottom' },
    ],
    stamp: (ctx) => {
      ctx.R(ctx.node('L'), ctx.node('N'), 25000, 'ln');
      ctx.R(ctx.node('L'), ctx.node('PE'), 25000, 'lpe');
    },
    update: (ctx) => {
      ctx.meas('U_LN', ctx.vd(ctx.node('L'), ctx.node('N')));
      ctx.meas('U_LPE', ctx.vd(ctx.node('L'), ctx.node('PE')));
      ctx.meas('U_NPE', ctx.vd(ctx.node('N'), ctx.node('PE')));
    },
  },
];
