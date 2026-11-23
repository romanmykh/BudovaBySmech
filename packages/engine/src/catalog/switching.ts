import type { ComponentDef, TerminalDef, StampCtx, UpdateCtx } from './types.js';
import {
  parseContacts, contactsWidth, contactColumns, contactTerminals, stampContacts,
  AUX_OPTIONS, RELAY_CONTACT_OPTIONS,
} from './contacts.js';
import { Poles, poleConductors, seriesTerminals, numOptions, strOptions, R_OPEN, R_CLOSED, isThreePhase } from './common.js';
import { loadImpedance } from '../physics/network.js';

function poleWidth(poles: Poles): number {
  return poleConductors(poles).length * 20 + 20;
}

/** Coil of a 230 V modular device: ~4 VA, cos φ 0,7. */
function coilZ(va: number, v: number, pf: number) {
  return loadImpedance(va * pf, v, pf);
}

const COIL_VOLTAGES = [12, 24, 48, 110, 230, 400];

/** Coil between A1 and A2, rated for `va` volt-amperes at its rated voltage. */
function stampCoil(ctx: StampCtx, va: number): void {
  const z = coilZ(va, Number(ctx.props.coilV) || 230, 0.7);
  ctx.Z(ctx.node('A1'), ctx.node('A2'), z.r, z.x, 'coil');
}

/**
 * Electromagnet of a contactor or relay: picks up above 85 % of the rated coil
 * voltage and drops out below 40 % (ČSN EN 60947-4-1), after ~20 ms.
 */
function coilUpdate(ctx: UpdateCtx, label: string, onKey = 'log.contactorOn', offKey = 'log.contactorOff'): void {
  const coilV = Number(ctx.props.coilV) || 230;
  const u = ctx.vd(ctx.node('A1'), ctx.node('A2'));
  ctx.meas('U_coil', u);
  const st = ctx.state;
  const want = st.closed ? u > 0.4 * coilV : u > 0.85 * coilV;
  if (u > 1.15 * coilV && !st.overVoltWarned) {
    st.overVoltWarned = true;
    ctx.log({ key: 'log.coilOvervoltage', vars: { label: ctx.comp.label || label, u: Math.round(u), un: coilV }, level: 'danger', comp: ctx.comp.id });
  }
  if (want !== !!st.closed) {
    st.pickupTimer = (st.pickupTimer ?? 0) + ctx.env.dt;
    if (st.pickupTimer >= 0.02) {
      st.closed = want;
      st.pickupTimer = 0;
      ctx.invalidate();
      ctx.log({ key: want ? onKey : offKey, vars: { label: ctx.comp.label || label }, level: 'info', comp: ctx.comp.id });
    }
  } else st.pickupTimer = 0;
}

/** Contactor armature position, with the Auto / 1 / 0 selector of a modular contactor. */
function contactorActuated(props: any, state: any): boolean {
  if (props.manual === 'on') return true;
  if (props.manual === 'off') return false;
  return !!state.closed;
}

function contactorWidth(p: any): number {
  return poleWidth(p.poles as Poles) + 20 + contactsWidth(parseContacts(p.aux));
}

/** Main contacts marked 1-2, 3-4, 5-6, 7-8 (or 1/L1 - 2/T1 on a motor contactor). */
function numberedMain(t: TerminalDef[], motor: boolean): TerminalDef[] {
  let i = 0;
  const order = new Map<string, number>();
  for (const term of t) {
    const cond = term.id.split('.')[1]!;
    if (!order.has(cond)) order.set(cond, i++);
  }
  return t.map((term) => {
    const [side, cond] = term.id.split('.') as [string, string];
    const k = order.get(cond)!;
    const n = side === 'in' ? 2 * k + 1 : 2 * k + 2;
    const mark = motor ? `${n}/${side === 'in' ? 'L' : 'T'}${k + 1}` : `${n}`;
    return { ...term, mark };
  });
}

export const switchingDefs: ComponentDef[] = [
  {
    type: 'isolator',
    category: 'switching',
    symbol: 'isolator',
    modules: (p) => poleConductors(p.poles as Poles).length,
    size: (p) => ({ w: poleWidth(p.poles as Poles), h: 60 }),
    interactive: 'toggle',
    keywords: ['vypínač', 'odpínač', 'isolator', 'rozłącznik', 'рубильник'],
    defaultProps: { inA: 63, poles: '4P' },
    props: [
      { key: 'inA', type: 'select', options: numOptions([25, 40, 63, 80, 100, 125]), unit: 'A' },
      { key: 'poles', type: 'select', options: strOptions(['1P', '2P', '3P', '4P']) },
    ],
    terminals: (p) => seriesTerminals(p.poles as Poles, poleWidth(p.poles as Poles), 60),
    initState: () => ({ closed: true }),
    stamp: (ctx) => {
      for (const c of poleConductors(ctx.props.poles as Poles)) {
        ctx.R(ctx.node(`in.${c.id}`), ctx.node(`out.${c.id}`), ctx.state.closed ? R_CLOSED : R_OPEN, `p.${c.id}`);
      }
    },
    update: (ctx) => {
      let m = 0;
      for (const c of poleConductors(ctx.props.poles as Poles)) m = Math.max(m, ctx.i(`p.${c.id}`));
      ctx.meas('I', m);
    },
  },

  {
    type: 'contactor',
    category: 'relays',
    symbol: 'contactor',
    modules: (p) => (isThreePhase(p.poles as Poles) ? 3 : 2) + Math.ceil(parseContacts(p.aux).length / 2),
    size: (p) => ({ w: contactorWidth(p), h: 70 }),
    keywords: ['stykač', 'instalační stykač', 'contactor', 'stycznik', 'контактор', 'NO', 'NC'],
    defaultProps: { inA: 25, poles: '4P', coilV: 230, nc: false, ncCount: 0, aux: 'none', manual: 'auto' },
    props: [
      { key: 'inA', type: 'select', options: numOptions([16, 20, 25, 40, 63]), unit: 'A' },
      { key: 'poles', type: 'select', options: strOptions(['1P', '2P', '3P', '4P']) },
      { key: 'ncCount', type: 'number', min: 0, max: 4, step: 1 },
      { key: 'coilV', type: 'select', options: numOptions(COIL_VOLTAGES), unit: 'V' },
      { key: 'aux', type: 'select', options: strOptions(AUX_OPTIONS) },
      { key: 'manual', type: 'select', options: strOptions(['auto', 'on', 'off']) },
    ],
    terminals: (p) => {
      const mw = poleWidth(p.poles as Poles);
      const t = numberedMain(seriesTerminals(p.poles as Poles, mw, 70), false);
      t.push({ id: 'A1', role: 'ctrl', mark: 'A1', x: mw + 10, y: 0, side: 'top' });
      t.push({ id: 'A2', role: 'ctrl', mark: 'A2', x: mw + 10, y: 70, side: 'bottom' });
      t.push(...contactTerminals(contactColumns(parseContacts(p.aux), mw + 20), 70));
      return t;
    },
    initState: () => ({ energised: false, closed: false, pickupTimer: 0 }),
    stamp: (ctx) => {
      stampCoil(ctx, 4);
      const closed = contactorActuated(ctx.props, ctx.state);
      const cond = poleConductors(ctx.props.poles as Poles);
      const nNc = ctx.props.nc ? cond.length : Math.max(0, Math.min(cond.length, Number(ctx.props.ncCount) || 0));
      cond.forEach((c, i) => {
        // The last `nNc` main contacts are break contacts (R1-R2 on the device).
        const isNc = i >= cond.length - nNc;
        const on = isNc ? !closed : closed;
        ctx.R(ctx.node(`in.${c.id}`), ctx.node(`out.${c.id}`), on ? R_CLOSED : R_OPEN, `p.${c.id}`);
      });
      stampContacts(ctx, contactColumns(parseContacts(ctx.props.aux), poleWidth(ctx.props.poles as Poles) + 20), closed);
    },
    update: (ctx) => {
      coilUpdate(ctx, 'KM');
      let m = 0;
      for (const c of poleConductors(ctx.props.poles as Poles)) m = Math.max(m, ctx.i(`p.${c.id}`));
      ctx.meas('I', m);
      ctx.meas('closed', contactorActuated(ctx.props, ctx.state) ? 1 : 0);
    },
  },

  {
    type: 'motorContactor',
    category: 'relays',
    symbol: 'motorContactor',
    size: (p) => ({ w: 100 + contactsWidth(parseContacts(p.aux)), h: 80 }),
    keywords: ['stykač', 'motorový stykač', 'AC-3', 'contactor', 'stycznik', 'пускатель', 'пускач', 'контактор'],
    defaultProps: { inA: 9, coilV: 230, aux: '1NO+1NC' },
    props: [
      { key: 'inA', type: 'select', options: numOptions([9, 12, 18, 25, 32, 40, 50, 65, 80]), unit: 'A' },
      { key: 'coilV', type: 'select', options: numOptions(COIL_VOLTAGES), unit: 'V' },
      { key: 'aux', type: 'select', options: strOptions(AUX_OPTIONS) },
    ],
    terminals: (p) => {
      const t = numberedMain(seriesTerminals('3P', 80, 80), true);
      t.push({ id: 'A1', role: 'ctrl', mark: 'A1', x: 90, y: 0, side: 'top' });
      t.push({ id: 'A2', role: 'ctrl', mark: 'A2', x: 90, y: 80, side: 'bottom' });
      t.push(...contactTerminals(contactColumns(parseContacts(p.aux), 100), 80));
      return t;
    },
    initState: () => ({ closed: false, pickupTimer: 0 }),
    stamp: (ctx) => {
      stampCoil(ctx, 8);
      const closed = !!ctx.state.closed;
      for (const c of ['L1', 'L2', 'L3']) {
        ctx.R(ctx.node(`in.${c}`), ctx.node(`out.${c}`), closed ? R_CLOSED : R_OPEN, `p.${c}`);
      }
      stampContacts(ctx, contactColumns(parseContacts(ctx.props.aux), 100), closed);
    },
    update: (ctx) => {
      coilUpdate(ctx, 'KM');
      let m = 0;
      for (const c of ['L1', 'L2', 'L3']) m = Math.max(m, ctx.i(`p.${c}`));
      ctx.meas('I', m);
      ctx.meas('closed', ctx.state.closed ? 1 : 0);
      const inA = Number(ctx.props.inA) || 9;
      if (m > inA * 1.05 && !ctx.state.overWarned) {
        ctx.state.overWarned = true;
        ctx.log({ key: 'log.contactorOverload', vars: { label: ctx.comp.label || 'KM', i: m.toFixed(1), inA }, level: 'warn', comp: ctx.comp.id });
      }
    },
  },

  {
    type: 'controlRelay',
    category: 'relays',
    symbol: 'controlRelay',
    modules: 1,
    size: (p) => ({ w: 30 + contactsWidth(parseContacts(p.contacts)), h: 70 }),
    keywords: ['relé', 'pomocné relé', 'přepínací kontakt', 'relay', 'przekaźnik', 'реле', 'проміжне реле', 'промежуточное реле'],
    defaultProps: { coilV: 230, contacts: '2CO' },
    props: [
      { key: 'coilV', type: 'select', options: numOptions(COIL_VOLTAGES), unit: 'V' },
      { key: 'contacts', type: 'select', options: strOptions(RELAY_CONTACT_OPTIONS) },
    ],
    terminals: (p) => [
      { id: 'A1', role: 'ctrl', mark: 'A1', x: 15, y: 0, side: 'top' },
      { id: 'A2', role: 'ctrl', mark: 'A2', x: 15, y: 70, side: 'bottom' },
      ...contactTerminals(contactColumns(parseContacts(p.contacts), 30), 70),
    ],
    initState: () => ({ closed: false, pickupTimer: 0 }),
    stamp: (ctx) => {
      stampCoil(ctx, 1.5);
      stampContacts(ctx, contactColumns(parseContacts(ctx.props.contacts), 30), !!ctx.state.closed);
    },
    update: (ctx) => {
      coilUpdate(ctx, 'K', 'log.relayOn', 'log.relayOff');
      ctx.meas('closed', ctx.state.closed ? 1 : 0);
    },
  },

  {
    type: 'impulseRelay',
    category: 'relays',
    symbol: 'impulseRelay',
    modules: 1,
    size: () => ({ w: 60, h: 70 }),
    keywords: ['impulzní relé', 'bistabilní', 'impulse relay', 'przekaźnik bistabilny'],
    defaultProps: { coilV: 230, inA: 16 },
    props: [
      { key: 'coilV', type: 'select', options: numOptions([12, 24, 230]), unit: 'V' },
      { key: 'inA', type: 'select', options: numOptions([10, 16, 20]), unit: 'A' },
    ],
    terminals: () => [
      { id: 'A1', role: 'ctrl', mark: 'A1', x: 15, y: 0, side: 'top' },
      { id: 'A2', role: 'ctrl', mark: 'A2', x: 15, y: 70, side: 'bottom' },
      { id: 'in.L', role: 'L', mark: '1', x: 45, y: 0, side: 'top' },
      { id: 'out.L', role: 'L', mark: '2', x: 45, y: 70, side: 'bottom' },
    ],
    initState: () => ({ closed: false, coilWasOn: false }),
    stamp: (ctx) => {
      const z = coilZ(3, Number(ctx.props.coilV) || 230, 0.7);
      ctx.Z(ctx.node('A1'), ctx.node('A2'), z.r, z.x, 'coil');
      ctx.R(ctx.node('in.L'), ctx.node('out.L'), ctx.state.closed ? R_CLOSED : R_OPEN, 'p.L');
    },
    update: (ctx) => {
      const coilV = Number(ctx.props.coilV) || 230;
      const u = ctx.vd(ctx.node('A1'), ctx.node('A2'));
      const on = u > 0.7 * coilV;
      const st = ctx.state;
      if (on && !st.coilWasOn) {
        st.closed = !st.closed;
        ctx.invalidate();
        ctx.log({ key: 'log.impulseToggle', vars: { label: ctx.comp.label || 'RI', state: st.closed ? 1 : 0 }, level: 'info', comp: ctx.comp.id });
      }
      st.coilWasOn = on;
      ctx.meas('I', ctx.i('p.L'));
      ctx.meas('closed', st.closed ? 1 : 0);
    },
  },

  {
    type: 'stairTimer',
    category: 'relays',
    symbol: 'stairTimer',
    modules: 1,
    size: () => ({ w: 60, h: 70 }),
    keywords: ['schodišťový automat', 'staircase timer', 'automat schodowy'],
    defaultProps: { coilV: 230, delay: 180, inA: 16 },
    props: [
      { key: 'delay', type: 'number', unit: 's', min: 5, max: 1200, step: 5 },
      { key: 'coilV', type: 'select', options: numOptions([12, 24, 230]), unit: 'V' },
    ],
    terminals: () => [
      { id: 'A1', role: 'ctrl', mark: 'A1', x: 15, y: 0, side: 'top' },
      { id: 'A2', role: 'ctrl', mark: 'A2', x: 15, y: 70, side: 'bottom' },
      { id: 'in.L', role: 'L', mark: '1', x: 45, y: 0, side: 'top' },
      { id: 'out.L', role: 'L', mark: '2', x: 45, y: 70, side: 'bottom' },
    ],
    initState: () => ({ closed: false, remaining: 0, coilWasOn: false }),
    stamp: (ctx) => {
      const z = coilZ(3, Number(ctx.props.coilV) || 230, 0.7);
      ctx.Z(ctx.node('A1'), ctx.node('A2'), z.r, z.x, 'coil');
      ctx.R(ctx.node('in.L'), ctx.node('out.L'), ctx.state.closed ? R_CLOSED : R_OPEN, 'p.L');
    },
    update: (ctx) => {
      const coilV = Number(ctx.props.coilV) || 230;
      const u = ctx.vd(ctx.node('A1'), ctx.node('A2'));
      const on = u > 0.7 * coilV;
      const st = ctx.state;
      if (on && !st.coilWasOn) {
        st.remaining = Number(ctx.props.delay) || 180;
        if (!st.closed) {
          st.closed = true;
          ctx.invalidate();
        }
      }
      st.coilWasOn = on;
      if (st.remaining > 0) {
        st.remaining -= ctx.env.dt;
        if (st.remaining <= 0) {
          st.remaining = 0;
          st.closed = false;
          ctx.invalidate();
          ctx.log({ key: 'log.stairTimerExpired', vars: { label: ctx.comp.label || 'CA' }, level: 'info', comp: ctx.comp.id });
        }
      }
      ctx.meas('remaining', st.remaining);
      ctx.meas('closed', st.closed ? 1 : 0);
    },
  },

  {
    type: 'timeRelay',
    category: 'relays',
    symbol: 'timeRelay',
    modules: 1,
    size: () => ({ w: 70, h: 70 }),
    keywords: ['časové relé', 'zpožďovací relé', 'blikač', 'time relay', 'przekaźnik czasowy', 'реле часу', 'реле времени'],
    defaultProps: { mode: 'onDelay', delay: 10, offTime: 1, coilV: 230 },
    props: [
      { key: 'mode', type: 'select', options: strOptions(['onDelay', 'offDelay', 'interval', 'flasher']) },
      { key: 'delay', type: 'number', unit: 's', min: 0.1, max: 3600, step: 0.5 },
      { key: 'offTime', type: 'number', unit: 's', min: 0.1, max: 3600, step: 0.5, when: (p) => p.mode === 'flasher' },
      { key: 'coilV', type: 'select', options: numOptions(COIL_VOLTAGES), unit: 'V' },
    ],
    terminals: () => [
      { id: 'A1', role: 'ctrl', mark: 'A1', x: 15, y: 0, side: 'top' },
      { id: 'A2', role: 'ctrl', mark: 'A2', x: 15, y: 70, side: 'bottom' },
      { id: 'in.L', role: 'ctrl', mark: '15', x: 50, y: 0, side: 'top' },
      { id: 'out.NC', role: 'ctrl', mark: '16', x: 40, y: 70, side: 'bottom' },
      { id: 'out.L', role: 'ctrl', mark: '18', x: 60, y: 70, side: 'bottom' },
    ],
    initState: () => ({ closed: false, timer: 0, coilWasOn: false }),
    stamp: (ctx) => {
      stampCoil(ctx, 2);
      const c = !!ctx.state.closed;
      ctx.R(ctx.node('in.L'), ctx.node('out.L'), c ? R_CLOSED : R_OPEN, 'p.L');
      ctx.R(ctx.node('in.L'), ctx.node('out.NC'), c ? R_OPEN : R_CLOSED, 'p.NC');
    },
    update: (ctx) => {
      const coilV = Number(ctx.props.coilV) || 230;
      const on = ctx.vd(ctx.node('A1'), ctx.node('A2')) > 0.7 * coilV;
      const delay = Math.max(0.05, Number(ctx.props.delay) || 10);
      const st = ctx.state;
      const set = (v: boolean) => {
        if (st.closed !== v) {
          st.closed = v;
          ctx.invalidate();
        }
      };
      const rising = on && !st.coilWasOn;
      st.coilWasOn = on;
      switch (ctx.props.mode) {
        case 'offDelay':
          // Contact closes at once and opens `delay` after the coil drops.
          if (on) {
            st.timer = delay;
            set(true);
          } else if (st.timer > 0) {
            st.timer -= ctx.env.dt;
            if (st.timer <= 0) {
              st.timer = 0;
              set(false);
            }
          }
          break;
        case 'interval':
          // Contact closes at once on energising and opens after `delay`.
          if (rising) {
            st.timer = delay;
            set(true);
          }
          if (!on) {
            st.timer = 0;
            set(false);
          } else if (st.timer > 0) {
            st.timer -= ctx.env.dt;
            if (st.timer <= 0) {
              st.timer = 0;
              set(false);
            }
          }
          break;
        case 'flasher': {
          // Cyclic: `delay` closed, `offTime` open, for as long as the coil is on.
          const off = Math.max(0.05, Number(ctx.props.offTime) || 1);
          if (!on) {
            st.timer = 0;
            set(false);
            break;
          }
          if (rising) {
            st.timer = delay;
            set(true);
            break;
          }
          st.timer -= ctx.env.dt;
          if (st.timer <= 0) {
            const next = !st.closed;
            st.timer = next ? delay : off;
            set(next);
          }
          break;
        }
        default:
          // On delay: the contact closes `delay` after the coil is energised.
          if (on) {
            if (!st.closed) {
              st.timer += ctx.env.dt;
              if (st.timer >= delay) {
                st.timer = 0;
                set(true);
              }
            }
          } else {
            st.timer = 0;
            set(false);
          }
      }
      ctx.meas('timer', st.timer);
      ctx.meas('closed', st.closed ? 1 : 0);
    },
  },

  {
    type: 'twilightSwitch',
    category: 'control',
    symbol: 'twilight',
    modules: 1,
    size: () => ({ w: 60, h: 70 }),
    interactive: 'toggle',
    keywords: ['soumrakový spínač', 'twilight switch', 'zmierzchowy'],
    defaultProps: { threshold: 20, dark: false },
    props: [
      { key: 'threshold', type: 'number', unit: 'lx', min: 2, max: 1000, step: 1 },
      { key: 'dark', type: 'bool' },
    ],
    terminals: () => [
      { id: 'in.L', role: 'L', mark: 'L', x: 15, y: 0, side: 'top' },
      { id: 'in.N', role: 'N', mark: 'N', x: 45, y: 0, side: 'top' },
      { id: 'out.L', role: 'L', mark: '1', x: 15, y: 70, side: 'bottom' },
    ],
    initState: (p) => ({ closed: !!p.dark }),
    stamp: (ctx) => {
      ctx.R(ctx.node('in.L'), ctx.node('in.N'), 20000, 'supply');
      ctx.R(ctx.node('in.L'), ctx.node('out.L'), ctx.state.closed ? R_CLOSED : R_OPEN, 'p.L');
    },
    update: (ctx) => ctx.meas('closed', ctx.state.closed ? 1 : 0),
  },

  {
    type: 'thermostat',
    category: 'control',
    symbol: 'thermostat',
    modules: 1,
    size: () => ({ w: 60, h: 70 }),
    interactive: 'toggle',
    keywords: ['termostat', 'thermostat', 'термостат'],
    defaultProps: { setpoint: 21, calling: true },
    props: [
      { key: 'setpoint', type: 'number', unit: '°C', min: 5, max: 90, step: 0.5 },
      { key: 'calling', type: 'bool' },
    ],
    terminals: () => [
      { id: 'in.L', role: 'L', mark: 'L', x: 15, y: 0, side: 'top' },
      { id: 'out.L', role: 'L', mark: '1', x: 15, y: 70, side: 'bottom' },
      { id: 'in.N', role: 'N', mark: 'N', x: 45, y: 0, side: 'top' },
    ],
    initState: (p) => ({ closed: p.calling !== false }),
    stamp: (ctx) => {
      ctx.R(ctx.node('in.L'), ctx.node('out.L'), ctx.state.closed ? R_CLOSED : R_OPEN, 'p.L');
    },
    update: (ctx) => ctx.meas('closed', ctx.state.closed ? 1 : 0),
  },

  {
    type: 'phaseMonitor',
    category: 'control',
    symbol: 'phaseMonitor',
    modules: 2,
    size: () => ({ w: 80, h: 70 }),
    keywords: ['hlídač fází', 'phase monitor', 'czujnik zaniku faz'],
    defaultProps: { uMin: 195, uMax: 253, delay: 1 },
    props: [
      { key: 'uMin', type: 'number', unit: 'V', min: 150, max: 230, step: 1 },
      { key: 'uMax', type: 'number', unit: 'V', min: 230, max: 300, step: 1 },
      { key: 'delay', type: 'number', unit: 's', min: 0, max: 60, step: 0.5 },
    ],
    terminals: () => [
      { id: 'in.L1', role: 'L', mark: 'L1', x: 15, y: 0, side: 'top' },
      { id: 'in.L2', role: 'L', mark: 'L2', x: 35, y: 0, side: 'top' },
      { id: 'in.L3', role: 'L', mark: 'L3', x: 55, y: 0, side: 'top' },
      { id: 'in.N', role: 'N', mark: 'N', x: 75, y: 0, side: 'top' },
      { id: 'c.1', role: 'ctrl', mark: '15', x: 20, y: 70, side: 'bottom' },
      { id: 'c.2', role: 'ctrl', mark: '18', x: 60, y: 70, side: 'bottom' },
    ],
    initState: () => ({ ok: true, timer: 0 }),
    stamp: (ctx) => {
      for (const c of ['L1', 'L2', 'L3']) ctx.R(ctx.node(`in.${c}`), ctx.node('in.N'), 50000, `s.${c}`);
      ctx.R(ctx.node('c.1'), ctx.node('c.2'), ctx.state.ok ? R_CLOSED : R_OPEN, 'c');
    },
    update: (ctx) => {
      const n = ctx.node('in.N');
      const us = ['L1', 'L2', 'L3'].map((c) => ctx.vd(ctx.node(`in.${c}`), n));
      const lo = Number(ctx.props.uMin) || 195;
      const hi = Number(ctx.props.uMax) || 253;
      const healthy = us.every((u) => u >= lo && u <= hi);
      const st = ctx.state;
      us.forEach((u, i) => ctx.meas(`U_L${i + 1}`, u));
      if (healthy !== st.ok) {
        st.timer += ctx.env.dt;
        if (st.timer >= (Number(ctx.props.delay) || 1)) {
          st.ok = healthy;
          st.timer = 0;
          ctx.invalidate();
          ctx.log({
            key: healthy ? 'log.phaseMonitorOk' : 'log.phaseMonitorFault',
            vars: { label: ctx.comp.label || 'FM', u: Math.round(Math.min(...us)) },
            level: healthy ? 'info' : 'warn',
            comp: ctx.comp.id,
          });
        }
      } else st.timer = 0;
    },
  },

  {
    type: 'priorityRelay',
    category: 'control',
    symbol: 'priorityRelay',
    modules: 2,
    size: () => ({ w: 80, h: 70 }),
    keywords: ['přednostní relé', 'priority relay', 'blokada'],
    defaultProps: { threshold: 10 },
    props: [{ key: 'threshold', type: 'number', unit: 'A', min: 1, max: 63, step: 0.5 }],
    terminals: () => [
      { id: 'sense.in', role: 'L', mark: 'k', x: 15, y: 0, side: 'top' },
      { id: 'sense.out', role: 'L', mark: 'l', x: 15, y: 70, side: 'bottom' },
      { id: 'out.in', role: 'L', mark: '1', x: 55, y: 0, side: 'top' },
      { id: 'out.out', role: 'L', mark: '2', x: 55, y: 70, side: 'bottom' },
    ],
    initState: () => ({ closed: true }),
    stamp: (ctx) => {
      ctx.R(ctx.node('sense.in'), ctx.node('sense.out'), 1e-3, 'sense');
      ctx.R(ctx.node('out.in'), ctx.node('out.out'), ctx.state.closed ? R_CLOSED : R_OPEN, 'p.L');
    },
    update: (ctx) => {
      const i = ctx.i('sense');
      ctx.meas('I', i);
      const thr = Number(ctx.props.threshold) || 10;
      const want = i < thr;
      if (want !== ctx.state.closed) {
        ctx.state.closed = want;
        ctx.invalidate();
        ctx.log({
          key: want ? 'log.priorityRestored' : 'log.prioritySheds',
          vars: { label: ctx.comp.label || 'KP', i: i.toFixed(1) },
          level: 'info',
          comp: ctx.comp.id,
        });
      }
    },
  },

  {
    type: 'signalLamp',
    category: 'control',
    symbol: 'signalLamp',
    modules: 1,
    size: () => ({ w: 40, h: 60 }),
    keywords: ['signálka', 'signal lamp', 'lampka'],
    defaultProps: { color: 'red', un: 230 },
    props: [
      { key: 'color', type: 'select', options: strOptions(['red', 'green', 'yellow', 'blue', 'white']) },
      { key: 'un', type: 'select', options: numOptions([12, 24, 230]), unit: 'V' },
    ],
    terminals: () => [
      { id: 'in.L', role: 'L', mark: 'L', x: 20, y: 0, side: 'top' },
      { id: 'in.N', role: 'N', mark: 'N', x: 20, y: 60, side: 'bottom' },
    ],
    stamp: (ctx) => {
      const un = Number(ctx.props.un) || 230;
      ctx.Z(ctx.node('in.L'), ctx.node('in.N'), (un * un) / 1, 0, 'lamp');
    },
    update: (ctx) => {
      const un = Number(ctx.props.un) || 230;
      const u = ctx.vd(ctx.node('in.L'), ctx.node('in.N'));
      ctx.meas('U', u);
      ctx.meas('brightness', Math.min(1, Math.pow(u / un, 2)));
    },
  },

  {
    type: 'buzzer',
    category: 'control',
    symbol: 'buzzer',
    modules: 1,
    size: () => ({ w: 40, h: 60 }),
    keywords: ['bzučák', 'buzzer', 'brzęczyk', 'зумер'],
    defaultProps: { un: 230, va: 3 },
    props: [
      { key: 'un', type: 'select', options: numOptions([8, 12, 24, 230]), unit: 'V' },
      { key: 'va', type: 'number', unit: 'VA', min: 0.5, max: 20, step: 0.5 },
    ],
    terminals: () => [
      { id: 'in.L', role: 'L', mark: '1', x: 20, y: 0, side: 'top' },
      { id: 'in.N', role: 'N', mark: '2', x: 20, y: 60, side: 'bottom' },
    ],
    stamp: (ctx) => {
      const un = Number(ctx.props.un) || 230;
      const va = Number(ctx.props.va) || 3;
      const z = loadImpedance(va * 0.9, un, 0.9);
      ctx.Z(ctx.node('in.L'), ctx.node('in.N'), z.r, z.x, 'z');
    },
    update: (ctx) => {
      const u = ctx.vd(ctx.node('in.L'), ctx.node('in.N'));
      ctx.meas('U', u);
      ctx.meas('sounding', u > 0.6 * (Number(ctx.props.un) || 230) ? 1 : 0);
    },
  },

  {
    type: 'bellTransformer',
    category: 'control',
    symbol: 'transformer',
    modules: 2,
    size: () => ({ w: 80, h: 70 }),
    keywords: ['zvonkový transformátor', 'ring transformer', 'dzwonkowy'],
    defaultProps: { secondaryV: 12, va: 8 },
    props: [
      { key: 'secondaryV', type: 'select', options: numOptions([8, 12, 24]), unit: 'V' },
      { key: 'va', type: 'number', unit: 'VA', min: 4, max: 100, step: 1 },
    ],
    terminals: () => [
      { id: 'in.L', role: 'L', mark: 'L', x: 20, y: 0, side: 'top' },
      { id: 'in.N', role: 'N', mark: 'N', x: 60, y: 0, side: 'top' },
      { id: 'out.a', role: 'elv', mark: 'a', x: 20, y: 70, side: 'bottom' },
      { id: 'out.b', role: 'elv', mark: 'b', x: 60, y: 70, side: 'bottom' },
    ],
    initState: () => ({ uPrimary: 230 }),
    stamp: (ctx) => {
      const sv = Number(ctx.props.secondaryV) || 12;
      const va = Number(ctx.props.va) || 8;
      // The secondary follows the primary voltage measured on the previous solve.
      const u = Number(ctx.state.uPrimary ?? 230);
      const ratio = Math.min(1.2, u / 230);
      const rw = (sv * sv) / Math.max(1, va) * 0.08;
      ctx.V(ctx.node('out.a'), ctx.node('out.b'), sv * ratio, 0, rw, 0, 'sec');
      ctx.R(ctx.node('in.L'), ctx.node('in.N'), (230 * 230) / Math.max(1, va * 0.05), 'mag');
    },
    update: (ctx) => {
      const u = ctx.vd(ctx.node('in.L'), ctx.node('in.N'));
      if (Math.abs(u - Number(ctx.state.uPrimary ?? 0)) > 2) {
        ctx.state.uPrimary = u;
        ctx.invalidate();
      }
      ctx.meas('U_in', u);
      ctx.meas('U_out', ctx.vd(ctx.node('out.a'), ctx.node('out.b')));
      ctx.meas('I_out', ctx.i('sec'));
    },
  },

  {
    type: 'dcPsu',
    category: 'control',
    symbol: 'psu',
    modules: 3,
    size: () => ({ w: 90, h: 70 }),
    keywords: ['zdroj', 'power supply', 'zasilacz', 'блок живлення'],
    defaultProps: { outV: 24, watts: 60 },
    props: [
      { key: 'outV', type: 'select', options: numOptions([12, 24, 48]), unit: 'V' },
      { key: 'watts', type: 'number', unit: 'W', min: 10, max: 480, step: 10 },
    ],
    terminals: () => [
      { id: 'in.L', role: 'L', mark: 'L', x: 20, y: 0, side: 'top' },
      { id: 'in.N', role: 'N', mark: 'N', x: 50, y: 0, side: 'top' },
      { id: 'in.PE', role: 'PE', mark: 'PE', x: 80, y: 0, side: 'top' },
      { id: 'out.+', role: 'elv', mark: '+', x: 25, y: 70, side: 'bottom' },
      { id: 'out.-', role: 'elv', mark: '−', x: 65, y: 70, side: 'bottom' },
    ],
    initState: () => ({ uPrimary: 230 }),
    stamp: (ctx) => {
      const u = Number(ctx.state.uPrimary ?? 230);
      const outV = Number(ctx.props.outV) || 24;
      const w = Number(ctx.props.watts) || 60;
      const live = u > 180 ? 1 : u / 180;
      ctx.V(ctx.node('out.+'), ctx.node('out.-'), outV * live, 0, (outV * outV) / Math.max(1, w) * 0.03, 0, 'out');
      // Input current follows the output power; represented as a fixed burden.
      ctx.R(ctx.node('in.L'), ctx.node('in.N'), (230 * 230) / Math.max(1, w * 0.1), 'in');
    },
    update: (ctx) => {
      const u = ctx.vd(ctx.node('in.L'), ctx.node('in.N'));
      if (Math.abs(u - Number(ctx.state.uPrimary ?? 0)) > 5) {
        ctx.state.uPrimary = u;
        ctx.invalidate();
      }
      ctx.meas('U_in', u);
      ctx.meas('U_out', ctx.vd(ctx.node('out.+'), ctx.node('out.-')));
      ctx.meas('I_out', ctx.i('out'));
    },
  },

  {
    type: 'panelSocket',
    category: 'control',
    symbol: 'panelSocket',
    modules: 3,
    size: () => ({ w: 80, h: 60 }),
    flags: { socket: true },
    keywords: ['zásuvka do rozvaděče', 'modular socket', 'gniazdo modułowe'],
    defaultProps: { inA: 16 },
    props: [{ key: 'inA', type: 'select', options: numOptions([10, 16]), unit: 'A' }],
    terminals: () => [
      { id: 'in.L', role: 'L', mark: 'L', x: 15, y: 0, side: 'top' },
      { id: 'in.N', role: 'N', mark: 'N', x: 40, y: 0, side: 'top' },
      { id: 'in.PE', role: 'PE', mark: 'PE', x: 65, y: 0, side: 'top' },
    ],
    initState: () => ({ loadW: 0 }),
    stamp: (ctx) => {
      const w = Number(ctx.state.loadW) || 0;
      const r = w > 0 ? (230 * 230) / w : 1e9;
      ctx.R(ctx.node('in.L'), ctx.node('in.N'), r, 'z');
    },
    update: (ctx) => {
      ctx.meas('U', ctx.vd(ctx.node('in.L'), ctx.node('in.N')));
      ctx.meas('I', ctx.i('z'));
    },
  },

  {
    type: 'energyMonitor',
    category: 'control',
    symbol: 'energyMonitor',
    modules: 4,
    size: () => ({ w: 100, h: 70 }),
    keywords: ['měřič spotřeby', 'energy monitor', 'licznik modułowy'],
    defaultProps: { phases: 1 },
    props: [{ key: 'phases', type: 'select', options: numOptions([1, 3]) }],
    terminals: (p) => {
      const cond = Number(p.phases) === 3 ? ['L1', 'L2', 'L3', 'N'] : ['L', 'N'];
      return cond.flatMap((c, i) => {
        const x = Math.round(((i + 1) * 100) / (cond.length + 1));
        return [
          { id: `in.${c}`, role: c === 'N' ? ('N' as const) : ('L' as const), mark: c, x, y: 0, side: 'top' as const },
          { id: `out.${c}`, role: c === 'N' ? ('N' as const) : ('L' as const), mark: c, x, y: 70, side: 'bottom' as const },
        ];
      });
    },
    initState: () => ({ energyWh: 0 }),
    stamp: (ctx) => {
      const cond = Number(ctx.props.phases) === 3 ? ['L1', 'L2', 'L3', 'N'] : ['L', 'N'];
      for (const c of cond) ctx.R(ctx.node(`in.${c}`), ctx.node(`out.${c}`), 1e-3, `m.${c}`);
    },
    update: (ctx) => {
      const cond = Number(ctx.props.phases) === 3 ? ['L1', 'L2', 'L3'] : ['L'];
      let p = 0;
      for (const c of cond) {
        const i = ctx.i(`m.${c}`);
        ctx.meas(`I_${c}`, i);
        p += i * ctx.v(ctx.node(`out.${c}`));
      }
      ctx.state.energyWh += (p * ctx.env.dt) / 3600;
      ctx.meas('P', p);
      ctx.meas('E', ctx.state.energyWh);
    },
  },
];
