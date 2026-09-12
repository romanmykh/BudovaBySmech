import { describe, it, expect } from 'vitest';
import {
  Simulator, ProjectBuilder, runDesignRuleCheck,
  stairway, socketCircuitDemo, houseBoard,
  testSocket, testRcd, measureLoop, measureInsulation, measureRotation,
  type Project,
} from '../src/index.js';

/** Run the simulator until `pred` holds or `maxT` seconds of simulated time pass. */
function runUntil(sim: Simulator, pred: (s: Simulator) => boolean, maxT: number, chunk = 50): number {
  const start = sim.t;
  sim.solve();
  while (sim.t - start < maxT) {
    if (pred(sim)) return sim.t - start;
    sim.step(chunk);
  }
  return pred(sim) ? sim.t - start : Infinity;
}

/* ------------------------------------------------------------------ */

describe('scenario 2 — two-way (6+6) stairway pair', () => {
  it('lets either switch change the state of the lamps', () => {
    const sim = new Simulator(stairway());
    sim.solve();
    const lit = () => sim.results.meas['la1'].brightness > 0.5;
    // Both switches in position 1: the travellers are through, the lamps are on.
    expect(lit()).toBe(true);
    sim.operate('sw1', 'toggle');
    sim.solve();
    expect(lit()).toBe(false);
    sim.operate('sw2', 'toggle');
    sim.solve();
    expect(lit()).toBe(true);
    sim.operate('sw1', 'toggle');
    sim.solve();
    expect(lit()).toBe(false);
  });

  it('degrades realistically when the travellers are wired wrongly', () => {
    const p = stairway();
    // Both travellers of S1 land on the same terminal of S2 — a classic error.
    const w = p.wires.find((x) => x.from.comp === 'sw1' && x.from.terminal === 'c1.t2')!;
    w.to = { comp: 'sw2', terminal: 'c1.t1' };
    const sim = new Simulator(p);
    sim.solve();
    const before = sim.results.meas['la1'].brightness;
    sim.operate('sw1', 'toggle');
    sim.solve();
    // S1 has lost all authority; the circuit still solves and nothing crashes.
    expect(sim.results.meas['la1'].brightness).toBeCloseTo(before, 2);
    sim.operate('sw2', 'toggle');
    sim.solve();
    expect(sim.results.meas['la1'].brightness).toBeLessThan(0.05);
  });
});

/* ------------------------------------------------------------------ */

describe('scenario 3 — socket circuit behind a 30 mA RCD and a B16', () => {
  it('carries a 3 kW heater without operating anything', () => {
    const p = socketCircuitDemo();
    const z = p.components.find((c) => c.id === 'z1')!;
    z.props = { ...z.props, pluggedW: 3000, plugged: true };
    const sim = new Simulator(p);
    sim.step(60);
    const i = sim.results.meas['z1'].I;
    expect(i).toBeGreaterThan(12.5);
    expect(i).toBeLessThan(13.6);
    expect(sim.results.state['q1'].tripped).toBe(false);
    expect(sim.results.state['rc1'].tripped).toBe(false);
    // Voltage drop over 15 m of 2,5 mm² is small but real.
    expect(sim.results.meas['z1'].U).toBeLessThan(230);
    expect(sim.results.meas['z1'].U).toBeGreaterThan(220);
  });

  it('trips the B16 thermally on a 5 kW load, after a realistic delay', () => {
    const p = socketCircuitDemo();
    const z = p.components.find((c) => c.id === 'z1')!;
    z.props = { ...z.props, pluggedW: 5000, plugged: true };
    const sim = new Simulator(p);
    sim.solve();
    expect(sim.results.meas['z1'].I).toBeGreaterThan(20);
    const t = runUntil(sim, (s) => !!s.results.state['q1'].tripped, 4000, 60);
    expect(t).toBeLessThan(3600);
    expect(t).toBeGreaterThan(60);
    const ev = sim.log.find((e) => e.key === 'log.mcbTripThermal');
    expect(ev).toBeTruthy();
    expect(ev!.ref).toContain('ČSN 33 2000-4-43');
    expect(sim.results.meas['z1'].I).toBeLessThan(0.1);
  });
});

/* ------------------------------------------------------------------ */

describe('scenario 4 — short circuit L-N at the socket', () => {
  it('operates the MCB magnetically within milliseconds', () => {
    const p = socketCircuitDemo();
    const sim = new Simulator(p);
    sim.solve();
    sim.addFault({
      id: 'f1', kind: 'shortLN', target: 'z1', terminal: 'out.L', terminal2: 'out.N',
      resistance: 0.01, enabled: true,
    });
    sim.solve();
    const ipk = sim.results.meas['q1'].I;
    expect(ipk).toBeGreaterThan(200);
    const t = runUntil(sim, (s) => !!s.results.state['q1'].tripped, 1, 0.01);
    expect(t).toBeLessThan(0.05);
    const ev = sim.log.find((e) => e.key === 'log.mcbTripMagnetic');
    expect(ev).toBeTruthy();
    expect(ev!.vars!.curve).toBe('B');
    expect(ev!.ref).toContain('434');
  });
});

/* ------------------------------------------------------------------ */

function touchProject(withRcd: boolean): Project {
  const p = socketCircuitDemo();
  if (!withRcd) {
    const rc = p.components.find((c) => c.id === 'rc1')!;
    rc.type = 'mcb';
    rc.props = { inA: 40, curve: 'B', poles: '4P', icn: 6000 };
  }
  return p;
}

describe('scenario 5 — a person touching a live conductor', () => {
  it('trips the 30 mA RCD inside the required time', () => {
    const sim = new Simulator(touchProject(true));
    sim.solve();
    sim.addFault({
      id: 't1', kind: 'touch', target: 'z1', terminal: 'out.L',
      bodyResistance: 1000, standingResistance: 0, enabled: true,
    });
    sim.solve();
    expect(sim.results.bodyCurrent).toBeGreaterThan(0.15);
    const t = runUntil(sim, (s) => !!s.results.state['rc1'].tripped, 1, 0.002);
    expect(t).toBeLessThan(0.3);
    const ev = sim.log.find((e) => e.key === 'log.rcdTrip');
    expect(ev).toBeTruthy();
    expect(ev!.ref).toContain('411.3.3');
    sim.solve();
    expect(sim.results.bodyCurrent).toBeLessThan(0.001);
  });

  it('shows a lethal current and a fatal outcome when only an MCB is fitted', () => {
    const sim = new Simulator(touchProject(false));
    sim.solve();
    sim.addFault({
      id: 't1', kind: 'touch', target: 'z1', terminal: 'out.L',
      bodyResistance: 1000, standingResistance: 0, enabled: true,
    });
    sim.step(2);
    expect(sim.results.state['rc1'].tripped).toBe(false);
    expect(sim.results.bodyCurrent).toBeGreaterThan(0.15);
    const shock = sim.log.find((e) => e.key === 'log.bodyCurrent');
    expect(shock).toBeTruthy();
    expect(shock!.level).toBe('danger');
    expect(sim.log.some((e) => e.key === 'log.fatalOutcome')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

describe('scenario 6 — class I appliance with a lost PE and an internal fault', () => {
  function build(): Project {
    const b = new ProjectBuilder('PE test', 'pe');
    b.settings({ system: 'TN-C-S' });
    b.add('supply', 's1', { system: 'TN-C-S', phases: 3, ipk: 3000, rb: 2 });
    b.add('mainEarthBar', 'hop', { ways: 6 });
    b.add('earthElectrode', 'zem', { ra: 10 });
    b.add('nBar', 'nb', { ways: 8 });
    b.add('peBar', 'pb', { ways: 8 });
    b.add('mainBreaker', 'hj', { inA: 25, curve: 'B', poles: '3P', icn: 10000 }, { label: 'HJ' });
    b.add('rcd', 'rc1', { inA: 40, idn: 30, rcdType: 'A', poles: '2P' }, { label: 'RCD1' });
    b.add('mcb', 'q1', { inA: 16, curve: 'B', poles: '1P' }, { label: 'F1' });
    b.add('boiler', 'bo1', { watts: 2000, classI: true }, { label: 'Bojler' });
    b.wire('s1.L1', 'hj.in.L1', 'L1', 10, 5);
    b.wire('s1.PEN', 'hop.t1', 'PEN', 10, 5);
    b.wire('hop.t2', 'nb.t1', 'N', 10, 1);
    b.wire('hop.t3', 'pb.t1', 'PE', 10, 1);
    b.wire('hop.t4', 'zem.pe', 'PE', 16, 3);
    b.wire('hj.out.L1', 'rc1.in.L', 'L1', 10, 0.5);
    b.wire('nb.t2', 'rc1.in.N', 'N', 10, 0.5);
    b.wire('rc1.out.L', 'q1.in.L', 'L1', 10, 0.3);
    b.wire('q1.out.L', 'bo1.in.L', 'L1', 2.5, 12, { id: 'wL' });
    b.wire('rc1.out.N', 'bo1.in.N', 'N', 2.5, 12, { id: 'wN' });
    b.wire('pb.t2', 'bo1.in.PE', 'PE', 2.5, 12, { id: 'wPE' });
    return b.build();
  }

  it('makes the enclosure live without operating the RCD, until somebody touches it', () => {
    const sim = new Simulator(build());
    sim.solve();
    // Healthy: the enclosure sits at earth potential.
    expect(sim.results.nodeV['bo1::case']).toBeLessThan(5);

    // Lose the protective conductor, then fail the insulation to the enclosure.
    sim.addFault({ id: 'pe', kind: 'lossPE', target: 'bo1', wire: 'wPE', enabled: true });
    sim.addFault({ id: 'if', kind: 'earthFault', target: 'bo1', terminal: 'in.L', resistance: 0.5, enabled: true });
    sim.step(1);
    expect(sim.results.nodeV['bo1::case']).toBeGreaterThan(200);
    expect(sim.results.state['rc1'].tripped).toBe(false);
    expect(sim.results.maxTouchVoltage).toBeGreaterThan(200);

    // Now somebody takes hold of it.
    sim.addFault({
      id: 'tch', kind: 'touch', target: 'bo1', terminal: '::case',
      bodyResistance: 1000, standingResistance: 500, enabled: true,
    });
    const t = runUntil(sim, (s) => !!s.results.state['rc1'].tripped, 1, 0.002);
    expect(t).toBeLessThan(0.3);
  });

  it('operates the RCD immediately when the PE is intact', () => {
    const sim = new Simulator(build());
    sim.solve();
    sim.addFault({ id: 'if', kind: 'earthFault', target: 'bo1', terminal: 'in.L', resistance: 200, enabled: true });
    const t = runUntil(sim, (s) => !!s.results.state['rc1'].tripped, 1, 0.002);
    expect(t).toBeLessThan(0.3);
  });
});

/* ------------------------------------------------------------------ */

describe('scenario 7 — three-phase cooker with a broken neutral', () => {
  function build(): Project {
    const b = new ProjectBuilder('Broken neutral', 'bn');
    b.settings({ system: 'TN-S' });
    b.add('supply', 's1', { system: 'TN-S', phases: 3, ipk: 5000, rb: 2 });
    b.add('mainEarthBar', 'hop', { ways: 6 });
    b.add('nBar', 'nb', { ways: 8 });
    b.add('peBar', 'pb', { ways: 8 });
    b.add('mainBreaker', 'hj', { inA: 25, curve: 'B', poles: '3P', icn: 10000 }, { label: 'HJ' });
    b.add('mcb', 'q1', { inA: 16, curve: 'B', poles: '4P' }, { label: 'F1' });
    b.add('cooker3f', 'sp1', { watts: 6000, wL1: 3000, wL2: 1500, wL3: 400 }, { label: 'Sporák' });
    for (const ph of ['L1', 'L2', 'L3'] as const) {
      b.wire(`s1.${ph}`, `hj.in.${ph}`, ph, 10, 5);
      b.wire(`hj.out.${ph}`, `q1.in.${ph}`, ph, 10, 1);
      b.wire(`q1.out.${ph}`, `sp1.in.${ph}`, ph, 4, 10);
    }
    b.wire('s1.N', 'nb.t1', 'N', 10, 5);
    b.wire('s1.PE', 'hop.t1', 'PE', 10, 5);
    b.wire('hop.t2', 'pb.t1', 'PE', 10, 1);
    b.wire('nb.t2', 'q1.in.N', 'N', 10, 1);
    b.wire('q1.out.N', 'sp1.in.N', 'N', 4, 10, { id: 'wN' });
    b.wire('pb.t2', 'sp1.in.PE', 'PE', 4, 10);
    return b.build();
  }

  it('shifts the phase voltages and over-volts the lightly loaded phase', () => {
    const sim = new Simulator(build());
    sim.solve();
    const before = {
      L1: sim.results.meas['sp1'].U_L1,
      L2: sim.results.meas['sp1'].U_L2,
      L3: sim.results.meas['sp1'].U_L3,
    };
    for (const u of Object.values(before)) expect(u).toBeGreaterThan(215);

    sim.addFault({ id: 'n', kind: 'cableDamage', target: 'sp1', wire: 'wN', resistance: 1e9, enabled: true });
    sim.step(0.5);
    const after = {
      L1: sim.results.meas['sp1'].U_L1,
      L2: sim.results.meas['sp1'].U_L2,
      L3: sim.results.meas['sp1'].U_L3,
    };
    // The heavily loaded phase collapses, the lightly loaded one is over-volted.
    expect(after.L1).toBeLessThan(before.L1 - 30);
    expect(after.L3).toBeGreaterThan(250);
    // The neutral point has moved away from earth potential.
    expect(sim.results.nodeV['sp1:in.N']).toBeGreaterThan(40);
  });

  it('is reported by the design rule check as a disconnection problem', () => {
    const p = build();
    p.wires = p.wires.filter((w) => w.id !== 'wN');
    const report = runDesignRuleCheck(p);
    const bad = report.findings.filter((f) => f.status === 'fail' || f.status === 'warn');
    expect(bad.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */

describe('scenario 8 — B16 feeding 1,5 mm²', () => {
  function build(csa: number, length: number): Project {
    const b = new ProjectBuilder('Undersized', 'us');
    b.settings({ system: 'TN-C-S', defaultInstallMethod: 'B2' });
    b.circuit('c1', 'Zásuvky', 'socket');
    b.add('supply', 's1', { system: 'TN-C-S', phases: 1, ipk: 3000 });
    b.add('mainEarthBar', 'hop', { ways: 6 });
    b.add('earthElectrode', 'zem', { ra: 10 });
    b.add('nBar', 'nb', { ways: 8 });
    b.add('peBar', 'pb', { ways: 8 });
    b.add('mainBreaker', 'hj', { inA: 25, curve: 'B', poles: '1P', icn: 10000 }, { label: 'HJ' });
    b.add('rcd', 'rc1', { inA: 40, idn: 30, rcdType: 'A', poles: '2P' }, { label: 'RCD1' });
    b.add('mcb', 'q1', { inA: 16, curve: 'B', poles: '1P' }, { label: 'F1', circuit: 'c1' });
    b.add('socket16', 'z1', { outlets: 2 }, { label: 'Z1', circuit: 'c1' });
    b.wire('s1.L1', 'hj.in.L', 'L1', 10, 5);
    b.wire('s1.PEN', 'hop.t1', 'PEN', 10, 5);
    b.wire('hop.t2', 'nb.t1', 'N', 10, 1);
    b.wire('hop.t3', 'pb.t1', 'PE', 10, 1);
    b.wire('hop.t4', 'zem.pe', 'PE', 16, 3);
    b.wire('hj.out.L', 'rc1.in.L', 'L1', 10, 0.5);
    b.wire('nb.t2', 'rc1.in.N', 'N', 10, 0.5);
    b.wire('rc1.out.L', 'q1.in.L', 'L1', 10, 0.3, { circuit: 'c1' });
    b.wire('q1.out.L', 'z1.in.L', 'L1', csa, length, { circuit: 'c1', installMethod: 'B2' });
    b.wire('rc1.out.N', 'z1.in.N', 'N', csa, length, { circuit: 'c1', installMethod: 'B2' });
    b.wire('pb.t2', 'z1.in.PE', 'PE', csa, length, { circuit: 'c1', installMethod: 'B2' });
    return b.build();
  }

  it('flags the conductor as undersized for the load and the length', () => {
    const report = runDesignRuleCheck(build(1.5, 28));
    const csaFail = report.findings.find((f) => f.rule === 'cable.minCsa' && f.status === 'fail');
    expect(csaFail).toBeTruthy();
    expect(csaFail!.vars!.csa).toBe(1.5);
    expect(csaFail!.vars!.min).toBe(2.5);
    const dropFail = report.findings.find((f) => f.rule === 'voltageDrop' && f.status !== 'pass');
    expect(dropFail).toBeTruthy();
  });

  it('accepts the same circuit in 2,5 mm² over a sensible length', () => {
    const report = runDesignRuleCheck(build(2.5, 15));
    expect(report.findings.find((f) => f.rule === 'cable.minCsa' && f.status === 'fail')).toBeFalsy();
    expect(report.findings.find((f) => f.rule === 'cable.ampacity' && f.status === 'fail')).toBeFalsy();
    expect(report.findings.find((f) => f.rule === 'voltageDrop' && f.status === 'fail')).toBeFalsy();
  });
});

/* ------------------------------------------------------------------ */

describe('scenario 9 — socket circuits without a 30 mA RCD', () => {
  it('fails the installation and cites the shock protection rule', () => {
    const p = socketCircuitDemo();
    const rc = p.components.find((c) => c.id === 'rc1')!;
    rc.type = 'mcb';
    rc.props = { inA: 40, curve: 'B', poles: '4P', icn: 6000 };
    const report = runDesignRuleCheck(p);
    const f = report.findings.find((x) => x.rule === 'rcd.sockets' && x.status === 'fail');
    expect(f).toBeTruthy();
    expect(f!.ref).toContain('ČSN 33 2000-4-41 ed. 3');
    expect(f!.ref).toContain('411.3.3');
    expect(f!.components).toContain('q1');
    expect(report.summary.fail).toBeGreaterThan(0);
  });

  it('passes the same circuit with the RCD in place', () => {
    const report = runDesignRuleCheck(socketCircuitDemo());
    expect(report.findings.find((x) => x.rule === 'rcd.sockets' && x.status === 'fail')).toBeFalsy();
    expect(report.findings.find((x) => x.rule === 'rcd.sockets' && x.status === 'pass')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */

describe('instruments', () => {
  it('measures a loop impedance consistent with the cable that is installed', () => {
    const sim = new Simulator(socketCircuitDemo());
    sim.solve();
    const r = measureLoop(sim, { comp: 'z1', terminal: 'in.L' }, { comp: 'z1', terminal: 'in.PE' }, 'L-PE');
    expect(r.zs).toBeGreaterThan(0.1);
    expect(r.zs).toBeLessThan(3);
    expect(r.ipf).toBeGreaterThan(80);
  });

  it('reports a healthy socket and detects a missing protective conductor', () => {
    const p = socketCircuitDemo();
    const sim = new Simulator(p);
    sim.solve();
    expect(testSocket(sim, 'z1').correct).toBe(true);

    const p2 = socketCircuitDemo();
    p2.wires = p2.wires.filter((w) => !(w.to.comp === 'z1' && w.to.terminal === 'in.PE'));
    const sim2 = new Simulator(p2);
    sim2.solve();
    const r = testSocket(sim2, 'z1');
    expect(r.correct).toBe(false);
    expect(r.faults.length).toBeGreaterThan(0);
  });

  it('tests the RCD at 1× and 5× IΔn and refuses to trip at 0,5×', () => {
    const sim = new Simulator(socketCircuitDemo());
    sim.solve();
    const at1 = testRcd(sim, { comp: 'z1', terminal: 'in.L' }, 1);
    expect(at1.found).toBe(true);
    expect(at1.tripMs).not.toBeNull();
    expect(at1.tripMs!).toBeLessThanOrEqual(300);
    expect(at1.pass).toBe(true);
    const at5 = testRcd(sim, { comp: 'z1', terminal: 'in.L' }, 5);
    expect(at5.tripMs!).toBeLessThanOrEqual(40);
    const half = testRcd(sim, { comp: 'z1', terminal: 'in.L' }, 0.5);
    expect(half.tripMs).toBeNull();
    expect(half.pass).toBe(true);
  });

  it('measures insulation resistance on a healthy and a degraded circuit', () => {
    const sim = new Simulator(socketCircuitDemo());
    sim.solve();
    const good = measureInsulation(sim, { comp: 'z1', terminal: 'in.L' }, { comp: 'z1', terminal: 'in.PE' });
    expect(good.pass).toBe(true);
    expect(good.megohms).toBeGreaterThan(1);

    sim.addFault({ id: 'i1', kind: 'insulation', target: 'z1', terminal: 'in.L', resistance: 20000, enabled: true });
    sim.solve();
    const bad = measureInsulation(sim, { comp: 'z1', terminal: 'in.L' }, { comp: 'z1', terminal: 'in.PE' });
    expect(bad.pass).toBe(false);
  });

  it('reads the phase rotation of a healthy three-phase supply', () => {
    const sim = new Simulator(houseBoard());
    sim.solve();
    const r = measureRotation(
      sim,
      { comp: 's1', terminal: 'L1' },
      { comp: 's1', terminal: 'L2' },
      { comp: 's1', terminal: 'L3' },
    );
    expect(r.rotation).toBe('L1-L2-L3');
  });
});

/* ------------------------------------------------------------------ */

describe('templates', () => {
  it('builds and solves the family house board without errors', () => {
    const sim = new Simulator(houseBoard());
    sim.step(1);
    expect(sim.results.solved).toBe(true);
    expect(sim.results.phaseU.L1).toBeGreaterThan(215);
    expect(sim.results.phaseU.L2).toBeGreaterThan(215);
    expect(sim.results.phaseU.L3).toBeGreaterThan(215);
    // Nothing should have tripped on a healthy board.
    for (const id of ['f1', 'f2', 'f3', 'f4', 'f5', 'hj']) {
      expect(sim.results.state[id].tripped).toBeFalsy();
    }
  });

  it('produces a design rule report for the family house board', () => {
    const report = runDesignRuleCheck(houseBoard());
    expect(report.findings.length).toBeGreaterThan(10);
    expect(report.summary.pass).toBeGreaterThan(5);
    const evse = report.findings.find((f) => f.rule === 'evse');
    expect(evse?.status).toBe('pass');
  });
});
