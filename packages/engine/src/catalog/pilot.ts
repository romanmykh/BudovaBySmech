/**
 * Pilot devices for control circuits (ČSN EN 60947-5-1): push buttons,
 * selector switches, the emergency stop and the limit switch. Every contact is
 * numbered as printed on the device, see contacts.ts.
 */
import type { ComponentDef } from './types.js';
import { strOptions } from './common.js';
import {
  parseContacts, contactsWidth, contactColumns, contactTerminals, stampContacts,
  BUTTON_CONTACT_OPTIONS,
} from './contacts.js';

const H = 60;
/** Room on the left for the actuator drawn in the symbol. */
export const PILOT_X0 = 18;
const X0 = PILOT_X0;

function pilotWidth(spec: unknown): number {
  return Math.max(44, X0 + 8 + contactsWidth(parseContacts(spec)));
}

export const pilotDefs: ComponentDef[] = [
  {
    type: 'pushButton',
    category: 'relays',
    symbol: 'pushButton',
    size: (p) => ({ w: pilotWidth(p.contacts), h: H }),
    interactive: 'button',
    keywords: ['tlačítko', 'ovládací tlačítko', 'START', 'STOP', 'push button', 'przycisk', 'кнопка'],
    defaultProps: { contacts: '1NO', color: 'green' },
    props: [
      { key: 'contacts', type: 'select', options: strOptions(BUTTON_CONTACT_OPTIONS) },
      { key: 'color', type: 'select', options: strOptions(['green', 'red', 'black', 'white', 'yellow', 'blue']) },
    ],
    terminals: (p) => contactTerminals(contactColumns(parseContacts(p.contacts), X0), H),
    initState: () => ({ pressed: false }),
    stamp: (ctx) => stampContacts(ctx, contactColumns(parseContacts(ctx.props.contacts), X0), !!ctx.state.pressed),
    update: (ctx) => ctx.meas('closed', ctx.state.pressed ? 1 : 0),
  },

  {
    type: 'selectorSwitch',
    category: 'relays',
    symbol: 'selectorSwitch',
    size: (p) => ({ w: p.positions === '1-0-2' ? pilotWidth('2NO') : pilotWidth(p.contacts), h: H }),
    interactive: 'toggle',
    keywords: ['přepínač', 'vačkový', 'ovládací přepínač', 'selector', 'przełącznik', 'перемикач', 'переключатель', 'ruka-0-auto'],
    defaultProps: { positions: '0-1', contacts: '1NO' },
    props: [
      { key: 'positions', type: 'select', options: strOptions(['0-1', '1-0-2']) },
      { key: 'contacts', type: 'select', options: strOptions(BUTTON_CONTACT_OPTIONS), when: (p) => p.positions !== '1-0-2' },
    ],
    // 1-0-2: contact 13-14 closes in position 1, 23-24 in position 2.
    terminals: (p) =>
      contactTerminals(contactColumns(p.positions === '1-0-2' ? ['NO', 'NO'] : parseContacts(p.contacts), X0), H),
    initState: () => ({ pos3: 0, lastSide: 2 }),
    stamp: (ctx) => {
      const pos = Number(ctx.state.pos3) || 0;
      if (ctx.props.positions === '1-0-2') {
        const [a, b] = contactColumns(['NO', 'NO'], X0);
        stampContacts(ctx, [a!], pos === 1);
        stampContacts(ctx, [b!], pos === 2);
      } else {
        stampContacts(ctx, contactColumns(parseContacts(ctx.props.contacts), X0), pos !== 0);
      }
    },
    update: (ctx) => ctx.meas('position', Number(ctx.state.pos3) || 0),
  },

  {
    type: 'emergencyStop',
    category: 'relays',
    symbol: 'emergencyStop',
    size: (p) => ({ w: pilotWidth(p.contacts), h: H }),
    interactive: 'toggle',
    keywords: ['nouzové zastavení', 'TOTAL STOP', 'central stop', 'emergency stop', 'grzybek', 'аварійна кнопка', 'аварийная кнопка'],
    defaultProps: { contacts: '1NC' },
    props: [{ key: 'contacts', type: 'select', options: strOptions(['1NC', '2NC', '1NO+1NC']) }],
    terminals: (p) => contactTerminals(contactColumns(parseContacts(p.contacts), X0), H),
    // Latches when pressed; a second operation unlocks it (turn to release).
    initState: () => ({ latched: false }),
    stamp: (ctx) => stampContacts(ctx, contactColumns(parseContacts(ctx.props.contacts), X0), !!ctx.state.latched),
    update: (ctx) => ctx.meas('closed', ctx.state.latched ? 1 : 0),
  },

  {
    type: 'limitSwitch',
    category: 'relays',
    symbol: 'limitSwitch',
    size: (p) => ({ w: pilotWidth(p.contacts), h: H }),
    interactive: 'toggle',
    keywords: ['koncový spínač', 'limit switch', 'krańcówka', 'кінцевий вимикач', 'концевик'],
    defaultProps: { contacts: '1NO+1NC' },
    props: [{ key: 'contacts', type: 'select', options: strOptions(BUTTON_CONTACT_OPTIONS) }],
    terminals: (p) => contactTerminals(contactColumns(parseContacts(p.contacts), X0), H),
    initState: () => ({ actuated: false }),
    stamp: (ctx) => stampContacts(ctx, contactColumns(parseContacts(ctx.props.contacts), X0), !!ctx.state.actuated),
    update: (ctx) => ctx.meas('closed', ctx.state.actuated ? 1 : 0),
  },
];
