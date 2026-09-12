import type { TerminalDef, TerminalRole, PropOption, StampCtx } from './types.js';
import { R_IDEAL, R_OPEN } from '../physics/network.js';

export type Poles = '1P' | '1P+N' | '2P' | '3P' | '4P' | '3P+N';

export const POLE_OPTIONS: PropOption[] = [
  { value: '1P' }, { value: '1P+N' }, { value: '2P' }, { value: '3P' }, { value: '4P' },
];

/** Conductors handled by a device with the given pole configuration. */
export function poleConductors(poles: Poles): Array<{ id: string; role: TerminalRole; mark: string }> {
  switch (poles) {
    case '1P':
      return [{ id: 'L', role: 'L', mark: 'L' }];
    case '1P+N':
    case '2P':
      return [
        { id: 'L', role: 'L', mark: 'L' },
        { id: 'N', role: 'N', mark: 'N' },
      ];
    case '3P':
      return [
        { id: 'L1', role: 'L', mark: 'L1' },
        { id: 'L2', role: 'L', mark: 'L2' },
        { id: 'L3', role: 'L', mark: 'L3' },
      ];
    case '4P':
    case '3P+N':
      return [
        { id: 'L1', role: 'L', mark: 'L1' },
        { id: 'L2', role: 'L', mark: 'L2' },
        { id: 'L3', role: 'L', mark: 'L3' },
        { id: 'N', role: 'N', mark: 'N' },
      ];
  }
}

/** Which conductors are protected against overcurrent (the neutral of a 1P+N is not). */
export function protectedConductors(poles: Poles): string[] {
  const all = poleConductors(poles).map((c) => c.id);
  if (poles === '1P+N') return ['L'];
  return all;
}

export function isThreePhase(poles: Poles): boolean {
  return poles === '3P' || poles === '4P' || poles === '3P+N';
}

/** Standard in/out terminal pairs for a series device. */
export function seriesTerminals(poles: Poles, w: number, h: number): TerminalDef[] {
  const cond = poleConductors(poles);
  const n = cond.length;
  const out: TerminalDef[] = [];
  cond.forEach((c, i) => {
    const x = Math.round(((i + 1) * w) / (n + 1));
    out.push({ id: `in.${c.id}`, role: c.role, mark: c.mark, x, y: 0, side: 'top', comb: i === 0 });
    out.push({ id: `out.${c.id}`, role: c.role, mark: c.mark, x, y: h, side: 'bottom' });
  });
  return out;
}

/** Width in schematic pixels for a device of `modules` DIN modules. */
export function moduleWidth(modules: number): number {
  return Math.max(40, modules * 20);
}

/** Contact resistance of a closed device pole. */
export const R_CLOSED = 2e-3;

/** Stamp a pole as a switched contact, returning the branch tag used. */
export function stampPole(ctx: StampCtx, cond: string, closed: boolean, rClosed = R_CLOSED): number {
  const a = ctx.node(`in.${cond}`);
  const b = ctx.node(`out.${cond}`);
  return ctx.R(a, b, closed ? rClosed : R_OPEN, `p.${cond}`);
}

export const AMP_RATINGS = [2, 4, 6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
export const MAIN_RATINGS = [16, 20, 25, 32, 40, 50, 63, 80, 100];
export const CSA_OPTIONS: PropOption[] = [0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35].map((v) => ({ value: v }));

export function numOptions(values: number[]): PropOption[] {
  return values.map((v) => ({ value: v }));
}

export function strOptions(values: string[]): PropOption[] {
  return values.map((v) => ({ value: v }));
}

export { R_IDEAL, R_OPEN };
