/**
 * Instrument models. Each one performs its own solve of the network, so using
 * an instrument never disturbs the running simulation.
 */
import { Simulator } from './simulation.js';
import { Network, EARTH } from '../physics/network.js';
import { cabs, carg, csub } from '../physics/complex.js';
import { getDef, effectiveProps } from '../catalog/index.js';
import { rcdTripTime, rcdActualTripCurrent, rcdSenses, RcdType, RcdDelay } from '../devices/curves.js';

export interface Probe {
  comp: string;
  terminal: string;
}

/** RMS voltage between two points of the installation. */
export function measureVoltage(sim: Simulator, a: Probe, b: Probe): number {
  const r = sim.results;
  const va = r.nodeVc[`${a.comp}:${a.terminal}`];
  const vb = r.nodeVc[`${b.comp}:${b.terminal}`];
  if (!va && !vb) return 0;
  return cabs(csub(va ?? { re: 0, im: 0 }, vb ?? { re: 0, im: 0 }));
}

/** Current in a given wire, as read by a clamp meter. */
export function measureClamp(sim: Simulator, wireId: string): number {
  return sim.results.wireI[wireId] ?? 0;
}

export interface InsulationResult {
  /** Measured insulation resistance in ohms. */
  ohms: number;
  /** Megohms, the way the instrument displays it. */
  megohms: number;
  testVoltage: number;
  /** ČSN 33 2000-6 ed. 2 minimum for a 230/400 V circuit tested at 500 V. */
  pass: boolean;
  limit: number;
}

/**
 * Insulation resistance between two points, measured with the installation
 * isolated from the supply.
 */
export function measureInsulation(sim: Simulator, a: Probe, b: Probe, testV = 500): InsulationResult {
  let id = -1;
  const built = sim.probe({
    deEnergized: true,
    extra: (net: Network, nodeOf) => {
      // Inject a known current and read the resulting potential difference.
      id = net.addI(nodeOf(a.comp, a.terminal), nodeOf(b.comp, b.terminal), 1e-6, 0, 'instrument', 'iso');
      return [id];
    },
  });
  const na = built.net.node(`${a.comp}:${a.terminal}`);
  const nb = built.net.node(`${b.comp}:${b.terminal}`);
  const u = cabs(csub(built.sol.v(na), built.sol.v(nb)));
  const ohms = u / 1e-6;
  // The instrument cannot source more than its test voltage.
  const limited = Math.min(ohms, testV / 1e-6);
  const limit = 1e6; // 1 MΩ for circuits up to 500 V
  return {
    ohms: limited,
    megohms: limited / 1e6,
    testVoltage: testV,
    pass: limited >= limit,
    limit,
  };
}

export interface LoopResult {
  /** Loop impedance in ohms. */
  zs: number;
  /** Prospective fault current in amperes. */
  ipf: number;
  /** Open-circuit voltage used for the calculation. */
  u0: number;
  loop: 'L-PE' | 'L-N';
}

/**
 * Fault loop impedance, measured the way a loop tester does it: the
 * open-circuit voltage is compared with the voltage under a known test load.
 */
export function measureLoop(sim: Simulator, line: Probe, ret: Probe, loop: 'L-PE' | 'L-N' = 'L-PE'): LoopResult {
  const base = sim.probe({});
  const nl = base.net.node(`${line.comp}:${line.terminal}`);
  const nr = base.net.node(`${ret.comp}:${ret.terminal}`);
  const u0 = cabs(csub(base.sol.v(nl), base.sol.v(nr)));
  const rTest = 10;
  let id = -1;
  const loaded = sim.probe({
    extra: (net, nodeOf) => {
      id = net.addZ(nodeOf(line.comp, line.terminal), nodeOf(ret.comp, ret.terminal), rTest, 0, 'instrument', 'loop');
      return [id];
    },
  });
  const i = loaded.sol.imag(id);
  const nl2 = loaded.net.node(`${line.comp}:${line.terminal}`);
  const nr2 = loaded.net.node(`${ret.comp}:${ret.terminal}`);
  const u1 = cabs(csub(loaded.sol.v(nl2), loaded.sol.v(nr2)));
  const zs = i > 1e-9 ? Math.max(0, (u0 - u1) / i) : Infinity;
  return { zs, ipf: zs > 0 && Number.isFinite(zs) ? u0 / zs : 0, u0, loop };
}

export interface RcdTestResult {
  found: boolean;
  rcdComp?: string;
  idn?: number;
  type?: RcdType;
  delay?: RcdDelay;
  /** Residual current applied, in amperes. */
  applied: number;
  multiplier: number;
  /** Measured trip time in milliseconds; null when the device did not operate. */
  tripMs: number | null;
  /** Maximum permitted trip time in milliseconds. */
  limitMs: number | null;
  /** Residual current at which the device actually operates (ramp test). */
  tripCurrentMa?: number;
  pass: boolean;
  note?: string;
}

/** Find the nearest RCD upstream of a point in the installation. */
export function findUpstreamRcd(sim: Simulator, compId: string): string | null {
  for (const c of sim.project.components) {
    const def = getDef(c.type);
    if (!def?.flags?.rcd) continue;
    if ((sim as any).isDownstream?.call) {
      // fall through to the public helper below
    }
    if (isDownstreamPublic(sim, c.id, compId)) return c.id;
  }
  return null;
}

/** Public wrapper over the simulator's downstream analysis. */
export function isDownstreamPublic(sim: Simulator, ofComp: string, target: string): boolean {
  const built = sim.network ?? sim.probe({});
  return (sim as any)['isDownstream'](ofComp, target, built);
}

/**
 * RCD test at a point of use. The measurement uses the device characteristic of
 * the RCD that actually protects the circuit, as a field tester would.
 */
export function testRcd(sim: Simulator, at: Probe, multiplier: 0.5 | 1 | 2 | 5 = 1): RcdTestResult {
  const rcdId = findUpstreamRcd(sim, at.comp);
  if (!rcdId) {
    return { found: false, applied: 0, multiplier, tripMs: null, limitMs: null, pass: false, note: 'noRcd' };
  }
  const comp = sim.project.components.find((c) => c.id === rcdId)!;
  const props = effectiveProps(comp.type, comp.props);
  const idn = (Number(props.idn) || 30) / 1000;
  const type = (props.rcdType || 'A') as RcdType;
  const delay = (props.delay || 'instant') as RcdDelay;
  const applied = idn * multiplier;
  const timing = rcdTripTime(applied, idn, delay);
  const threshold = rcdActualTripCurrent(idn);
  const senses = rcdSenses(type, 'ac');

  if (!senses) {
    return {
      found: true, rcdComp: rcdId, idn, type, delay, applied, multiplier,
      tripMs: null, limitMs: Math.round(timing.max * 1000), pass: false, note: 'typeCannotSense',
    };
  }
  if (applied < threshold) {
    return {
      found: true, rcdComp: rcdId, idn, type, delay, applied, multiplier,
      tripMs: null, limitMs: Math.round(timing.max * 1000),
      tripCurrentMa: Math.round(threshold * 1000),
      pass: multiplier === 0.5, // a device must NOT trip at 0,5·IΔn
      note: multiplier === 0.5 ? 'noTripCorrect' : 'belowThreshold',
    };
  }
  const tripMs = Math.round(timing.typical * 1000);
  const limitMs = Math.round(timing.max * 1000);
  return {
    found: true, rcdComp: rcdId, idn, type, delay, applied, multiplier,
    tripMs, limitMs, tripCurrentMa: Math.round(threshold * 1000),
    pass: multiplier === 0.5 ? false : tripMs <= limitMs,
  };
}

export type PhaseRotation = 'L1-L2-L3' | 'L1-L3-L2' | 'incomplete';

export interface RotationResult {
  rotation: PhaseRotation;
  angles: { L1: number; L2: number; L3: number };
  voltages: { L1: number; L2: number; L3: number };
}

/** Phase rotation at a three-phase point. */
export function measureRotation(sim: Simulator, p1: Probe, p2: Probe, p3: Probe): RotationResult {
  const r = sim.results;
  const get = (p: Probe) => r.nodeVc[`${p.comp}:${p.terminal}`] ?? { re: 0, im: 0 };
  const v1 = get(p1);
  const v2 = get(p2);
  const v3 = get(p3);
  const deg = (v: { re: number; im: number }) => (carg(v) * 180) / Math.PI;
  const angles = { L1: deg(v1), L2: deg(v2), L3: deg(v3) };
  const voltages = { L1: cabs(v1), L2: cabs(v2), L3: cabs(v3) };
  if (voltages.L1 < 50 || voltages.L2 < 50 || voltages.L3 < 50) {
    return { rotation: 'incomplete', angles, voltages };
  }
  // Normalise L2 and L3 relative to L1 into (0, 360).
  const norm = (a: number) => ((a % 360) + 360) % 360;
  const d2 = norm(angles.L2 - angles.L1);
  const d3 = norm(angles.L3 - angles.L1);
  return { rotation: d2 > d3 ? 'L1-L2-L3' : 'L1-L3-L2', angles, voltages };
}

export interface SocketTestResult {
  uLN: number;
  uLPE: number;
  uNPE: number;
  /** Every conductor present and in the right place. */
  correct: boolean;
  faults: string[];
}

/**
 * Socket tester: the classic three-lamp pattern. Like the real instrument it
 * loads each pair of contacts, so a protective conductor that is present but
 * not connected shows up as missing rather than as a healthy reading.
 */
export function testSocket(sim: Simulator, socketComp: string): SocketTestResult {
  const comp = sim.project.components.find((c) => c.id === socketComp);
  const faults: string[] = [];
  if (!comp) return { uLN: 0, uLPE: 0, uNPE: 0, correct: false, faults: ['notFound'] };
  const R_LAMP = 25000;
  let bLN = -1;
  let bLPE = -1;
  let bNPE = -1;
  const built = sim.probe({
    extra: (net: Network, nodeOf) => {
      const l = nodeOf(socketComp, 'in.L');
      const n = nodeOf(socketComp, 'in.N');
      const pe = nodeOf(socketComp, 'in.PE');
      bLN = net.addZ(l, n, R_LAMP, 0, 'instrument', 'ln');
      bLPE = net.addZ(l, pe, R_LAMP, 0, 'instrument', 'lpe');
      bNPE = net.addZ(n, pe, R_LAMP * 4, 0, 'instrument', 'npe');
      return [bLN, bLPE, bNPE];
    },
  });
  const across = (id: number) => cabs(built.sol.vacross(id));
  const uLN = across(bLN);
  const uLPE = across(bLPE);
  const uNPE = across(bNPE);

  if (uLN < 50) faults.push('noSupply');
  else {
    if (uLPE < 50) faults.push('peMissing');
    if (uNPE > 50) faults.push('neutralAndProtectiveSwapped');
    if (uLPE > 50 && uLN < 50) faults.push('neutralMissing');
  }
  return { uLN, uLPE, uNPE, correct: faults.length === 0 && uLN > 50, faults };
}

export { EARTH };
