import type { ComponentDef, PropSpec, TerminalDef, StampCtx, UpdateCtx } from './types.js';
import { numOptions, strOptions, R_OPEN } from './common.js';
import { loadImpedance } from '../physics/network.js';

export interface LoadOptions {
  type: string;
  symbol: string;
  keywords: string[];
  watts: number;
  pf?: number;
  phases?: 1 | 3;
  classI?: boolean;
  /** Luminaire — lights up in live mode. */
  luminaire?: boolean;
  /** Incandescent lamps dim strongly with voltage; LEDs hold up. */
  lightLaw?: 'incandescent' | 'led' | 'fluorescent';
  extraProps?: PropSpec[];
  size?: { w: number; h: number };
  /** Starting current multiple (motors, compressors). */
  inrush?: number;
  interactive?: 'toggle' | 'plug' | 'none';
}

function loadTerminals(phases: 1 | 3, w: number, h: number): TerminalDef[] {
  const cond = phases === 3 ? ['L1', 'L2', 'L3', 'N', 'PE'] : ['L', 'N', 'PE'];
  return cond.map((c, i) => ({
    id: `in.${c}`,
    role: c === 'N' ? ('N' as const) : c === 'PE' ? ('PE' as const) : ('L' as const),
    mark: c,
    x: Math.round(((i + 1) * w) / (cond.length + 1)),
    y: 0,
    side: 'top' as const,
  }));
}

export function makeLoad(o: LoadOptions): ComponentDef {
  const phases = o.phases ?? 1;
  const size = o.size ?? { w: phases === 3 ? 90 : 60, h: 60 };
  return {
    type: o.type,
    category: 'loads',
    symbol: o.symbol,
    size: () => size,
    interactive: o.interactive ?? 'toggle',
    flags: {
      load: true,
      luminaire: o.luminaire,
      classI: o.classI !== false,
      threePhase: () => phases === 3,
    },
    keywords: o.keywords,
    defaultProps: {
      watts: o.watts,
      pf: o.pf ?? 1,
      classI: o.classI !== false,
      on: true,
      ...(o.extraProps ?? []).reduce<Record<string, unknown>>((acc, p) => {
        if (p.type === 'bool') acc[p.key] = false;
        return acc;
      }, {}),
    },
    props: [
      { key: 'watts', type: 'number', unit: 'W', min: 0, max: 30000, step: 10 },
      { key: 'pf', type: 'number', min: 0.3, max: 1, step: 0.05 },
      { key: 'classI', type: 'bool' },
      { key: 'on', type: 'bool' },
      ...(phases === 3
        ? ([
            { key: 'wL1', type: 'number', unit: 'W', min: 0, max: 20000, step: 100, advanced: true },
            { key: 'wL2', type: 'number', unit: 'W', min: 0, max: 20000, step: 100, advanced: true },
            { key: 'wL3', type: 'number', unit: 'W', min: 0, max: 20000, step: 100, advanced: true },
          ] as PropSpec[])
        : []),
      ...(o.extraProps ?? []),
    ],
    terminals: () => loadTerminals(phases, size.w, size.h),
    initState: (p) => ({ on: p.on !== false, runTime: 0 }),
    stamp: (ctx: StampCtx) => {
      const cse = ctx.net.node(`${ctx.comp.id}::case`);
      const peNode = ctx.node('in.PE');
      const classI = ctx.props.classI !== false;
      if (classI) ctx.R(cse, peNode, 0.05, 'caseBond');

      const on = ctx.state.on ?? ctx.props.on !== false;
      const watts = Math.max(0, Number(ctx.props.watts) || 0);
      const pf = Number(ctx.props.pf) || 1;

      if (on && (watts > 0 || phases === 3)) {
        if (phases === 3) {
          // A real three-phase appliance is rarely balanced: individual hobs,
          // heating elements and controls sit on one phase each.
          const per = [
            Number(ctx.props.wL1),
            Number(ctx.props.wL2),
            Number(ctx.props.wL3),
          ].map((v) => (Number.isFinite(v) && v > 0 ? v : NaN));
          const anySet = per.some((v) => Number.isFinite(v));
          const w = anySet ? per.map((v) => (Number.isFinite(v) ? v : 0)) : [watts / 3, watts / 3, watts / 3];
          ['L1', 'L2', 'L3'].forEach((c, idx) => {
            if (w[idx] > 0) {
              const z = loadImpedance(w[idx], 230, pf);
              ctx.Z(ctx.node(`in.${c}`), ctx.node('in.N'), z.r, z.x, `z.${c}`);
            } else {
              ctx.R(ctx.node(`in.${c}`), ctx.node('in.N'), R_OPEN, `z.${c}`);
            }
          });
        } else {
          const z = loadImpedance(watts, 230, pf);
          ctx.Z(ctx.node('in.L'), ctx.node('in.N'), z.r, z.x, 'z.L');
        }
      } else {
        if (phases === 3) for (const c of ['L1', 'L2', 'L3']) ctx.R(ctx.node(`in.${c}`), ctx.node('in.N'), R_OPEN, `z.${c}`);
        else ctx.R(ctx.node('in.L'), ctx.node('in.N'), R_OPEN, 'z.L');
      }

      // Insulation failure inside the appliance: a fault between a live part
      // and the exposed conductive part (the enclosure).
      for (const f of ctx.myFaults()) {
        if (!f.enabled) continue;
        if (f.kind === 'earthFault' || f.kind === 'insulation') {
          const live = phases === 3 ? 'in.L1' : 'in.L';
          const from = f.terminal && f.terminal !== 'auto' ? f.terminal : live;
          ctx.R(ctx.node(from), cse, Math.max(0.01, Number(f.resistance) ?? 0.1), 'fault');
        }
      }
    },
    update: (ctx: UpdateCtx) => {
      const classI = ctx.props.classI !== false;
      const cseNode = (ctx as any).internalNode?.('case');
      const watts = Math.max(0, Number(ctx.props.watts) || 0);
      let u = 0;
      let i = 0;
      if (phases === 3) {
        for (const c of ['L1', 'L2', 'L3']) {
          const uc = ctx.vd(ctx.node(`in.${c}`), ctx.node('in.N'));
          const ic = ctx.i(`z.${c}`);
          ctx.meas(`U_${c}`, uc);
          ctx.meas(`I_${c}`, ic);
          u = Math.max(u, uc);
          i = Math.max(i, ic);
        }
        // Phase sequence at the terminals: +1 clockwise (L1-L2-L3), -1 reversed,
        // 0 when a phase is missing — the motor then hums instead of running.
        const vs = ['L1', 'L2', 'L3'].map((c) => ctx.sol.v(ctx.node(`in.${c}`)));
        const mags = vs.map((v) => Math.hypot(v.re, v.im));
        if (mags.every((m) => m > 0.5 * 230)) {
          const a1 = Math.atan2(vs[0]!.im, vs[0]!.re);
          const a2 = Math.atan2(vs[1]!.im, vs[1]!.re);
          let d = ((a1 - a2) * 180) / Math.PI;
          d = ((d % 360) + 360) % 360;
          ctx.meas('rotation', d > 60 && d < 180 ? 1 : d > 180 && d < 300 ? -1 : 0);
        } else ctx.meas('rotation', 0);
      } else {
        u = ctx.vd(ctx.node('in.L'), ctx.node('in.N'));
        i = ctx.i('z.L');
        ctx.meas('U', u);
        ctx.meas('I', i);
      }
      ctx.meas('P', u * i * (Number(ctx.props.pf) || 1) * (phases === 3 ? 3 : 1));
      if (cseNode !== undefined) ctx.meas('U_case', ctx.v(cseNode));
      if (o.luminaire) {
        const law = o.lightLaw ?? 'led';
        const ratio = Math.min(1.3, u / 230);
        let b = 0;
        if (ratio > 0.05) {
          if (law === 'incandescent') b = Math.pow(ratio, 3.4);
          else if (law === 'fluorescent') b = ratio < 0.75 ? 0 : Math.min(1, (ratio - 0.7) / 0.3);
          else b = ratio < 0.35 ? 0 : Math.min(1, (ratio - 0.3) / 0.5);
        }
        ctx.meas('brightness', Math.max(0, Math.min(1, b)));
      }
      if (!classI) ctx.meas('classII', 1);
    },
  };
}

export const loadDefs: ComponentDef[] = [
  makeLoad({
    type: 'lampE27',
    symbol: 'lamp',
    keywords: ['žárovka', 'svítidlo', 'lamp', 'żarówka', 'лампа'],
    watts: 60,
    luminaire: true,
    lightLaw: 'incandescent',
    classI: false,
    extraProps: [{ key: 'ledLamp', type: 'bool' }],
  }),
  makeLoad({
    type: 'ledPanel',
    symbol: 'ledPanel',
    keywords: ['LED panel', 'panel LED', 'светильник'],
    watts: 36,
    pf: 0.9,
    luminaire: true,
    lightLaw: 'led',
    size: { w: 80, h: 50 },
  }),
  makeLoad({
    type: 'ledStrip',
    symbol: 'ledStrip',
    keywords: ['LED pásek', 'LED strip', 'taśma LED', 'драйвер'],
    watts: 50,
    pf: 0.9,
    luminaire: true,
    lightLaw: 'led',
    classI: false,
    size: { w: 90, h: 50 },
  }),
  makeLoad({
    type: 'fluorescent',
    symbol: 'fluorescent',
    keywords: ['zářivka', 'fluorescent', 'świetlówka', 'люмінесцентний'],
    watts: 58,
    pf: 0.85,
    luminaire: true,
    lightLaw: 'fluorescent',
    size: { w: 90, h: 45 },
  }),
  makeLoad({
    type: 'boiler',
    symbol: 'boiler',
    keywords: ['bojler', 'ohřívač vody', 'water heater', 'podgrzewacz', 'бойлер'],
    watts: 2000,
    size: { w: 70, h: 70 },
  }),
  makeLoad({
    type: 'cooker3f',
    symbol: 'cooker',
    keywords: ['sporák', 'varná deska', 'cooker', 'kuchenka', 'плита'],
    watts: 7000,
    phases: 3,
    size: { w: 100, h: 70 },
  }),
  makeLoad({
    type: 'oven',
    symbol: 'oven',
    keywords: ['trouba', 'oven', 'piekarnik', 'духовка'],
    watts: 3000,
    size: { w: 70, h: 70 },
  }),
  makeLoad({
    type: 'washingMachine',
    symbol: 'washer',
    keywords: ['pračka', 'washing machine', 'pralka', 'пральна машина'],
    watts: 2200,
    pf: 0.95,
    size: { w: 70, h: 70 },
  }),
  makeLoad({
    type: 'dishwasher',
    symbol: 'dishwasher',
    keywords: ['myčka', 'dishwasher', 'zmywarka', 'посудомийка'],
    watts: 1900,
    pf: 0.95,
    size: { w: 70, h: 70 },
  }),
  makeLoad({
    type: 'floorHeating',
    symbol: 'floorHeating',
    keywords: ['podlahové topení', 'underfloor heating', 'ogrzewanie podłogowe'],
    watts: 1200,
    size: { w: 90, h: 50 },
  }),
  makeLoad({
    type: 'airCon',
    symbol: 'airCon',
    keywords: ['klimatizace', 'air conditioner', 'klimatyzacja', 'кондиціонер'],
    watts: 1500,
    pf: 0.9,
    inrush: 3,
    size: { w: 80, h: 60 },
  }),
  makeLoad({
    type: 'heatPump',
    symbol: 'heatPump',
    keywords: ['tepelné čerpadlo', 'heat pump', 'pompa ciepła', 'тепловий насос'],
    watts: 4500,
    pf: 0.95,
    phases: 3,
    inrush: 3,
    size: { w: 100, h: 70 },
  }),
  makeLoad({
    type: 'motor3f',
    symbol: 'motor',
    keywords: ['motor', 'silnik', 'двигун', 'двигатель'],
    watts: 2200,
    pf: 0.82,
    phases: 3,
    inrush: 6,
    size: { w: 80, h: 70 },
  }),
  makeLoad({
    type: 'machine',
    symbol: 'machine',
    keywords: ['stroj', 'machine', 'maszyna', 'верстат'],
    watts: 3000,
    pf: 0.85,
    phases: 3,
    size: { w: 90, h: 70 },
  }),
  makeLoad({
    type: 'genericLoad',
    symbol: 'genericLoad',
    keywords: ['spotřebič', 'load', 'odbiornik', 'навантаження', 'нагрузка'],
    watts: 1000,
    pf: 1,
    size: { w: 70, h: 60 },
  }),
  makeLoad({
    type: 'genericLoad3f',
    symbol: 'genericLoad',
    keywords: ['třífázový spotřebič', 'three-phase load', 'трифазне навантаження'],
    watts: 3000,
    pf: 0.9,
    phases: 3,
    size: { w: 90, h: 60 },
  }),
];

/* The EV charging point needs its own logic: it draws a settable current and
 * produces a smooth DC residual component when its internal rectifier fails. */
export const evseDef: ComponentDef = {
  type: 'evse',
  category: 'loads',
  symbol: 'evse',
  size: (p) => ({ w: Number(p.phases) === 3 ? 100 : 70, h: 80 }),
  interactive: 'toggle',
  flags: { load: true, classI: true, threePhase: (p) => Number(p.phases) === 3 },
  keywords: ['wallbox', 'nabíječka', 'EV', 'ładowarka', 'зарядна станція'],
  defaultProps: { phases: 3, powerKw: 11, chargingA: 16, on: true, classI: true, pf: 1, rdcDd: true },
  props: [
    { key: 'phases', type: 'select', options: numOptions([1, 3]) },
    { key: 'powerKw', type: 'select', options: numOptions([3.7, 7.4, 11, 22]), unit: 'kW' },
    { key: 'chargingA', type: 'number', unit: 'A', min: 6, max: 32, step: 1 },
    { key: 'on', type: 'bool' },
    { key: 'rdcDd', type: 'bool', advanced: true },
    { key: 'classI', type: 'bool', advanced: true },
  ],
  terminals: (p) => loadTerminals(Number(p.phases) === 3 ? 3 : 1, Number(p.phases) === 3 ? 100 : 70, 80),
  initState: (p) => ({ on: p.on !== false, charging: true }),
  stamp: (ctx) => {
    const three = Number(ctx.props.phases) === 3;
    const cse = ctx.net.node(`${ctx.comp.id}::case`);
    if (ctx.props.classI !== false) ctx.R(cse, ctx.node('in.PE'), 0.05, 'caseBond');
    const on = ctx.state.on ?? true;
    if (!on) return;
    const a = Math.max(0, Number(ctx.props.chargingA) || 16);
    const maxKw = Number(ctx.props.powerKw) || 11;
    const maxA = (maxKw * 1000) / (three ? 3 * 230 : 230);
    const useA = Math.min(a, maxA);
    if (useA <= 0) return;
    const r = 230 / useA;
    if (three) for (const c of ['L1', 'L2', 'L3']) ctx.Z(ctx.node(`in.${c}`), ctx.node('in.N'), r, 0, `z.${c}`);
    else ctx.Z(ctx.node('in.L'), ctx.node('in.N'), r, 0, 'z.L');
    for (const f of ctx.myFaults()) {
      if (f.enabled && (f.kind === 'earthFault' || f.kind === 'insulation')) {
        ctx.R(ctx.node(three ? 'in.L1' : 'in.L'), cse, Math.max(0.01, Number(f.resistance) ?? 0.1), 'fault');
      }
    }
  },
  update: (ctx) => {
    const three = Number(ctx.props.phases) === 3;
    let total = 0;
    if (three) {
      for (const c of ['L1', 'L2', 'L3']) {
        const i = ctx.i(`z.${c}`);
        ctx.meas(`I_${c}`, i);
        total += i * ctx.vd(ctx.node(`in.${c}`), ctx.node('in.N'));
      }
    } else {
      const i = ctx.i('z.L');
      ctx.meas('I', i);
      total = i * ctx.vd(ctx.node('in.L'), ctx.node('in.N'));
    }
    ctx.meas('P', total);
  },
};

loadDefs.push(evseDef);
