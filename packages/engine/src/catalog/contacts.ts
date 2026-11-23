/**
 * Auxiliary and control contacts, numbered the way they are printed on the
 * device (ČSN EN 50005 / ČSN EN 60947-5-1):
 *
 *   - the first digit is the sequence number of the contact on the device,
 *   - the second digit is its function: 1-2 normally closed (NC),
 *     3-4 normally open (NO), 1-2-4 changeover (CO, 1 = common).
 *
 * So a contactor with 1NO+1NC auxiliaries carries 13-14 and 21-22, a relay
 * with two changeover contacts carries 11-12-14 and 21-22-24.
 */
import type { StampCtx, TerminalDef } from './types.js';
import { R_CLOSED, R_OPEN } from './common.js';

export type ContactKind = 'NO' | 'NC' | 'CO';

/** Width in schematic pixels of one contact column. */
export const CONTACT_W: Record<ContactKind, number> = { NO: 20, NC: 20, CO: 30 };

/** '1NO+1NC' → ['NO', 'NC'];  '2CO' → ['CO', 'CO'];  'none' → []. */
export function parseContacts(spec: unknown): ContactKind[] {
  const s = String(spec ?? '').trim();
  if (!s || s === 'none') return [];
  const out: ContactKind[] = [];
  for (const part of s.split('+')) {
    const m = /^(\d*)\s*(NO|NC|CO)$/i.exec(part.trim());
    if (!m) continue;
    const n = Math.max(1, Math.min(8, Number(m[1] || 1)));
    for (let i = 0; i < n; i++) out.push(m[2]!.toUpperCase() as ContactKind);
  }
  return out;
}

export function contactsWidth(kinds: ContactKind[]): number {
  return kinds.reduce((s, k) => s + CONTACT_W[k], 0);
}

export interface ContactColumn {
  kind: ContactKind;
  /** Sequence digit printed as the first digit of the marking. */
  seq: number;
  /** Centre of the column. */
  x: number;
  /** Terminal ids. NO/NC: a (top) and b (bottom). CO: c (top), nc and no (bottom). */
  ids: { a?: string; b?: string; c?: string; nc?: string; no?: string };
  marks: { a?: string; b?: string; c?: string; nc?: string; no?: string };
}

/**
 * Lay out a row of contacts starting at `x0`. `prefix` keeps the ids of
 * different contact groups on one device apart; `seq0` is the first
 * sequence digit.
 */
export function contactColumns(kinds: ContactKind[], x0: number, prefix = 'k', seq0 = 1): ContactColumn[] {
  let x = x0;
  return kinds.map((kind, i) => {
    const w = CONTACT_W[kind];
    const cx = x + w / 2;
    x += w;
    const seq = seq0 + i;
    const id = `${prefix}${seq}`;
    if (kind === 'CO') {
      return {
        kind,
        seq,
        x: cx,
        ids: { c: `${id}.c`, nc: `${id}.nc`, no: `${id}.no` },
        marks: { c: `${seq}1`, nc: `${seq}2`, no: `${seq}4` },
      };
    }
    return {
      kind,
      seq,
      x: cx,
      ids: { a: `${id}.a`, b: `${id}.b` },
      marks: kind === 'NO' ? { a: `${seq}3`, b: `${seq}4` } : { a: `${seq}1`, b: `${seq}2` },
    };
  });
}

export function contactTerminals(cols: ContactColumn[], h: number): TerminalDef[] {
  const out: TerminalDef[] = [];
  for (const c of cols) {
    if (c.kind === 'CO') {
      out.push({ id: c.ids.c!, role: 'ctrl', mark: c.marks.c, x: c.x, y: 0, side: 'top' });
      out.push({ id: c.ids.nc!, role: 'ctrl', mark: c.marks.nc, x: c.x - 7, y: h, side: 'bottom' });
      out.push({ id: c.ids.no!, role: 'ctrl', mark: c.marks.no, x: c.x + 7, y: h, side: 'bottom' });
    } else {
      out.push({ id: c.ids.a!, role: 'ctrl', mark: c.marks.a, x: c.x, y: 0, side: 'top' });
      out.push({ id: c.ids.b!, role: 'ctrl', mark: c.marks.b, x: c.x, y: h, side: 'bottom' });
    }
  }
  return out;
}

/** Stamp every contact for the given actuated state of the device. */
export function stampContacts(ctx: StampCtx, cols: ContactColumn[], actuated: boolean): void {
  for (const c of cols) {
    if (c.kind === 'CO') {
      ctx.R(ctx.node(c.ids.c!), ctx.node(c.ids.nc!), actuated ? R_OPEN : R_CLOSED, `${c.ids.c}.nc`);
      ctx.R(ctx.node(c.ids.c!), ctx.node(c.ids.no!), actuated ? R_CLOSED : R_OPEN, `${c.ids.c}.no`);
    } else {
      const closed = c.kind === 'NO' ? actuated : !actuated;
      ctx.R(ctx.node(c.ids.a!), ctx.node(c.ids.b!), closed ? R_CLOSED : R_OPEN, c.ids.a);
    }
  }
}

export const AUX_OPTIONS = ['none', '1NO', '1NC', '1NO+1NC', '2NO', '2NC', '2NO+2NC'];
export const RELAY_CONTACT_OPTIONS = ['1CO', '2CO', '3CO', '4CO', '1NO', '2NO', '1NO+1NC'];
export const BUTTON_CONTACT_OPTIONS = ['1NO', '1NC', '1NO+1NC', '2NO', '2NC'];
