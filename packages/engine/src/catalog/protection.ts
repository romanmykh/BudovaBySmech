import type { ComponentDef, UpdateCtx, StampCtx } from './types.js';
import { parseContacts, contactsWidth, contactColumns, contactTerminals, stampContacts } from './contacts.js';
import {
  Poles, poleConductors, protectedConductors, seriesTerminals, numOptions, strOptions,
  R_OPEN, R_CLOSED, isThreePhase,
} from './common.js';
import {
  mcbTripTime, fuseTripTime, rcdTripTime, rcdSenses, rcdBlindedBy, rcdActualTripCurrent,
  afddTripTime, EV_DC_THRESHOLD, McbCurve, RcdType, RcdDelay, FuseKind,
} from '../devices/curves.js';
import { cadd, cabs, ZERO, Cx } from '../physics/complex.js';

const REF_OVERCURRENT = 'ČSN 33 2000-4-43 ed. 2';
const REF_SHOCK = 'ČSN 33 2000-4-41 ed. 3';
const REF_ARC = 'ČSN 33 2000-4-42 ed. 2';
const REF_SPD = 'ČSN 33 2000-5-53 ed. 2';

/** Thermal memory time constant of an MCB bimetal (seconds). */
const COOLING_TAU = 900;

function poleWidth(poles: Poles): number {
  return poleConductors(poles).length * 20 + 20;
}

/* ------------------------------------------------------------------ */
/* Shared overcurrent behaviour                                        */
/* ------------------------------------------------------------------ */

function stampSeries(ctx: StampCtx, poles: Poles, closed: boolean): void {
  for (const c of poleConductors(poles)) {
    ctx.R(ctx.node(`in.${c.id}`), ctx.node(`out.${c.id}`), closed ? R_CLOSED : R_OPEN, `p.${c.id}`);
  }
}

interface OvercurrentResult {
  maxCurrent: number;
  trippedNow: boolean;
  region: 'thermal' | 'magnetic' | 'none';
  timeToTrip: number;
}

function runMcbLogic(ctx: UpdateCtx, poles: Poles): OvercurrentResult {
  const inA = Number(ctx.props.inA) || 16;
  const curve = (ctx.props.curve || 'B') as McbCurve;
  const st = ctx.state;
  let maxI = 0;
  for (const c of protectedConductors(poles)) {
    const i = ctx.i(`p.${c}`);
    ctx.meas(`I_${c}`, i);
    if (i > maxI) maxI = i;
  }
  ctx.meas('I', maxI);
  const res: OvercurrentResult = { maxCurrent: maxI, trippedNow: false, region: 'none', timeToTrip: Infinity };
  if (st.tripped || !st.closed) {
    st.damage = Math.max(0, (st.damage ?? 0) - ctx.env.dt / COOLING_TAU);
    st.magTimer = 0;
    return res;
  }

  const icn = Number(ctx.props.icn) || 6000;
  if (maxI > icn && !st.capacityWarned) {
    st.capacityWarned = true;
    ctx.log({
      key: 'log.breakingCapacityExceeded',
      vars: { label: ctx.comp.label || ctx.comp.type, i: Math.round(maxI), icn },
      level: 'danger',
      comp: ctx.comp.id,
      ref: 'ČSN EN 60898-1',
      refToVerify: true,
    });
  }

  const trip = mcbTripTime(maxI, inA, curve);
  res.region = trip.region;
  res.timeToTrip = trip.time;
  if (trip.region === 'magnetic') {
    st.magTimer = (st.magTimer ?? 0) + ctx.env.dt;
    if (st.magTimer >= trip.time) {
      st.tripped = true;
      st.tripReason = 'magnetic';
      res.trippedNow = true;
      ctx.log({
        key: 'log.mcbTripMagnetic',
        vars: { label: ctx.comp.label || 'MCB', i: Math.round(maxI), inA, curve, ms: Math.round(trip.time * 1000) },
        level: 'trip',
        comp: ctx.comp.id,
        ref: `${REF_OVERCURRENT}, 434`,
      });
      ctx.invalidate();
    }
  } else {
    st.magTimer = 0;
    if (Number.isFinite(trip.time)) {
      st.damage = (st.damage ?? 0) + ctx.env.dt / trip.time;
      if (st.damage >= 1) {
        st.tripped = true;
        st.tripReason = 'thermal';
        st.damage = 1;
        res.trippedNow = true;
        ctx.log({
          key: 'log.mcbTripThermal',
          vars: {
            label: ctx.comp.label || 'MCB',
            i: maxI.toFixed(1),
            inA,
            s: Math.round(trip.time),
          },
          level: 'trip',
          comp: ctx.comp.id,
          ref: `${REF_OVERCURRENT}, 433`,
        });
        ctx.invalidate();
      }
    } else {
      st.damage = Math.max(0, (st.damage ?? 0) - ctx.env.dt / COOLING_TAU);
    }
  }
  ctx.meas('thermalLoad', Math.min(1, st.damage ?? 0));
  // Remaining time before the thermal element operates, for the inspector and
  // for the adaptive time step of the simulator.
  if (res.region === 'thermal' && Number.isFinite(trip.time)) {
    st.tripInS = (1 - (st.damage ?? 0)) * trip.time;
    ctx.meas('tripIn', st.tripInS);
  } else {
    st.tripInS = undefined;
  }
  return res;
}

/** Residual current seen by an RCD, split by waveform. */
function residualOf(ctx: UpdateCtx, poles: Poles): { ac: number; dc: number; waveforms: Set<string> } {
  let sum: Cx = ZERO;
  for (const c of poleConductors(poles)) sum = cadd(sum, ctx.ic(`p.${c.id}`));
  const ac = cabs(sum);
  let dc = 0;
  const waveforms = new Set<string>(['ac']);
  for (const f of ctx.env.faults) {
    if (!f.enabled || f.kind !== 'dcResidual') continue;
    if (!(ctx as any).isDownstream?.(f.target)) continue;
    dc += Number(f.dcResidual) || 0;
    waveforms.add('smoothDC');
  }
  return { ac, dc, waveforms };
}

function runRcdLogic(ctx: UpdateCtx, poles: Poles): void {
  const st = ctx.state;
  const idn = (Number(ctx.props.idn) || 30) / 1000;
  const type = (ctx.props.rcdType || 'A') as RcdType;
  const delay = (ctx.props.delay || 'instant') as RcdDelay;
  const { ac, dc } = residualOf(ctx, poles);
  ctx.meas('Idelta', ac);
  ctx.meas('IdeltaDC', dc);

  if (st.tripped || !st.closed) {
    st.residTimer = 0;
    return;
  }

  // Type AC and A devices are saturated by a smooth DC residual and stop working.
  const blinded = rcdBlindedBy(type, dc);
  if (blinded && !st.blindWarned) {
    st.blindWarned = true;
    ctx.log({
      key: 'log.rcdBlindedByDc',
      vars: { label: ctx.comp.label || 'RCD', type, mA: Math.round(dc * 1000) },
      level: 'danger',
      comp: ctx.comp.id,
      ref: 'ČSN EN 62423',
      refToVerify: true,
    });
  }

  // An EV / type B device also responds to smooth DC above 6 mA.
  const dcDetected = (type === 'EV' || type === 'B' || type === 'B+') && dc > EV_DC_THRESHOLD;
  const senseAc = rcdSenses(type, 'ac') && !blinded;
  const effective = (senseAc ? ac : 0);
  const threshold = rcdActualTripCurrent(idn);

  if (dcDetected) {
    st.tripped = true;
    st.tripReason = 'residual-dc';
    ctx.log({
      key: 'log.rcdTripDc',
      vars: { label: ctx.comp.label || 'RCD', mA: (dc * 1000).toFixed(1) },
      level: 'trip',
      comp: ctx.comp.id,
      ref: 'ČSN EN 62955',
      refToVerify: true,
    });
    ctx.invalidate();
    return;
  }

  if (effective >= threshold) {
    const timing = rcdTripTime(effective, idn, delay);
    st.residTimer = (st.residTimer ?? 0) + ctx.env.dt;
    ctx.meas('tripIn', Math.max(0, timing.typical - st.residTimer));
    if (st.residTimer >= timing.typical) {
      st.tripped = true;
      st.tripReason = 'residual';
      st.lastTripTime = timing.typical;
      ctx.log({
        key: 'log.rcdTrip',
        vars: {
          label: ctx.comp.label || 'RCD',
          mA: Math.round(effective * 1000),
          idn: Math.round(idn * 1000),
          ms: Math.round(timing.typical * 1000),
        },
        level: 'trip',
        comp: ctx.comp.id,
        ref: `${REF_SHOCK}, 411.3.3`,
      });
      ctx.invalidate();
    }
  } else {
    st.residTimer = 0;
    if (effective > 0.3 * idn && !st.nearWarned) {
      st.nearWarned = true;
      ctx.log({
        key: 'log.rcdLeakageHigh',
        vars: { label: ctx.comp.label || 'RCD', mA: Math.round(effective * 1000) },
        level: 'warn',
        comp: ctx.comp.id,
      });
    }
  }
  if (blinded && ac >= threshold) {
    if (!st.blindFailWarned) {
      st.blindFailWarned = true;
      ctx.log({
        key: 'log.rcdFailedToTrip',
        vars: { label: ctx.comp.label || 'RCD', type, mA: Math.round(ac * 1000) },
        level: 'danger',
        comp: ctx.comp.id,
        ref: `${REF_SHOCK}, 411.3.3`,
      });
    }
  }
}

const CURVE_OPTIONS = strOptions(['B', 'C', 'D']);
const MCB_RATINGS = numOptions([2, 4, 6, 10, 13, 16, 20, 25, 32, 40, 50, 63]);
const RCD_TYPES = strOptions(['AC', 'A', 'F', 'B', 'B+', 'EV']);
const IDN_OPTIONS = numOptions([10, 30, 100, 300, 500]);
const DELAY_OPTIONS = strOptions(['instant', 'S', 'G']);

/* ------------------------------------------------------------------ */

export const protectionDefs: ComponentDef[] = [
  {
    type: 'mcb',
    category: 'protection',
    symbol: 'mcb',
    modules: (p) => poleConductors(p.poles as Poles).length,
    size: (p) => ({ w: poleWidth(p.poles as Poles), h: 60 }),
    interactive: 'toggle',
    flags: { protective: true, overcurrent: true, threePhase: (p) => isThreePhase(p.poles) },
    keywords: ['jistič', 'wyłącznik', 'автомат', 'breaker', 'MCB'],
    defaultProps: { inA: 16, curve: 'B', poles: '1P', icn: 6000 },
    props: [
      { key: 'inA', type: 'select', options: MCB_RATINGS, unit: 'A' },
      { key: 'curve', type: 'select', options: CURVE_OPTIONS },
      { key: 'poles', type: 'select', options: strOptions(['1P', '1P+N', '2P', '3P', '4P']) },
      { key: 'icn', type: 'select', options: numOptions([6000, 10000]), unit: 'A', advanced: true },
    ],
    terminals: (p) => seriesTerminals(p.poles as Poles, poleWidth(p.poles as Poles), 60),
    initState: () => ({ closed: true, tripped: false, damage: 0, magTimer: 0 }),
    stamp: (ctx) => stampSeries(ctx, ctx.props.poles as Poles, ctx.state.closed && !ctx.state.tripped),
    update: (ctx) => {
      runMcbLogic(ctx, ctx.props.poles as Poles);
    },
  },

  {
    type: 'mainBreaker',
    category: 'supply',
    symbol: 'mcb',
    modules: (p) => poleConductors(p.poles as Poles).length,
    size: (p) => ({ w: poleWidth(p.poles as Poles), h: 60 }),
    interactive: 'toggle',
    flags: { protective: true, overcurrent: true, threePhase: (p) => isThreePhase(p.poles) },
    keywords: ['hlavní jistič', 'main breaker', 'główny'],
    defaultProps: { inA: 25, curve: 'B', poles: '3P', icn: 10000 },
    props: [
      { key: 'inA', type: 'select', options: numOptions([16, 20, 25, 32, 40, 50, 63, 80, 100]), unit: 'A' },
      { key: 'curve', type: 'select', options: CURVE_OPTIONS },
      { key: 'poles', type: 'select', options: strOptions(['1P', '1P+N', '3P', '4P']) },
      { key: 'icn', type: 'select', options: numOptions([6000, 10000, 15000]), unit: 'A', advanced: true },
    ],
    terminals: (p) => seriesTerminals(p.poles as Poles, poleWidth(p.poles as Poles), 60),
    initState: () => ({ closed: true, tripped: false, damage: 0, magTimer: 0 }),
    stamp: (ctx) => stampSeries(ctx, ctx.props.poles as Poles, ctx.state.closed && !ctx.state.tripped),
    update: (ctx) => {
      runMcbLogic(ctx, ctx.props.poles as Poles);
    },
  },

  {
    type: 'rcd',
    category: 'protection',
    symbol: 'rcd',
    modules: (p) => (isThreePhase(p.poles as Poles) ? 4 : 2),
    size: (p) => ({ w: poleWidth(p.poles as Poles), h: 60 }),
    interactive: 'toggle',
    flags: { protective: true, rcd: true, threePhase: (p) => isThreePhase(p.poles) },
    keywords: ['proudový chránič', 'chránič', 'RCD', 'różnicowoprądowy', 'ПЗВ', 'УЗО'],
    defaultProps: { inA: 40, idn: 30, rcdType: 'A', poles: '2P', delay: 'instant' },
    props: [
      { key: 'inA', type: 'select', options: numOptions([16, 25, 40, 63, 80, 100]), unit: 'A' },
      { key: 'idn', type: 'select', options: IDN_OPTIONS, unit: 'mA' },
      { key: 'rcdType', type: 'select', options: RCD_TYPES },
      { key: 'poles', type: 'select', options: strOptions(['2P', '4P']) },
      { key: 'delay', type: 'select', options: DELAY_OPTIONS },
    ],
    terminals: (p) => seriesTerminals(p.poles as Poles, poleWidth(p.poles as Poles), 60),
    initState: () => ({ closed: true, tripped: false, residTimer: 0 }),
    stamp: (ctx) => stampSeries(ctx, ctx.props.poles as Poles, ctx.state.closed && !ctx.state.tripped),
    update: (ctx) => {
      const poles = ctx.props.poles as Poles;
      runRcdLogic(ctx, poles);
      // An RCD without an integral overcurrent release still has a rated current.
      let maxI = 0;
      for (const c of poleConductors(poles)) maxI = Math.max(maxI, ctx.i(`p.${c.id}`));
      ctx.meas('I', maxI);
      if (maxI > Number(ctx.props.inA) * 1.2 && !ctx.state.overWarned) {
        ctx.state.overWarned = true;
        ctx.log({
          key: 'log.rcdOverloaded',
          vars: { label: ctx.comp.label || 'RCD', i: Math.round(maxI), inA: ctx.props.inA },
          level: 'warn',
          comp: ctx.comp.id,
          ref: REF_OVERCURRENT,
        });
      }
    },
  },

  {
    type: 'rcbo',
    category: 'protection',
    symbol: 'rcbo',
    modules: (p) => (isThreePhase(p.poles as Poles) ? 4 : 2),
    size: (p) => ({ w: poleWidth(p.poles as Poles), h: 60 }),
    interactive: 'toggle',
    flags: { protective: true, rcd: true, overcurrent: true, threePhase: (p) => isThreePhase(p.poles) },
    keywords: ['chránič s jističem', 'RCBO', 'kombinovaný', 'дифавтомат'],
    defaultProps: { inA: 16, curve: 'B', idn: 30, rcdType: 'A', poles: '1P+N', delay: 'instant', icn: 6000 },
    props: [
      { key: 'inA', type: 'select', options: MCB_RATINGS, unit: 'A' },
      { key: 'curve', type: 'select', options: CURVE_OPTIONS },
      { key: 'idn', type: 'select', options: IDN_OPTIONS, unit: 'mA' },
      { key: 'rcdType', type: 'select', options: RCD_TYPES },
      { key: 'poles', type: 'select', options: strOptions(['1P+N', '2P', '3P+N', '4P']) },
      { key: 'delay', type: 'select', options: DELAY_OPTIONS, advanced: true },
      { key: 'icn', type: 'select', options: numOptions([6000, 10000]), unit: 'A', advanced: true },
    ],
    terminals: (p) => seriesTerminals(p.poles as Poles, poleWidth(p.poles as Poles), 60),
    initState: () => ({ closed: true, tripped: false, damage: 0, magTimer: 0, residTimer: 0 }),
    stamp: (ctx) => stampSeries(ctx, ctx.props.poles as Poles, ctx.state.closed && !ctx.state.tripped),
    update: (ctx) => {
      const poles = ctx.props.poles as Poles;
      runMcbLogic(ctx, poles);
      if (!ctx.state.tripped) runRcdLogic(ctx, poles);
    },
  },

  {
    type: 'afdd',
    category: 'protection',
    symbol: 'afdd',
    modules: (p) => (p.withMcb ? 2 : 1),
    size: (p) => ({ w: p.withMcb ? 60 : 40, h: 60 }),
    interactive: 'toggle',
    flags: { protective: true, overcurrent: true },
    keywords: ['obloukový', 'AFDD', 'arc fault', 'łukowy'],
    defaultProps: { withMcb: true, inA: 16, curve: 'B', poles: '1P+N', icn: 6000 },
    props: [
      { key: 'withMcb', type: 'bool' },
      { key: 'inA', type: 'select', options: MCB_RATINGS, unit: 'A', when: (p) => !!p.withMcb },
      { key: 'curve', type: 'select', options: CURVE_OPTIONS, when: (p) => !!p.withMcb },
      { key: 'poles', type: 'select', options: strOptions(['1P+N', '2P']) },
      { key: 'icn', type: 'select', options: numOptions([6000, 10000]), unit: 'A', advanced: true },
    ],
    terminals: (p) => seriesTerminals(p.poles as Poles, p.withMcb ? 60 : 40, 60),
    initState: () => ({ closed: true, tripped: false, damage: 0, magTimer: 0, arcTimer: 0 }),
    stamp: (ctx) => stampSeries(ctx, ctx.props.poles as Poles, ctx.state.closed && !ctx.state.tripped),
    update: (ctx) => {
      const poles = ctx.props.poles as Poles;
      if (ctx.props.withMcb) runMcbLogic(ctx, poles);
      const st = ctx.state;
      if (st.tripped || !st.closed) {
        st.arcTimer = 0;
        return;
      }
      const arcs = ctx.env.faults.filter(
        (f) => f.enabled && f.kind === 'arc' && (ctx as any).isDownstream?.(f.target),
      );
      if (arcs.length === 0) {
        st.arcTimer = 0;
        return;
      }
      const current = Math.max(...arcs.map((f) => Number(f.arcCurrent) || ctx.i('p.L') || 0));
      const t = afddTripTime(current);
      if (!Number.isFinite(t)) {
        if (!st.arcLowWarned) {
          st.arcLowWarned = true;
          ctx.log({
            key: 'log.afddBelowThreshold',
            vars: { label: ctx.comp.label || 'AFDD', a: current.toFixed(1) },
            level: 'warn',
            comp: ctx.comp.id,
            ref: 'ČSN EN 62606',
          });
        }
        return;
      }
      st.arcTimer += ctx.env.dt;
      if (st.arcTimer >= t) {
        st.tripped = true;
        st.tripReason = 'arc';
        ctx.log({
          key: 'log.afddTrip',
          vars: { label: ctx.comp.label || 'AFDD', a: current.toFixed(1), ms: Math.round(t * 1000) },
          level: 'trip',
          comp: ctx.comp.id,
          ref: `${REF_ARC}, 421.7`,
          refToVerify: true,
        });
        ctx.invalidate();
      }
    },
  },

  {
    type: 'spd',
    category: 'protection',
    symbol: 'spd',
    modules: (p) => (p.poles === '3P+N' ? 4 : 2),
    size: (p) => ({ w: p.poles === '3P+N' ? 100 : 60, h: 60 }),
    flags: { protective: true },
    keywords: ['svodič přepětí', 'SPD', 'przepięciowy', 'ОПН'],
    defaultProps: { spdType: 'T1+T2', poles: '1P+N', up: 1500, uc: 275, backupFuse: true },
    props: [
      { key: 'spdType', type: 'select', options: strOptions(['T1', 'T2', 'T1+T2', 'T3']) },
      { key: 'poles', type: 'select', options: strOptions(['1P+N', '3P+N']) },
      { key: 'up', type: 'number', unit: 'V', min: 600, max: 4000, step: 50, advanced: true },
      { key: 'uc', type: 'number', unit: 'V', min: 250, max: 440, step: 5, advanced: true },
      { key: 'backupFuse', type: 'bool', advanced: true },
    ],
    terminals: (p) => {
      const three = p.poles === '3P+N';
      const cond = three ? ['L1', 'L2', 'L3', 'N'] : ['L', 'N'];
      const w = three ? 100 : 60;
      const t = cond.map((c, i) => ({
        id: `in.${c}`,
        role: c === 'N' ? ('N' as const) : ('L' as const),
        mark: c,
        x: Math.round(((i + 1) * w) / (cond.length + 2)),
        y: 0,
        side: 'top' as const,
      }));
      t.push({ id: 'PE', role: 'PE' as any, mark: 'PE', x: w - 15, y: 60, side: 'bottom' as any });
      return t as any;
    },
    initState: () => ({ conducting: false, degraded: false, energy: 0, operations: 0 }),
    stamp: (ctx) => {
      const three = ctx.props.poles === '3P+N';
      const cond = three ? ['L1', 'L2', 'L3'] : ['L'];
      const pe = ctx.node('PE');
      const st = ctx.state;
      // Varistor: near-open below Uc, low impedance above Up.
      const r = st.degraded ? 1e9 : st.conducting ? 0.5 : 2e6;
      for (const c of cond) ctx.R(ctx.node(`in.${c}`), pe, r, `v.${c}`);
      ctx.R(ctx.node('in.N'), pe, st.conducting ? 0.2 : 2e6, 'v.N');
    },
    update: (ctx) => {
      const three = ctx.props.poles === '3P+N';
      const cond = three ? ['L1', 'L2', 'L3'] : ['L'];
      const uc = Number(ctx.props.uc) || 275;
      const st = ctx.state;
      let maxU = 0;
      let totalI = 0;
      for (const c of cond) {
        maxU = Math.max(maxU, ctx.vd(ctx.node(`in.${c}`), ctx.node('PE')));
        totalI += ctx.i(`v.${c}`);
      }
      ctx.meas('U', maxU);
      ctx.meas('I', totalI);
      if (st.degraded) return;
      const shouldConduct = maxU > uc * 1.1;
      if (shouldConduct !== st.conducting) {
        st.conducting = shouldConduct;
        ctx.invalidate();
        if (shouldConduct) {
          st.operations++;
          ctx.log({
            key: 'log.spdConducting',
            vars: { label: ctx.comp.label || 'SPD', u: Math.round(maxU) },
            level: 'warn',
            comp: ctx.comp.id,
            ref: REF_SPD,
          });
        }
      }
      if (st.conducting) {
        st.energy += totalI * totalI * ctx.env.dt;
        if (st.energy > 2e6) {
          st.degraded = true;
          ctx.invalidate();
          ctx.log({
            key: 'log.spdEndOfLife',
            vars: { label: ctx.comp.label || 'SPD' },
            level: 'danger',
            comp: ctx.comp.id,
            ref: REF_SPD,
          });
        }
      }
    },
  },

  {
    type: 'fuse',
    category: 'protection',
    symbol: 'fuse',
    modules: (p) => (p.fuseKind === 'NH' ? 3 : 1) * (p.poles === '3P' ? 3 : 1),
    size: (p) => ({ w: p.poles === '3P' ? 80 : 40, h: 60 }),
    flags: { protective: true, overcurrent: true, threePhase: (p) => p.poles === '3P' },
    keywords: ['pojistka', 'bezpiecznik', 'запобіжник', 'предохранитель', 'fuse'],
    defaultProps: { inA: 16, fuseKind: 'gG', poles: '1P' },
    props: [
      { key: 'inA', type: 'select', options: numOptions([2, 4, 6, 10, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160]), unit: 'A' },
      { key: 'fuseKind', type: 'select', options: strOptions(['gG', 'D01', 'D02', 'NH']) },
      { key: 'poles', type: 'select', options: strOptions(['1P', '3P']) },
    ],
    terminals: (p) => seriesTerminals(p.poles as Poles, p.poles === '3P' ? 80 : 40, 60),
    initState: () => ({ blown: false, damage: 0 }),
    stamp: (ctx) => {
      const cond = ctx.props.poles === '3P' ? ['L1', 'L2', 'L3'] : ['L'];
      for (const c of cond) {
        ctx.R(ctx.node(`in.${c}`), ctx.node(`out.${c}`), ctx.state.blown ? R_OPEN : 0.004, `p.${c}`);
      }
    },
    update: (ctx) => {
      const st = ctx.state;
      if (st.blown) return;
      const inA = Number(ctx.props.inA) || 16;
      const kind = (ctx.props.fuseKind || 'gG') as FuseKind;
      const cond = ctx.props.poles === '3P' ? ['L1', 'L2', 'L3'] : ['L'];
      let maxI = 0;
      for (const c of cond) maxI = Math.max(maxI, ctx.i(`p.${c}`));
      ctx.meas('I', maxI);
      const t = fuseTripTime(maxI, inA, kind);
      if (!Number.isFinite(t)) {
        st.damage = Math.max(0, st.damage - ctx.env.dt / 600);
        return;
      }
      st.damage += ctx.env.dt / t;
      st.tripInS = (1 - st.damage) * t;
      ctx.meas('thermalLoad', Math.min(1, st.damage));
      ctx.meas('tripIn', st.tripInS);
      if (st.damage >= 1) {
        st.blown = true;
        ctx.log({
          key: 'log.fuseBlown',
          vars: { label: ctx.comp.label || 'F', i: maxI.toFixed(1), inA, kind },
          level: 'trip',
          comp: ctx.comp.id,
          ref: `${REF_OVERCURRENT}, 433`,
        });
        ctx.invalidate();
      }
    },
  },

  {
    type: 'motorStarter',
    category: 'protection',
    symbol: 'motorStarter',
    modules: 3,
    interactive: 'toggle',
    flags: { protective: true, overcurrent: true, threePhase: () => true },
    keywords: ['motorový spouštěč', 'motor starter', 'rozrusznik'],
    defaultProps: { setA: 6, rangeLo: 4, rangeHi: 6.3, class: 10, aux: 'none' },
    props: [
      { key: 'setA', type: 'number', unit: 'A', min: 0.1, max: 63, step: 0.1 },
      { key: 'aux', type: 'select', options: strOptions(['none', '1NO', '1NC', '1NO+1NC']) },
      { key: 'class', type: 'select', options: numOptions([10, 20, 30]), advanced: true },
    ],
    size: (p) => ({ w: 80 + contactsWidth(parseContacts(p.aux)), h: 60 }),
    terminals: (p) => [
      ...seriesTerminals('3P', 80, 60),
      ...contactTerminals(contactColumns(parseContacts(p.aux), 80), 60),
    ],
    initState: () => ({ closed: true, tripped: false, damage: 0 }),
    stamp: (ctx) => {
      const on = ctx.state.closed && !ctx.state.tripped;
      stampSeries(ctx, '3P', on);
      stampContacts(ctx, contactColumns(parseContacts(ctx.props.aux), 80), on);
    },
    update: (ctx) => {
      const st = ctx.state;
      let maxI = 0;
      for (const c of ['L1', 'L2', 'L3']) maxI = Math.max(maxI, ctx.i(`p.${c}`));
      ctx.meas('I', maxI);
      if (st.tripped || !st.closed) return;
      const setA = Number(ctx.props.setA) || 6;
      const cls = Number(ctx.props.class) || 10;
      const x = maxI / setA;
      // Magnetic release of a motor starter: ~13×Ie.
      if (x >= 13) {
        st.tripped = true;
        ctx.log({
          key: 'log.motorStarterShort',
          vars: { label: ctx.comp.label || 'Q', i: Math.round(maxI) },
          level: 'trip',
          comp: ctx.comp.id,
          ref: REF_OVERCURRENT,
        });
        ctx.invalidate();
        return;
      }
      if (x > 1.05) {
        // Trip class: time at 7,2×Ie from cold.
        const t = (cls * Math.pow(7.2, 2)) / Math.max(0.01, x * x - 1);
        st.damage += ctx.env.dt / t;
        ctx.meas('thermalLoad', Math.min(1, st.damage));
        if (st.damage >= 1) {
          st.tripped = true;
          ctx.log({
            key: 'log.motorOverload',
            vars: { label: ctx.comp.label || 'Q', i: maxI.toFixed(1), setA },
            level: 'trip',
            comp: ctx.comp.id,
            ref: REF_OVERCURRENT,
          });
          ctx.invalidate();
        }
      } else {
        st.damage = Math.max(0, st.damage - ctx.env.dt / 300);
      }
    },
  },

  {
    type: 'overloadRelay',
    category: 'protection',
    symbol: 'overloadRelay',
    modules: 3,
    size: () => ({ w: 80, h: 60 }),
    flags: { protective: true },
    interactive: 'button',
    keywords: ['tepelné relé', 'nadproudové relé', 'thermal overload', 'przekaźnik termiczny', 'теплове реле', 'тепловое реле', '95-96'],
    defaultProps: { setA: 6, class: 10 },
    props: [
      { key: 'setA', type: 'number', unit: 'A', min: 0.1, max: 100, step: 0.1 },
      { key: 'class', type: 'select', options: numOptions([10, 20, 30]) },
    ],
    terminals: () => [
      ...seriesTerminals('3P', 80, 60),
      { id: 'nc.1', role: 'ctrl' as const, mark: '95', x: 0, y: 20, side: 'left' as const },
      { id: 'nc.2', role: 'ctrl' as const, mark: '96', x: 0, y: 40, side: 'left' as const },
      { id: 'no.1', role: 'ctrl' as const, mark: '97', x: 80, y: 20, side: 'right' as const },
      { id: 'no.2', role: 'ctrl' as const, mark: '98', x: 80, y: 40, side: 'right' as const },
    ],
    // Press the device in live mode to reset it once it has cooled down.
    initState: () => ({ tripped: false, damage: 0, pressed: false }),
    stamp: (ctx) => {
      stampSeries(ctx, '3P', true);
      ctx.R(ctx.node('nc.1'), ctx.node('nc.2'), ctx.state.tripped ? R_OPEN : R_CLOSED, 'nc');
      ctx.R(ctx.node('no.1'), ctx.node('no.2'), ctx.state.tripped ? R_CLOSED : R_OPEN, 'no');
    },
    update: (ctx) => {
      const st = ctx.state;
      if (st.pressed && st.tripped && st.damage < 0.9) {
        st.tripped = false;
        st.damage = Math.min(st.damage, 0.7);
        ctx.invalidate();
        ctx.log({ key: 'log.overloadReset', vars: { label: ctx.comp.label || 'F' }, level: 'info', comp: ctx.comp.id });
      }
      ctx.meas('thermalLoad', Math.min(1, st.damage));
      let maxI = 0;
      for (const c of ['L1', 'L2', 'L3']) maxI = Math.max(maxI, ctx.i(`p.${c}`));
      ctx.meas('I', maxI);
      if (st.tripped) {
        st.damage = Math.max(0, st.damage - ctx.env.dt / 60);
        return;
      }
      const setA = Number(ctx.props.setA) || 6;
      const cls = Number(ctx.props.class) || 10;
      const x = maxI / setA;
      if (x > 1.05) {
        const t = (cls * Math.pow(7.2, 2)) / Math.max(0.01, x * x - 1);
        st.damage += ctx.env.dt / t;
        if (st.damage >= 1) {
          st.tripped = true;
          ctx.log({
            key: 'log.motorOverload',
            vars: { label: ctx.comp.label || 'F', i: maxI.toFixed(1), setA },
            level: 'trip',
            comp: ctx.comp.id,
            ref: REF_OVERCURRENT,
          });
          ctx.invalidate();
        }
      } else st.damage = Math.max(0, st.damage - ctx.env.dt / 300);
    },
  },
];
