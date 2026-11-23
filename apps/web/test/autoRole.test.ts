import { describe, it, expect } from 'vitest';
import type { ComponentInstance, Wire } from '@budova/engine';
import { inferRole } from '../src/canvas/autoRole.js';

const comp = (id: string, type: string, props: Record<string, unknown> = {}): ComponentInstance =>
  ({ id, type, x: 0, y: 0, rot: 0, props }) as ComponentInstance;

describe('automatic conductor role', () => {
  const comps = [
    comp('q', 'mcb', { poles: '3P' }),
    comp('km', 'motorContactor'),
    comp('m', 'motor3f'),
    comp('sb', 'pushButton'),
    comp('nb', 'nBar'),
    comp('pb', 'peBar'),
  ];
  const wires: Wire[] = [];
  it('follows the phase marking of a power terminal', () => {
    expect(inferRole(comps, wires, { comp: 'q', terminal: 'out.L2' }, { comp: 'km', terminal: 'in.L2' })).toBe('L2');
    expect(inferRole(comps, wires, { comp: 'km', terminal: 'out.L3' }, { comp: 'm', terminal: 'in.L3' })).toBe('L3');
  });
  it('gives N and PE to neutral and protective terminals', () => {
    expect(inferRole(comps, wires, { comp: 'nb', terminal: 't1' }, { comp: 'm', terminal: 'in.N' })).toBe('N');
    expect(inferRole(comps, wires, { comp: 'pb', terminal: 't1' }, { comp: 'm', terminal: 'in.PE' })).toBe('PE');
  });
  it('uses a control conductor between control terminals', () => {
    expect(inferRole(comps, wires, { comp: 'sb', terminal: 'k1.b' }, { comp: 'km', terminal: 'A1' })).toBe('CTRL');
  });
  it('continues the role already landed on a terminal', () => {
    const w = [{ id: 'w', from: { comp: 'q', terminal: 'out.L1' }, to: { comp: 'sb', terminal: 'k1.a' }, role: 'L1' } as Wire];
    expect(inferRole(comps, w, { comp: 'sb', terminal: 'k1.a' }, { comp: 'km', terminal: 'k1.a' })).toBe('L1');
  });
});
