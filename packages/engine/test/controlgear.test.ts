import { describe, it, expect } from 'vitest';
import { Simulator, contactorMotor, reversingMotor, timedLighting, ProjectBuilder, terminalsOf } from '../src/index.js';

const closed = (sim: Simulator, id: string) => !!sim.results.meas[id]?.closed;

describe('contact markings (EN 50005)', () => {
  it('numbers auxiliary and changeover contacts as printed on the device', () => {
    const km = terminalsOf('motorContactor', { aux: '1NO+1NC' }).map((t) => t.mark);
    expect(km).toEqual(expect.arrayContaining(['1/L1', '2/T1', '5/L3', '6/T3', 'A1', 'A2', '13', '14', '21', '22']));
    const k = terminalsOf('controlRelay', { contacts: '2CO' }).map((t) => t.mark);
    expect(k).toEqual(expect.arrayContaining(['11', '12', '14', '21', '22', '24']));
    const tr = terminalsOf('timeRelay', {}).map((t) => t.mark);
    expect(tr).toEqual(expect.arrayContaining(['15', '16', '18']));
  });
});

describe('direct-on-line start with self-holding', () => {
  it('starts on START, holds after release, stops on STOP', () => {
    const sim = new Simulator(contactorMotor());
    sim.solve();
    expect(closed(sim, 'km1')).toBe(false);
    sim.operate('sb1', 'press');
    sim.step(0.1);
    sim.operate('sb1', 'release');
    sim.step(0.5);
    expect(closed(sim, 'km1')).toBe(true);
    expect(sim.results.meas['m1'].I_L1).toBeGreaterThan(2);
    expect(sim.results.meas['m1'].rotation).toBe(1);
    expect(sim.results.meas['hl1'].brightness).toBeGreaterThan(0.8);
    sim.operate('sb0', 'press');
    sim.step(0.1);
    sim.operate('sb0', 'release');
    sim.step(0.5);
    expect(closed(sim, 'km1')).toBe(false);
    expect(sim.results.meas['m1'].I_L1 ?? 0).toBeLessThan(0.1);
  });

  it('drops out when the overload relay opens 95-96 and lights the fault lamp', () => {
    const p = contactorMotor();
    p.components.find((c) => c.id === 'f2')!.props.setA = 2;
    const sim = new Simulator(p);
    sim.solve();
    sim.operate('sb1', 'press');
    sim.step(0.1);
    sim.operate('sb1', 'release');
    for (let i = 0; i < 200 && !sim.state('f2').tripped; i++) sim.step(5);
    sim.step(0.2);
    expect(sim.state('f2').tripped).toBe(true);
    expect(closed(sim, 'km1')).toBe(false);
    expect(sim.results.meas['hl2'].brightness).toBeGreaterThan(0.8);
  });
});

describe('reversing starter with interlock', () => {
  it('runs each way and never closes both contactors', () => {
    const sim = new Simulator(reversingMotor());
    sim.solve();
    sim.operate('sb1', 'press');
    sim.step(0.1);
    sim.operate('sb1', 'release');
    sim.step(0.3);
    expect(closed(sim, 'km1')).toBe(true);
    expect(sim.results.meas['m1'].rotation).toBe(1);
    // Reverse pressed while running forward: interlocked, nothing changes.
    sim.operate('sb2', 'press');
    sim.step(0.1);
    sim.operate('sb2', 'release');
    sim.step(0.3);
    expect(closed(sim, 'km1')).toBe(true);
    expect(closed(sim, 'km2')).toBe(false);
    // Stop, then reverse.
    sim.operate('sb0', 'press');
    sim.step(0.1);
    sim.operate('sb0', 'release');
    sim.step(0.2);
    sim.operate('sb2', 'press');
    sim.step(0.1);
    sim.operate('sb2', 'release');
    sim.step(0.3);
    expect(closed(sim, 'km1')).toBe(false);
    expect(closed(sim, 'km2')).toBe(true);
    expect(sim.results.meas['m1'].rotation).toBe(-1);
  });
});

describe('time relay', () => {
  it('off-delay keeps the lights on for the set time after the button', () => {
    const sim = new Simulator(timedLighting());
    sim.solve();
    sim.operate('sb2', 'press');
    sim.step(0.2);
    sim.operate('sb2', 'release');
    sim.step(1);
    expect(sim.results.meas['la1'].brightness).toBeGreaterThan(0.8);
    for (let i = 0; i < 25; i++) sim.step(1);
    expect(sim.results.meas['la2'].brightness).toBeGreaterThan(0.8);
    for (let i = 0; i < 6; i++) sim.step(1);
    expect(sim.results.meas['la1'].brightness).toBeLessThan(0.1);
  });

  it('flasher cycles its contact while energised', () => {
    const b = new ProjectBuilder('flash', 'f');
    b.add('supply', 's1', { system: 'TN-S', phases: 1 }, {});
    b.add('timeRelay', 'kt', { mode: 'flasher', delay: 1, offTime: 1, coilV: 230 }, {});
    b.wire('s1.L1', 'kt.A1', 'L1', 1.5, 1);
    b.wire('s1.N', 'kt.A2', 'N', 1.5, 1);
    const sim = new Simulator(b.build());
    sim.solve();
    sim.step(0.1);
    const seen = new Set<number>();
    for (let i = 0; i < 12; i++) {
      sim.step(0.25);
      seen.add(sim.results.meas['kt'].closed);
    }
    expect([...seen].sort()).toEqual([0, 1]);
  });
});

describe('pilot devices', () => {
  it('three-position selector passes through 0', () => {
    const b = new ProjectBuilder('sel', 's');
    b.add('selectorSwitch', 'sa', { positions: '1-0-2' }, {});
    const sim = new Simulator(b.build());
    sim.solve();
    const pos: number[] = [];
    for (let i = 0; i < 4; i++) {
      sim.operate('sa', 'toggle');
      sim.solve();
      pos.push(sim.results.meas['sa'].position);
    }
    expect(pos).toEqual([1, 0, 2, 0]);
  });
});
