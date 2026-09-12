import { describe, it, expect } from 'vitest';
import {
  Simulator, lampOneWay, mcbTripTime, rcdTripTime, ampacity, conductorResistance,
  loadImpedance, Network, EARTH,
} from '../src/index.js';

describe('physics primitives', () => {
  it('computes conductor resistance from length, cross-section and material', () => {
    // 2,5 mm² copper, 20 m, at 70 °C: ρ ≈ 0,0222 Ω·mm²/m
    const r = conductorResistance(20, 2.5, 'Cu', 70);
    expect(r).toBeGreaterThan(0.16);
    expect(r).toBeLessThan(0.19);
    expect(conductorResistance(20, 2.5, 'Al', 70)).toBeGreaterThan(r);
  });

  it('derates current-carrying capacity for method and ambient temperature', () => {
    const izC = ampacity({ csa: 2.5, material: 'Cu', method: 'C', loadedConductors: 2 });
    const izB2 = ampacity({ csa: 2.5, material: 'Cu', method: 'B2', loadedConductors: 3 });
    expect(izC).toBeCloseTo(27, 1);
    expect(izB2).toBeCloseTo(20, 1);
    expect(ampacity({ csa: 2.5, material: 'Cu', method: 'C', ambientTemp: 45 })).toBeLessThan(izC);
  });

  it('turns a rated power and power factor into an impedance', () => {
    const z = loadImpedance(2300, 230, 1);
    expect(z.r).toBeCloseTo(23, 2);
    expect(z.x).toBeCloseTo(0, 6);
    const zm = loadImpedance(2300, 230, 0.8);
    expect(zm.x).toBeGreaterThan(0);
  });

  it('solves a simple divider with the nodal solver', () => {
    const net = new Network();
    const a = net.node('a');
    const b = net.node('b');
    net.addV(a, EARTH, 230, 0, 0, 0);
    net.addZ(a, b, 10);
    net.addZ(b, EARTH, 10);
    const sol = net.solve();
    expect(sol.vmag(b)).toBeCloseTo(115, 0);
  });
});

describe('protective device characteristics', () => {
  it('puts a B-curve MCB into the magnetic region above 4×In', () => {
    expect(mcbTripTime(16 * 4.5, 16, 'B').region).toBe('magnetic');
    expect(mcbTripTime(16 * 4.5, 16, 'B').time).toBeLessThan(0.02);
    expect(mcbTripTime(16 * 4.5, 16, 'C').region).toBe('thermal');
  });

  it('never trips below the conventional non-tripping current', () => {
    expect(mcbTripTime(16 * 1.05, 16, 'B').time).toBe(Infinity);
  });

  it('trips faster as the overload grows', () => {
    const a = mcbTripTime(16 * 1.4, 16, 'B').time;
    const b = mcbTripTime(16 * 2.0, 16, 'B').time;
    expect(a).toBeGreaterThan(b);
    expect(b).toBeLessThan(120);
  });

  it('keeps RCD operating times inside the ČSN EN 61008-1 limits', () => {
    const at1 = rcdTripTime(0.03, 0.03);
    expect(at1.typical).toBeLessThanOrEqual(0.3);
    const at5 = rcdTripTime(0.15, 0.03);
    expect(at5.typical).toBeLessThanOrEqual(0.04);
    const s = rcdTripTime(0.03, 0.03, 'S');
    expect(s.minNonActuating).toBeGreaterThanOrEqual(0.13);
  });
});

describe('scenario 1 — lamp with a one-way switch', () => {
  it('lights only when the switch is closed', () => {
    const sim = new Simulator(lampOneWay());
    sim.solve();
    expect(sim.results.meas['la1'].brightness).toBeLessThan(0.01);
    expect(sim.results.meas['la1'].U).toBeLessThan(20);

    sim.operate('sw1', 'toggle');
    sim.solve();
    expect(sim.results.meas['la1'].U).toBeGreaterThan(215);
    expect(sim.results.meas['la1'].brightness).toBeGreaterThan(0.8);
    expect(sim.results.meas['la1'].I).toBeGreaterThan(0.2);

    sim.operate('sw1', 'toggle');
    sim.solve();
    expect(sim.results.meas['la1'].brightness).toBeLessThan(0.01);
  });
});
