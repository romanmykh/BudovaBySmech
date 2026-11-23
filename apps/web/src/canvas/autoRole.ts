import type { ComponentInstance, ConductorRole, TerminalDef, Wire } from '@budova/engine';
import { terminalsOf } from '@budova/engine';

export const AUTO_ROLE = 'auto';

interface End {
  comp: string;
  terminal: string;
}

function termDef(components: ComponentInstance[], end: End): TerminalDef | undefined {
  const c = components.find((x) => x.id === end.comp);
  return c ? terminalsOf(c.type, c.props).find((t) => t.id === end.terminal) : undefined;
}

/** Role of a conductor already landed on this terminal, if any. */
function roleOnTerminal(wires: Wire[], end: End): ConductorRole | undefined {
  for (const w of wires) {
    if ((w.from.comp === end.comp && w.from.terminal === end.terminal) || (w.to.comp === end.comp && w.to.terminal === end.terminal)) {
      return w.role;
    }
  }
  return undefined;
}

function phaseFromMark(t: TerminalDef | undefined): ConductorRole | undefined {
  const s = `${t?.mark ?? ''} ${t?.id ?? ''}`;
  if (/L2|T2|\b3\/|\b4\//.test(s)) return 'L2';
  if (/L3|T3|\b5\/|\b6\//.test(s)) return 'L3';
  if (/L1|T1|\bL\b/.test(s)) return 'L1';
  return undefined;
}

/**
 * Pick the conductor role for a new wire from what it joins, so the user does
 * not have to choose L1 / N / PE before every connection: a neutral terminal
 * gets N, a protective one PE, a phase continues the phase already on either
 * end, and a control terminal gets a control conductor.
 */
export function inferRole(components: ComponentInstance[], wires: Wire[], a: End, b: End): ConductorRole {
  const ta = termDef(components, a);
  const tb = termDef(components, b);
  const roles = [ta?.role, tb?.role];
  if (roles.includes('PE') || roles.includes('earth')) {
    const existing = roleOnTerminal(wires, a) ?? roleOnTerminal(wires, b);
    return existing === 'PEN' ? 'PEN' : 'PE';
  }
  if (roles.includes('N')) {
    const existing = roleOnTerminal(wires, a) ?? roleOnTerminal(wires, b);
    return existing === 'PEN' ? 'PEN' : 'N';
  }
  if (roles.includes('elv')) return (ta?.mark ?? tb?.mark ?? '').includes('−') || (ta?.mark ?? tb?.mark ?? '').includes('-') ? 'ELV-' : 'ELV+';
  const existing = roleOnTerminal(wires, a) ?? roleOnTerminal(wires, b);
  if (existing && existing !== 'PE') return existing;
  if (roles.includes('L')) return phaseFromMark(ta?.role === 'L' ? ta : tb) ?? phaseFromMark(tb) ?? 'L1';
  return 'CTRL';
}
