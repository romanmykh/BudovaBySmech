import type {
  Project, Wire, ComponentInstance, ProjectSettings,
} from '../schema.js';
import { normaliseProject } from '../schema.js';
import { getDef, effectiveProps, terminalsOf } from '../catalog/index.js';
import type {
  ActiveFault, DeviceState, SimEnv, SimEvent, StampCtx, UpdateCtx,
} from '../catalog/types.js';
import { Network, Solution, EARTH, R_OPEN } from '../physics/network.js';
import { conductorResistance, conductorReactance } from '../physics/conductor.js';
import { cabs, cadd, Cx, ZERO } from '../physics/complex.js';
import { bodyEffect } from '../devices/curves.js';

export interface StepOptions {
  /** Maximum number of re-solves inside one time step after a state change. */
  maxIterations?: number;
}

export interface ComponentReading {
  [key: string]: number;
}

export interface SimResults {
  /** Simulation time in seconds. */
  t: number;
  /** RMS potential of every node with respect to earth. */
  nodeV: Record<string, number>;
  /** Complex node potentials, for phase-angle aware readouts. */
  nodeVc: Record<string, Cx>;
  /** RMS current in every wire, keyed by wire id. */
  wireI: Record<string, number>;
  /** Complex current in every wire, positive from `from` to `to`. */
  wireIc: Record<string, Cx>;
  /** Published measurements per component. */
  meas: Record<string, ComponentReading>;
  /** Device runtime state per component (tripped, closed, …). */
  state: Record<string, DeviceState>;
  /** Total active power per phase, at the supply. */
  phaseP: { L1: number; L2: number; L3: number };
  phaseI: { L1: number; L2: number; L3: number };
  phaseU: { L1: number; L2: number; L3: number };
  totalP: number;
  /** Highest touch voltage found on any exposed conductive part. */
  maxTouchVoltage: number;
  /** Current flowing through a person, if a touch fault is active. */
  bodyCurrent: number;
  solved: boolean;
}

const EMPTY_RESULTS = (): SimResults => ({
  t: 0,
  nodeV: {},
  nodeVc: {},
  wireI: {},
  wireIc: {},
  meas: {},
  state: {},
  phaseP: { L1: 0, L2: 0, L3: 0 },
  phaseI: { L1: 0, L2: 0, L3: 0 },
  phaseU: { L1: 0, L2: 0, L3: 0 },
  totalP: 0,
  maxTouchVoltage: 0,
  bodyCurrent: 0,
  solved: false,
});

/**
 * A copy of a device's runtime state with every contact closed, used only for
 * measurement. The original state is never touched.
 */
function closedCopy(state: DeviceState): DeviceState {
  const copy: DeviceState = { ...state };
  if ('closed' in copy) copy.closed = true;
  if ('on' in copy) copy.on = true;
  if ('pressed' in copy) copy.pressed = true;
  if ('a' in copy) copy.a = true;
  if ('b' in copy) copy.b = true;
  copy.tripped = false;
  copy.blown = false;
  return copy;
}

/** Resistance of a wire with a damage fault applied. */
function wireResistance(w: Wire, settings: ProjectSettings, extraR: number): number {
  return conductorResistance(w.length, w.csa, w.material, settings.conductorTemp) + extraR;
}

interface BuiltNetwork {
  net: Network;
  sol: Solution;
  /** branch id per wire */
  wireBranch: Record<string, number>;
  /** branch ids per component, keyed by `${compId}|${tag}` */
  compBranch: Map<string, number>;
  /** branch id of the body current path, if a touch fault is active */
  bodyBranch: number | null;
  bodyFault: ActiveFault | null;
  adjacency: Map<number, number[]>;
  extraIds: number[];
}

export interface ProbeOptions {
  /** Solve as if the installation were isolated from the supply. */
  deEnergized?: boolean;
  /** Solve with every manually operated contact closed. */
  closeSwitches?: boolean;
  /** Add measuring branches; the returned ids can be read back from the solution. */
  extra?: (net: Network, nodeOf: (compId: string, terminal: string) => number) => number[];
}

export class Simulator {
  project: Project;
  /** Persistent per-component runtime state. */
  states = new Map<string, DeviceState>();
  faults: ActiveFault[] = [];
  log: SimEvent[] = [];
  t = 0;
  running = false;
  results: SimResults = EMPTY_RESULTS();

  private built: BuiltNetwork | null = null;
  private dirty = true;
  private downstreamCache = new Map<string, Set<number>>();
  private maxLog = 2000;

  constructor(project: Project) {
    this.project = normaliseProject(project);
    this.resetStates();
  }

  /** Replace the project; runtime state of surviving components is kept. */
  setProject(project: Project, keepState = true): void {
    this.project = normaliseProject(project);
    if (!keepState) this.states.clear();
    this.ensureStates();
    this.dirty = true;
  }

  resetStates(): void {
    this.states.clear();
    this.ensureStates();
    this.t = 0;
    this.log = [];
    this.dirty = true;
    this.results = EMPTY_RESULTS();
  }

  private ensureStates(): void {
    const alive = new Set<string>();
    for (const c of this.project.components) {
      alive.add(c.id);
      if (!this.states.has(c.id)) {
        const def = getDef(c.type);
        const p = effectiveProps(c.type, c.props);
        this.states.set(c.id, def?.initState ? { ...def.initState(p) } : {});
      }
    }
    for (const id of [...this.states.keys()]) if (!alive.has(id)) this.states.delete(id);
  }

  state(compId: string): DeviceState {
    let s = this.states.get(compId);
    if (!s) {
      s = {};
      this.states.set(compId, s);
    }
    return s;
  }

  /* ---------------- interaction ---------------- */

  /** Operate a device: toggle a switch, close a breaker, press a button. */
  operate(compId: string, action: string, value?: unknown): void {
    const comp = this.project.components.find((c) => c.id === compId);
    if (!comp) return;
    const st = this.state(compId);
    switch (action) {
      case 'toggle':
        if ('pos3' in st) {
          // A selector passes through 0: 0 → 1 → 0 → 2 → 0 for a three-position one.
          const props = effectiveProps(comp.type, comp.props);
          if (props.positions === '1-0-2') {
            if (st.pos3 === 0) {
              st.pos3 = st.lastSide === 1 ? 2 : 1;
              st.lastSide = st.pos3;
            } else st.pos3 = 0;
          } else st.pos3 = st.pos3 ? 0 : 1;
        } else if ('latched' in st) st.latched = !st.latched;
        else if ('actuated' in st) st.actuated = !st.actuated;
        else if ('pos' in st) st.pos = st.pos === 1 ? 2 : 1;
        else if ('posA' in st) st.posA = st.posA === 1 ? 2 : 1;
        else if ('crossed' in st) st.crossed = !st.crossed;
        else if ('plugged' in st) st.plugged = !st.plugged;
        else if ('detected' in st) st.detected = true;
        else if ('closed' in st) {
          if (st.tripped) st.tripped = false;
          st.closed = !st.closed;
        } else if ('on' in st) st.on = !st.on;
        else if ('a' in st) st.a = !st.a;
        break;
      case 'toggleB':
        if ('posB' in st) st.posB = st.posB === 1 ? 2 : 1;
        else if ('b' in st) st.b = !st.b;
        break;
      case 'toggleA':
        if ('posA' in st) st.posA = st.posA === 1 ? 2 : 1;
        else if ('a' in st) st.a = !st.a;
        break;
      case 'press':
        st.pressed = true;
        break;
      case 'release':
        st.pressed = false;
        break;
      case 'close':
        st.tripped = false;
        st.closed = true;
        st.damage = 0;
        st.magTimer = 0;
        st.residTimer = 0;
        st.blindWarned = false;
        st.blindFailWarned = false;
        st.nearWarned = false;
        st.capacityWarned = false;
        break;
      case 'open':
        st.closed = false;
        break;
      case 'reset':
        st.tripped = false;
        st.blown = false;
        st.damage = 0;
        st.magTimer = 0;
        st.residTimer = 0;
        st.degraded = false;
        st.energy = 0;
        st.closed = true;
        break;
      case 'set':
        if (typeof value === 'object' && value) Object.assign(st, value);
        break;
      case 'plug':
        st.plugged = true;
        break;
      case 'unplug':
        st.plugged = false;
        break;
      case 'trigger':
        st.detected = true;
        break;
    }
    this.dirty = true;
    this.log.push({
      t: this.t,
      key: `log.operate.${action}`,
      vars: { label: comp.label || comp.type },
      level: 'info',
      comp: compId,
    });
  }

  addFault(f: ActiveFault): void {
    this.faults = this.faults.filter((x) => x.id !== f.id);
    this.faults.push({ ...f, since: this.t });
    this.dirty = true;
    this.log.push({
      t: this.t,
      key: `log.fault.${f.kind}`,
      vars: { target: f.target },
      level: 'warn',
      comp: f.target,
    });
  }

  removeFault(id: string): void {
    this.faults = this.faults.filter((x) => x.id !== id);
    this.dirty = true;
  }

  clearFaults(): void {
    this.faults = [];
    this.dirty = true;
  }

  clearLog(): void {
    this.log = [];
  }

  /* ---------------- network construction ---------------- */

  private env(dt: number, probe?: ProbeOptions): SimEnv {
    return {
      t: this.t,
      dt,
      settings: this.project.settings,
      faults: this.faults.filter((f) => f.enabled),
      deEnergized: probe?.deEnergized,
      closeSwitches: probe?.closeSwitches,
    } as SimEnv;
  }

  private build(dt: number, probe?: ProbeOptions): BuiltNetwork {
    const net = new Network();
    const settings = this.project.settings;
    const env = this.env(dt, probe);
    const wireBranch: Record<string, number> = {};
    const compBranch = new Map<string, number>();
    const byId = new Map(this.project.components.map((c) => [c.id, c]));

    // Faults applied to wires.
    const wireOpen = new Set<string>();
    const wireExtra = new Map<string, number>();
    for (const f of env.faults) {
      if (f.kind === 'cableDamage' && f.wire) {
        if ((f.resistance ?? 0) >= 1e6) wireOpen.add(f.wire);
        else wireExtra.set(f.wire, (wireExtra.get(f.wire) ?? 0) + (Number(f.resistance) || 0.5));
      }
      if (f.kind === 'lossPE') {
        if (f.wire) wireOpen.add(f.wire);
      }
    }
    // Loss of PE at a component: disconnect every protective conductor at that terminal.
    for (const f of env.faults) {
      if (f.kind !== 'lossPE' || f.wire) continue;
      for (const w of this.project.wires) {
        const touchesTarget =
          (w.from.comp === f.target && (!f.terminal || w.from.terminal === f.terminal)) ||
          (w.to.comp === f.target && (!f.terminal || w.to.terminal === f.terminal));
        if (touchesTarget && (w.role === 'PE' || w.role === 'PEN')) wireOpen.add(w.id);
      }
    }

    // Wires.
    for (const w of this.project.wires) {
      if (!byId.has(w.from.comp) || !byId.has(w.to.comp)) continue;
      const a = net.node(`${w.from.comp}:${w.from.terminal}`);
      const b = net.node(`${w.to.comp}:${w.to.terminal}`);
      if (wireOpen.has(w.id)) {
        wireBranch[w.id] = net.addZ(a, b, R_OPEN, 0, w.id, 'wire');
        continue;
      }
      const r = wireResistance(w, settings, wireExtra.get(w.id) ?? 0);
      const x = conductorReactance(w.length, w.csa);
      wireBranch[w.id] = net.addZ(a, b, r, x, w.id, 'wire');
    }

    // Components.
    for (const comp of this.project.components) {
      const def = getDef(comp.type);
      if (!def) continue;
      const props = effectiveProps(comp.type, comp.props);
      const state = probe?.closeSwitches ? closedCopy(this.state(comp.id)) : this.state(comp.id);
      // Make sure every declared terminal exists as a node, so that dangling
      // terminals still show a (floating) potential in the UI.
      for (const t of def.terminals(props)) net.node(`${comp.id}:${t.id}`);
      if (!def.stamp) continue;
      const ctx: StampCtx = {
        net,
        comp,
        props,
        state,
        env,
        node: (term) => net.node(`${comp.id}:${term}`),
        nodeOf: (cid, term) => net.node(`${cid}:${term}`),
        earth: EARTH,
        R: (a, b, r, tag) => {
          const id = net.addZ(a, b, r, 0, comp.id, tag);
          if (tag) compBranch.set(`${comp.id}|${tag}`, id);
          return id;
        },
        Z: (a, b, r, x, tag) => {
          const id = net.addZ(a, b, r, x, comp.id, tag);
          if (tag) compBranch.set(`${comp.id}|${tag}`, id);
          return id;
        },
        V: (a, b, mag, deg, zr, zx, tag) => {
          const id = net.addV(a, b, mag, deg, zr ?? 0, zx ?? 0, comp.id, tag);
          if (tag) compBranch.set(`${comp.id}|${tag}`, id);
          return id;
        },
        I: (a, b, mag, deg, tag) => {
          const id = net.addI(a, b, mag, deg, comp.id, tag);
          if (tag) compBranch.set(`${comp.id}|${tag}`, id);
          return id;
        },
        leak: (a, r, tag) => {
          const id = net.addZ(a, EARTH, r, 0, comp.id, tag ?? 'leak');
          if (tag) compBranch.set(`${comp.id}|${tag}`, id);
          return id;
        },
        myFaults: () => env.faults.filter((f) => f.target === comp.id),
        internalNode: (name) => net.node(`${comp.id}::${name}`),
      };
      def.stamp(ctx);
    }

    // Centrally handled faults.
    let bodyBranch: number | null = null;
    let bodyFault: ActiveFault | null = null;
    for (const f of env.faults) {
      const comp = byId.get(f.target);
      const def = comp ? getDef(comp.type) : undefined;
      const nodeFor = (term: string | undefined, fallback: string): number => {
        const t = term ?? fallback;
        if (t.startsWith('::')) return net.node(`${f.target}${t}`);
        return net.node(`${f.target}:${t}`);
      };
      switch (f.kind) {
        case 'shortLN':
          net.addZ(nodeFor(f.terminal, 'in.L'), nodeFor(f.terminal2, 'in.N'), Math.max(0.001, Number(f.resistance) ?? 0.01), 0, f.target, 'fault');
          break;
        case 'shortLPE':
          net.addZ(nodeFor(f.terminal, 'in.L'), nodeFor(f.terminal2, 'in.PE'), Math.max(0.001, Number(f.resistance) ?? 0.01), 0, f.target, 'fault');
          break;
        case 'shortLL':
          net.addZ(nodeFor(f.terminal, 'in.L1'), nodeFor(f.terminal2, 'in.L2'), Math.max(0.001, Number(f.resistance) ?? 0.01), 0, f.target, 'fault');
          break;
        case 'insulation':
          if (!def?.flags?.load) {
            net.addZ(nodeFor(f.terminal, 'in.L'), EARTH, Math.max(1, Number(f.resistance) ?? 50000), 0, f.target, 'fault');
          }
          break;
        case 'earthFault':
          if (!def?.flags?.load) {
            net.addZ(nodeFor(f.terminal, 'in.L'), EARTH, Math.max(0.01, Number(f.resistance) ?? 20), 0, f.target, 'fault');
          }
          break;
        case 'touch': {
          const rb = Math.max(200, Number(f.bodyResistance) ?? 1000);
          const rs = Math.max(0, Number(f.standingResistance) ?? 1000);
          const n = nodeFor(f.terminal, '::case');
          bodyBranch = net.addZ(n, EARTH, rb + rs, 0, f.target, 'body');
          bodyFault = f;
          break;
        }
        default:
          break;
      }
    }

    const extraIds = probe?.extra
      ? probe.extra(net, (cid: string, term: string) => net.node(`${cid}:${term}`))
      : [];
    const sol = net.solve();
    return { net, sol, wireBranch, compBranch, bodyBranch, bodyFault, adjacency: new Map(), extraIds };
  }

  /** Adjacency over conducting branches, used for downstream analysis. */
  private adjacency(b: BuiltNetwork): Map<number, number[]> {
    if (b.adjacency.size) return b.adjacency;
    const adj = new Map<number, number[]>();
    const push = (a: number, c: number) => {
      if (a < 0 || c < 0) return;
      const l = adj.get(a);
      if (l) l.push(c);
      else adj.set(a, [c]);
    };
    for (const br of b.net.branches) {
      if (br.tag === 'leak') continue;
      // Only conducting paths count; open contacts and insulation do not.
      if (br.kind === 'Z' && br.z.re > 1e5) continue;
      push(br.a, br.b);
      push(br.b, br.a);
    }
    b.adjacency = adj;
    return adj;
  }

  /** Nodes reachable from the output side of a device, not passing through it. */
  private downstreamNodes(compId: string, b: BuiltNetwork): Set<number> {
    const cached = this.downstreamCache.get(compId);
    if (cached) return cached;
    const comp = this.project.components.find((c) => c.id === compId);
    const set = new Set<number>();
    if (!comp) return set;
    const def = getDef(comp.type);
    if (!def) return set;
    const props = effectiveProps(comp.type, comp.props);
    const terms = def.terminals(props);
    const outTerms = terms.filter((t) => t.id.startsWith('out.'));
    const inNodes = new Set(
      terms.filter((t) => t.id.startsWith('in.')).map((t) => b.net.node(`${comp.id}:${t.id}`)),
    );
    const adj = this.adjacency(b);
    const queue: number[] = outTerms.map((t) => b.net.node(`${comp.id}:${t.id}`));
    for (const q of queue) set.add(q);
    while (queue.length) {
      const n = queue.shift()!;
      for (const m of adj.get(n) ?? []) {
        if (m === EARTH || set.has(m) || inNodes.has(m)) continue;
        set.add(m);
        queue.push(m);
      }
    }
    this.downstreamCache.set(compId, set);
    return set;
  }

  private isDownstream(ofComp: string, targetComp: string, b: BuiltNetwork): boolean {
    if (ofComp === targetComp) return false;
    const set = this.downstreamNodes(ofComp, b);
    if (!set.size) return false;
    const comp = this.project.components.find((c) => c.id === targetComp);
    if (!comp) return false;
    const def = getDef(comp.type);
    if (!def) return false;
    const props = effectiveProps(comp.type, comp.props);
    for (const t of def.terminals(props)) {
      if (set.has(b.net.node(`${comp.id}:${t.id}`))) return true;
    }
    return false;
  }

  /* ---------------- solving and stepping ---------------- */

  /** Rebuild and solve without advancing time. */
  solve(): SimResults {
    this.stepInternal(0);
    return this.results;
  }

  /**
   * Advance the simulation by `dt` seconds of simulated time.
   * The step is subdivided automatically when a fast protective operation is
   * pending, so that trip times stay accurate even at high time acceleration.
   */
  step(dt: number): SimResults {
    let remaining = Math.max(0, dt);
    let guard = 0;
    if (remaining === 0) return this.stepInternal(0);
    while (remaining > 1e-9 && guard++ < 400) {
      const sub = Math.min(remaining, this.suggestedStep());
      this.stepInternal(sub);
      remaining -= sub;
    }
    return this.results;
  }

  /**
   * Largest time step that still resolves the fastest pending event.
   *
   * Thermal overload integration is exact while the current is steady, so a
   * breaker that is minutes away from operating does not need millisecond
   * steps — but a magnetic release or an RCD does.
   */
  private suggestedStep(): number {
    let fast = false;
    let timing = false;
    let nextTrip = Infinity;
    for (const [, st] of this.states) {
      if (st.magTimer !== undefined && st.magTimer > 0) fast = true;
      if (st.residTimer !== undefined && st.residTimer > 0) fast = true;
      if (st.arcTimer !== undefined && st.arcTimer > 0) fast = true;
      if (st.pickupTimer !== undefined && st.pickupTimer > 0) timing = true;
      if (st.remaining !== undefined && st.remaining > 0) timing = true;
      if (st.timer !== undefined && st.timer > 0) timing = true;
      if (typeof st.tripInS === 'number' && Number.isFinite(st.tripInS)) {
        nextTrip = Math.min(nextTrip, st.tripInS);
      }
    }
    // A pending body-contact fault must be resolved at RCD timing resolution.
    if (this.faults.some((f) => f.enabled && (f.kind === 'touch' || f.kind === 'shortLN' || f.kind === 'shortLPE' || f.kind === 'shortLL'))) fast = true;
    if (fast) return 0.002;
    if (timing) return 0.02;
    if (Number.isFinite(nextTrip)) return Math.min(30, Math.max(0.05, nextTrip / 25));
    return 0.5;
  }

  private stepInternal(dt: number, opts: StepOptions = {}): SimResults {
    this.ensureStates();
    const maxIter = opts.maxIterations ?? 8;
    this.t += dt;
    this.lastDt = dt;
    let iter = 0;
    let needSolve = true;
    let b: BuiltNetwork | null = null;
    const pendingLog: SimEvent[] = [];
    const meas: Record<string, ComponentReading> = {};

    while (needSolve && iter++ < maxIter) {
      needSolve = false;
      this.downstreamCache.clear();
      b = this.build(iter === 1 ? dt : 0);
      const env = this.env(iter === 1 ? dt : 0);
      const built = b;
      for (const key of Object.keys(meas)) delete meas[key];

      for (const comp of this.project.components) {
        const def = getDef(comp.type);
        if (!def?.update) continue;
        const props = effectiveProps(comp.type, comp.props);
        const state = this.state(comp.id);
        const m: ComponentReading = {};
        meas[comp.id] = m;
        const branchOf = (tag: string): number | undefined => built.compBranch.get(`${comp.id}|${tag}`);
        const ctx: UpdateCtx = {
          comp,
          props,
          state,
          env,
          sol: built.sol,
          node: (term) => built.net.node(`${comp.id}:${term}`),
          earth: EARTH,
          i: (tag) => {
            const id = branchOf(tag);
            return id === undefined ? 0 : built.sol.imag(id);
          },
          ic: (tag) => {
            const id = branchOf(tag);
            return id === undefined ? ZERO : built.sol.i(id);
          },
          v: (n) => built.sol.vmag(n),
          vd: (a, c) => cabs({ re: built.sol.v(a).re - built.sol.v(c).re, im: built.sol.v(a).im - built.sol.v(c).im }),
          log: (ev) => pendingLog.push({ ...ev, t: this.t }),
          invalidate: () => {
            needSolve = true;
          },
          meas: (k, val) => {
            m[k] = val;
          },
          myFaults: () => env.faults.filter((f) => f.target === comp.id),
          internalNode: (name) => built.net.node(`${comp.id}::${name}`),
          isDownstream: (target) => this.isDownstream(comp.id, target, built),
        };
        def.update(ctx);
      }
    }

    this.built = b;
    for (const ev of pendingLog) this.pushLog(ev);
    this.results = this.collect(b!, meas);
    this.checkSafety(b!);
    this.dirty = false;
    return this.results;
  }

  private pushLog(ev: SimEvent): void {
    const last = this.log[this.log.length - 1];
    if (last && last.key === ev.key && last.comp === ev.comp && Math.abs(last.t - ev.t) < 1e-6) return;
    this.log.push(ev);
    if (this.log.length > this.maxLog) this.log.splice(0, this.log.length - this.maxLog);
  }

  private collect(b: BuiltNetwork, meas: Record<string, ComponentReading>): SimResults {
    const r = EMPTY_RESULTS();
    r.t = this.t;
    r.solved = true;
    r.meas = meas;
    for (const name of b.net.allNodes()) {
      const idx = b.net.node(name);
      const vc = b.sol.v(idx);
      r.nodeVc[name] = vc;
      r.nodeV[name] = cabs(vc);
    }
    for (const [wid, br] of Object.entries(b.wireBranch)) {
      const ic = b.sol.i(br);
      r.wireIc[wid] = ic;
      r.wireI[wid] = cabs(ic);
    }
    for (const c of this.project.components) r.state[c.id] = { ...this.state(c.id) };

    // Totals from the supply.
    const supply = this.project.components.find((c) => c.type === 'supply');
    if (supply) {
      const props = effectiveProps(supply.type, supply.props);
      const phases = Number(props.phases) === 1 ? ['L1'] : ['L1', 'L2', 'L3'];
      for (const ph of phases) {
        const id = b.compBranch.get(`${supply.id}|src.${ph}`);
        const i = id === undefined ? 0 : b.sol.imag(id);
        const u = b.sol.vmag(b.net.node(`${supply.id}:${ph}`));
        (r.phaseI as any)[ph] = i;
        (r.phaseU as any)[ph] = u;
        const pw = id === undefined ? 0 : Math.abs(b.sol.p(id));
        (r.phaseP as any)[ph] = pw;
        r.totalP += pw;
      }
    }

    // Touch voltages on exposed conductive parts.
    for (const c of this.project.components) {
      const def = getDef(c.type);
      if (!def?.flags?.classI) continue;
      const n = `${c.id}::case`;
      if (b.net.hasNode(n)) {
        const u = r.nodeV[n] ?? 0;
        if (u > r.maxTouchVoltage) r.maxTouchVoltage = u;
        (meas[c.id] ??= {}).U_case = u;
      }
    }
    if (b.bodyBranch !== null) r.bodyCurrent = b.sol.imag(b.bodyBranch);
    return r;
  }

  /** Shock-hazard assessment, run after every solve. */
  private checkSafety(b: BuiltNetwork): void {
    if (b.bodyBranch === null || !b.bodyFault) {
      this.bodyExposure = 0;
      this.fatalReported = false;
      return;
    }
    const i = b.sol.imag(b.bodyBranch);
    const eff = bodyEffect(i);
    const f = b.bodyFault;
    if (i > 0.0005) {
      this.bodyExposure += this.lastDt;
      if (!this.shockReported) {
        this.shockReported = true;
        this.pushLog({
          t: this.t,
          key: 'log.bodyCurrent',
          vars: { mA: (i * 1000).toFixed(1), zone: eff.zone },
          level: eff.zone === 'fibrillation' || eff.zone === 'severe' ? 'danger' : 'warn',
          comp: f.target,
          ref: 'ČSN 33 2000-4-41 ed. 3, 411',
        });
      }
      if (eff.zone === 'fibrillation' && this.bodyExposure >= eff.fibrillationTime && !this.fatalReported) {
        this.fatalReported = true;
        this.pushLog({
          t: this.t,
          key: 'log.fatalOutcome',
          vars: { mA: (i * 1000).toFixed(0), s: this.bodyExposure.toFixed(2) },
          level: 'danger',
          comp: f.target,
          ref: 'IEC/TS 60479-1',
          refToVerify: true,
        });
      }
    } else {
      if (this.shockReported && this.bodyExposure > 0) {
        this.pushLog({
          t: this.t,
          key: 'log.shockCleared',
          vars: { ms: Math.round(this.bodyExposure * 1000) },
          level: 'info',
          comp: f.target,
        });
      }
      this.bodyExposure = 0;
      this.shockReported = false;
    }
  }

  private bodyExposure = 0;
  private shockReported = false;
  private fatalReported = false;
  private lastDt = 0.02;

  /** Access to the solved network, used by the instrument models. */
  get network(): BuiltNetwork | null {
    return this.built;
  }

  /**
   * One-off solve used by the instruments. It never mutates device state or the
   * event log, so measuring cannot change the behaviour of the installation.
   */
  probe(opts: ProbeOptions = {}): BuiltNetwork {
    return this.build(0, opts);
  }

  nodeKey(compId: string, terminal: string): string {
    return `${compId}:${terminal}`;
  }

  nodeVoltage(compId: string, terminal: string): number {
    return this.results.nodeV[`${compId}:${terminal}`] ?? 0;
  }

  /** Complete list of terminals that a wire could be attached to. */
  terminalsOf(comp: ComponentInstance) {
    return terminalsOf(comp.type, comp.props);
  }
}
