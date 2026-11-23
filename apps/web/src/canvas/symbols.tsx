import type { JSX } from 'react';
import { contactColumns, parseContacts, PILOT_X0, type ContactColumn } from '@budova/engine';

export interface SymbolCtx {
  w: number;
  h: number;
  props: any;
  state: any;
  meas: Record<string, number>;
  /** Live mode is running, so dynamic state should be drawn. */
  live: boolean;
}

const S = 1.4; // default stroke width

const BUTTON_COLORS: Record<string, string> = {
  green: '#2e9e4f', red: '#c0322b', black: '#222', white: '#ddd', yellow: '#e0b030', blue: '#2f6fd0',
};

const line = (x1: number, y1: number, x2: number, y2: number, extra: any = {}) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={S} {...extra} />
);
const rect = (x: number, y: number, w: number, h: number, extra: any = {}) => (
  <rect x={x} y={y} width={w} height={h} fill="none" strokeWidth={S} {...extra} />
);
const circle = (cx: number, cy: number, r: number, extra: any = {}) => (
  <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={S} {...extra} />
);
const text = (x: number, y: number, t: string, size = 9, extra: any = {}) => (
  <text x={x} y={y} fontSize={size} textAnchor="middle" stroke="none" fill="currentColor" {...extra}>
    {t}
  </text>
);

/** Body outline shared by every modular device. */
function body(w: number, h: number, extra: any = {}) {
  return rect(3, 6, w - 6, h - 12, { rx: 2, ...extra });
}

/** The switching contact drawn open or closed. */
function contact(x: number, yTop: number, yBot: number, closed: boolean) {
  return (
    <g>
      {line(x, yTop, x, yTop + 4)}
      {closed ? line(x, yTop + 4, x, yBot - 4) : line(x, yTop + 4, x + 9, yBot - 6)}
      {line(x, yBot - 4, x, yBot)}
      <circle cx={x} cy={yTop + 4} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={x} cy={yBot - 4} r={1.6} fill="currentColor" stroke="none" />
    </g>
  );
}

function poleColumns(w: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.round(((i + 1) * w) / (n + 1)));
}

function poleCount(poles: string): number {
  switch (poles) {
    case '1P':
      return 1;
    case '1P+N':
    case '2P':
      return 2;
    case '3P':
      return 3;
    default:
      return 4;
  }
}


/**
 * A row of numbered contacts (EN 50005) drawn in their actual state. The
 * actuating linkage is drawn as a dashed line from `linkFrom` across the row.
 */
function contactRow(cols: ContactColumn[], h: number, actuated: boolean, live: boolean, linkFrom?: number): JSX.Element {
  const y1 = h / 2 - 9;
  const y2 = h / 2 + 9;
  const hot = live && actuated ? 'var(--ok)' : 'currentColor';
  const dot = (x: number, y: number) => <circle cx={x} cy={y} r={1.4} fill="currentColor" stroke="none" />;
  return (
    <g>
      {linkFrom !== undefined && cols.length > 0 &&
        line(linkFrom, h / 2, cols[cols.length - 1]!.x, h / 2, { strokeDasharray: '2 2', strokeWidth: 0.8, opacity: 0.7 })}
      {cols.map((c, i) => {
        const x = c.x;
        if (c.kind === 'CO') {
          return (
            <g key={i}>
              {line(x, 0, x, y1)}
              {line(x - 7, h, x - 7, y2)}
              {line(x + 7, h, x + 7, y2)}
              {dot(x, y1)}
              {line(x, y1, actuated ? x + 7 : x - 7, y2 - 1, { stroke: hot })}
              {text(x + 1, 13, c.marks.c ?? '', 6.5)}
              {text(x - 9, h - 8, c.marks.nc ?? '', 6.5)}
              {text(x + 9, h - 8, c.marks.no ?? '', 6.5)}
            </g>
          );
        }
        const closed = c.kind === 'NO' ? actuated : !actuated;
        return (
          <g key={i}>
            {line(x, 0, x, y1)}
            {line(x, h, x, y2)}
            {dot(x, y2)}
            {c.kind === 'NC' && line(x, y1, x + 5, y1)}
            {closed
              ? line(x, y2, c.kind === 'NC' ? x + 4 : x, y1 + (c.kind === 'NC' ? 1 : 0), { stroke: live ? 'var(--ok)' : 'currentColor' })
              : line(x, y2, c.kind === 'NC' ? x - 6 : x - 7, y1 + 2)}
            {text(x + 6, 12, c.marks.a ?? '', 6.5, { textAnchor: 'start' })}
            {text(x + 6, h - 6, c.marks.b ?? '', 6.5, { textAnchor: 'start' })}
          </g>
        );
      })}
    </g>
  );
}

/** Relay or contactor coil between A1 (top) and A2 (bottom). */
function coil(x: number, h: number, energised: boolean, live: boolean, label = ''): JSX.Element {
  return (
    <g>
      {line(x, 0, x, h / 2 - 9)}
      {line(x, h / 2 + 9, x, h)}
      {rect(x - 6, h / 2 - 9, 12, 18, { fill: live && energised ? 'var(--ok)' : 'none', fillOpacity: 0.35 })}
      {label ? text(x, h / 2 + 3, label, 7) : null}
      {text(x - 9, 11, 'A1', 6, { textAnchor: 'end' })}
      {text(x - 9, h - 5, 'A2', 6, { textAnchor: 'end' })}
    </g>
  );
}

/** Main power contacts of a contactor, NO unless listed in `ncFrom`. */
function mainContacts(xs: number[], h: number, closed: boolean, live: boolean, ncFrom = Infinity): JSX.Element {
  return (
    <g>
      {xs.map((x, i) => {
        const isNc = i >= ncFrom;
        const on = isNc ? !closed : closed;
        return (
          <g key={i}>
            {line(x, 0, x, h / 2 - 9)}
            {line(x, h, x, h / 2 + 9)}
            <circle cx={x} cy={h / 2 + 9} r={1.4} fill="currentColor" stroke="none" />
            {isNc && line(x, h / 2 - 9, x + 5, h / 2 - 9)}
            {on
              ? line(x, h / 2 + 9, isNc ? x + 4 : x, h / 2 - 8, { stroke: live ? 'var(--ok)' : 'currentColor', strokeWidth: 2 })
              : line(x, h / 2 + 9, x - 8, h / 2 - 7, { strokeWidth: 2 })}
            {/* arc-quenching semicircle on a power contact */}
            {!isNc && <path d={`M${x - 3} ${h / 2 - 9} a3 3 0 0 0 6 0`} fill="none" strokeWidth={0.9} />}
          </g>
        );
      })}
    </g>
  );
}

function pilotBody(w: number, h: number, extra: any = {}) {
  return rect(2, 4, w - 4, h - 8, { rx: 4, strokeDasharray: '3 2', strokeWidth: 0.8, ...extra });
}

/* ------------------------------------------------------------------ */

type SymbolFn = (c: SymbolCtx) => JSX.Element;

const SYMBOLS: Record<string, SymbolFn> = {
  supply: ({ w, h, props }) => (
    <g>
      {rect(2, 2, w - 4, h - 4, { rx: 3 })}
      {circle(24, h / 2 - 6, 11)}
      {line(16, h / 2 - 6, 32, h / 2 - 6)}
      <path d="M16 14 q4 -6 8 0 t8 0" fill="none" strokeWidth={S} transform={`translate(0 ${h / 2 - 20})`} />
      {text(w / 2 + 18, 22, String(props.system ?? 'TN-C-S'), 10)}
      {text(w / 2 + 18, 36, `${props.voltageLN ?? 230} V / ${props.phases === 1 ? '1' : '3'}~`, 9)}
      {text(w / 2 + 18, 50, `Ik ${Math.round((Number(props.ipk) || 0) / 100) / 10} kA`, 8)}
    </g>
  ),

  mcb: ({ w, h, props, state }) => {
    const n = poleCount(String(props.poles ?? '1P'));
    const cols = poleColumns(w, n);
    const closed = !!state?.closed && !state?.tripped;
    return (
      <g>
        {body(w, h)}
        {cols.map((x, i) => (
          <g key={i}>
            {contact(x, 6, h - 6, closed)}
            {/* thermal + magnetic release markers */}
            <path d={`M${x + 3} ${h / 2 + 3} h6`} strokeWidth={S} />
            <path d={`M${x + 3} ${h / 2 + 7} q3 -4 6 0`} fill="none" strokeWidth={S} />
          </g>
        ))}
        {text(w / 2, h - 14, `${props.curve ?? 'B'}${props.inA ?? 16}`, 10)}
      </g>
    );
  },

  rcd: ({ w, h, props, state }) => {
    const n = poleCount(String(props.poles ?? '2P'));
    const cols = poleColumns(w, n);
    const closed = !!state?.closed && !state?.tripped;
    return (
      <g>
        {body(w, h)}
        {cols.map((x, i) => (
          <g key={i}>{contact(x, 6, h - 6, closed)}</g>
        ))}
        {rect(6, h / 2 - 7, w - 12, 14, { rx: 7, strokeDasharray: '3 2' })}
        {text(w / 2, h - 13, `${props.idn ?? 30} mA ${props.rcdType ?? 'A'}`, 9)}
      </g>
    );
  },

  rcbo: ({ w, h, props, state }) => {
    const n = poleCount(String(props.poles ?? '1P+N'));
    const cols = poleColumns(w, n);
    const closed = !!state?.closed && !state?.tripped;
    return (
      <g>
        {body(w, h)}
        {cols.map((x, i) => (
          <g key={i}>{contact(x, 6, h - 6, closed)}</g>
        ))}
        {rect(5, h / 2 - 6, w - 10, 12, { rx: 6, strokeDasharray: '3 2' })}
        {text(w / 2, 20, `${props.curve ?? 'B'}${props.inA ?? 16}`, 9)}
        {text(w / 2, h - 12, `${props.idn ?? 30} mA ${props.rcdType ?? 'A'}`, 8)}
      </g>
    );
  },

  afdd: ({ w, h, props, state }) => (
    <g>
      {body(w, h)}
      {contact(w / 2, 6, h - 6, !!state?.closed && !state?.tripped)}
      <path d={`M${w / 2 - 8} ${h / 2 + 8} l5 -6 l-2 6 l5 -6`} fill="none" strokeWidth={S} />
      {text(w / 2, h - 12, 'AFDD', 8)}
      {props.withMcb ? text(w / 2, 20, `${props.curve ?? 'B'}${props.inA ?? 16}`, 8) : null}
    </g>
  ),

  spd: ({ w, h, props, state }) => (
    <g>
      {body(w, h)}
      {rect(w / 2 - 9, h / 2 - 10, 18, 20)}
      <path d={`M${w / 2 - 9} ${h / 2 + 10} l18 -20`} strokeWidth={S} />
      {line(w / 2, 6, w / 2, h / 2 - 10)}
      {line(w / 2, h / 2 + 10, w / 2, h - 6)}
      {text(w / 2, h - 12, String(props.spdType ?? 'T1+T2'), 8)}
      {state?.degraded ? text(w / 2, 18, '✕', 12, { fill: 'var(--fail)' }) : null}
    </g>
  ),

  fuse: ({ w, h, props, state }) => (
    <g>
      {body(w, h)}
      {rect(w / 2 - 7, h / 2 - 12, 14, 24)}
      {line(w / 2, 6, w / 2, h / 2 - 12)}
      {line(w / 2, h / 2 + 12, w / 2, h - 6)}
      {state?.blown ? (
        <path d={`M${w / 2 - 5} ${h / 2 + 3} l10 -6`} strokeWidth={S} stroke="var(--fail)" />
      ) : (
        line(w / 2, h / 2 - 12, w / 2, h / 2 + 12)
      )}
      {text(w / 2, h - 12, `${props.inA ?? 16} A`, 8)}
    </g>
  ),

  motorStarter: ({ w, h, props, state, live }) => {
    const on = !!state?.closed && !state?.tripped;
    return (
      <g>
        {body(80, h)}
        {poleColumns(80, 3).map((x, i) => (
          <g key={i}>{contact(x, 6, h - 6, on)}</g>
        ))}
        {text(40, h - 12, `${props.setA ?? 6} A`, 8)}
        {contactRow(contactColumns(parseContacts(props.aux), 80), h, on, live, 66)}
        {state?.tripped ? text(70, 18, '!', 12, { fill: 'var(--fail)' }) : null}
      </g>
    );
  },

  overloadRelay: ({ w, h, props, state, live }) => (
    <g>
      {body(w, h)}
      {poleColumns(w, 3).map((x, i) => (
        <g key={i}>
          {line(x, 6, x, h - 6)}
          <path d={`M${x} ${h / 2 - 8} h-4 v8 h4`} fill="none" strokeWidth={S} />
        </g>
      ))}
      {text(8, 18, '95', 6)}
      {text(8, 46, '96', 6)}
      {text(w - 8, 18, '97', 6)}
      {text(w - 8, 46, '98', 6)}
      {text(w / 2, h - 10, `${props.setA ?? 6} A`, 8)}
      {state?.tripped ? text(w / 2, 16, live ? 'RESET' : '!', live ? 7 : 12, { fill: 'var(--fail)' }) : null}
    </g>
  ),

  meter: ({ w, h, props }) => (
    <g>
      {rect(2, 2, w - 4, h - 4, { rx: 3 })}
      {circle(w / 2, h / 2, 13)}
      {text(w / 2, h / 2 + 4, 'kWh', 9)}
      {text(w / 2, h - 8, props.phases === 3 ? '3~' : '1~', 8)}
    </g>
  ),

  hdo: ({ w, h, state }) => (
    <g>
      {rect(2, 2, w - 4, h - 4, { rx: 3 })}
      {text(w / 2, h / 2, 'HDO', 10)}
      {circle(w - 14, 14, 4, { fill: state?.closed ? 'var(--ok)' : 'none' })}
    </g>
  ),

  earthBar: ({ w, h }) => (
    <g>
      {rect(0, 6, w, h - 12, { rx: 2 })}
      {line(6, h / 2, w - 6, h / 2)}
      {text(16, h / 2 - 4, 'HOP', 8)}
    </g>
  ),

  earthElectrode: ({ w, h }) => (
    <g>
      {line(w / 2, 0, w / 2, h - 18)}
      {line(w / 2 - 14, h - 18, w / 2 + 14, h - 18)}
      {line(w / 2 - 9, h - 12, w / 2 + 9, h - 12)}
      {line(w / 2 - 4, h - 6, w / 2 + 4, h - 6)}
    </g>
  ),

  isolator: ({ w, h, props, state }) => (
    <g>
      {body(w, h)}
      {poleColumns(w, poleCount(String(props.poles ?? '4P'))).map((x, i) => (
        <g key={i}>{contact(x, 6, h - 6, !!state?.closed)}</g>
      ))}
    </g>
  ),

  contactor: ({ w, h, props, state, live }) => {
    const n = poleCount(String(props.poles ?? '4P'));
    const mw = n * 20 + 20;
    const xs = poleColumns(mw, n);
    const manual = props.manual === 'on' ? true : props.manual === 'off' ? false : !!state?.closed;
    const nNc = props.nc ? n : Math.max(0, Math.min(n, Number(props.ncCount) || 0));
    return (
      <g>
        {body(w, h, { strokeWidth: 0.8 })}
        {mainContacts(xs, h, manual, live, n - nNc)}
        {line(xs[0]!, h / 2, mw + 4, h / 2, { strokeDasharray: '2 2', strokeWidth: 0.8, opacity: 0.7 })}
        {coil(mw + 10, h, !!state?.closed, live)}
        {contactRow(contactColumns(parseContacts(props.aux), mw + 20), h, manual, live, mw + 16)}
        {props.manual && props.manual !== 'auto' ? text(mw + 10, h - 14, props.manual === 'on' ? 'I' : '0', 8, { fill: 'var(--warn)' }) : null}
      </g>
    );
  },

  impulseRelay: ({ w, h, state }) => (
    <g>
      {body(w, h)}
      {rect(8, h / 2 - 9, 14, 18)}
      {contact(w - 15, 6, h - 6, !!state?.closed)}
      {text(15, h / 2 + 4, 'RI', 8)}
    </g>
  ),

  stairTimer: ({ w, h, state }) => (
    <g>
      {body(w, h)}
      {rect(8, h / 2 - 9, 14, 18)}
      {contact(w - 15, 6, h - 6, !!state?.closed)}
      {circle(15, h / 2, 5)}
      {line(15, h / 2, 15, h / 2 - 3)}
      {line(15, h / 2, 18, h / 2)}
    </g>
  ),

  timeRelay: ({ w, h, props, state, live, meas }) => (
    <g>
      {body(w, h, { strokeWidth: 0.8 })}
      {coil(15, h, (meas?.timer ?? 0) > 0 || !!state?.closed, live)}
      {rect(9, h / 2 - 9, 12, 18, { fill: 'none' })}
      {line(9, h / 2 - 9, 21, h / 2 + 9, { strokeWidth: 0.8 })}
      {contactRow(contactColumns(['CO'], 35), h, !!state?.closed, live, 21)}
      {text(w / 2, h - 2, String(props.mode ?? 'onDelay') === 'flasher' ? '⟲' : `${props.delay ?? ''}s`, 7)}
      {live && (meas?.timer ?? 0) > 0 ? text(w / 2, 6, `${(meas.timer ?? 0).toFixed(1)}`, 6.5, { fill: 'var(--warn)' }) : null}
    </g>
  ),

  twilight: ({ w, h, state }) => (
    <g>
      {body(w, h)}
      {circle(16, h / 2, 7)}
      <path d={`M20 ${h / 2 - 4} a6 6 0 1 0 0 8`} fill="none" strokeWidth={S} />
      {contact(w - 15, 6, h - 6, !!state?.closed)}
    </g>
  ),

  thermostat: ({ w, h, props, state }) => (
    <g>
      {body(w, h)}
      {text(16, h / 2 + 4, '°C', 9)}
      {contact(w - 15, 6, h - 6, !!state?.closed)}
      {text(w / 2, h - 12, `${props.setpoint ?? 21}`, 8)}
    </g>
  ),

  phaseMonitor: ({ w, h, state }) => (
    <g>
      {body(w, h)}
      {text(w / 2, h / 2 - 2, 'L1 L2 L3', 8)}
      {circle(w / 2, h / 2 + 12, 4, { fill: state?.ok ? 'var(--ok)' : 'var(--fail)' })}
    </g>
  ),

  priorityRelay: ({ w, h, state }) => (
    <g>
      {body(w, h)}
      {text(w / 2, h / 2 + 4, 'PRIO', 9)}
      {circle(w - 14, 14, 4, { fill: state?.closed ? 'var(--ok)' : 'var(--warn)' })}
    </g>
  ),

  signalLamp: ({ w, h, props, meas }) => {
    const on = (meas?.brightness ?? 0) > 0.1;
    const col = String(props.color ?? 'red');
    const map: Record<string, string> = { red: '#e04b3a', green: '#39b869', yellow: '#e8c33a', blue: '#4a8ee8', white: '#e8e8e8' };
    return (
      <g>
        {body(w, h)}
        {circle(w / 2, h / 2, 9, { fill: on ? map[col] ?? '#e04b3a' : 'none' })}
        {line(w / 2 - 6, h / 2 - 6, w / 2 + 6, h / 2 + 6)}
        {line(w / 2 + 6, h / 2 - 6, w / 2 - 6, h / 2 + 6)}
      </g>
    );
  },

  buzzer: ({ w, h, meas }) => (
    <g>
      {body(w, h)}
      <path d={`M${w / 2 - 8} ${h / 2 + 6} v-8 a8 8 0 0 1 16 0 v8 z`} fill="none" strokeWidth={S} />
      {(meas?.sounding ?? 0) > 0 ? text(w / 2, h - 12, '♪', 10) : null}
    </g>
  ),

  transformer: ({ w, h }) => (
    <g>
      {body(w, h)}
      {circle(w / 2 - 7, h / 2, 10)}
      {circle(w / 2 + 7, h / 2, 10)}
    </g>
  ),

  psu: ({ w, h, props }) => (
    <g>
      {body(w, h)}
      {text(w / 2, h / 2 - 2, '~ →', 11)}
      {text(w / 2, h / 2 + 12, `${props.outV ?? 24} V`, 9)}
    </g>
  ),

  panelSocket: ({ w, h }) => (
    <g>
      {body(w, h)}
      {circle(w / 2, h / 2, 11)}
      <circle cx={w / 2 - 4} cy={h / 2} r={1.8} fill="currentColor" stroke="none" />
      <circle cx={w / 2 + 4} cy={h / 2} r={1.8} fill="currentColor" stroke="none" />
    </g>
  ),

  energyMonitor: ({ w, h }) => (
    <g>
      {body(w, h)}
      {rect(10, h / 2 - 9, w - 20, 18, { rx: 2 })}
      {text(w / 2, h / 2 + 4, 'kWh', 9)}
    </g>
  ),

  peBar: ({ w, h }) => (
    <g>
      {rect(0, 0, w, h, { rx: 2, fill: 'var(--live-pe)', fillOpacity: 0.14 })}
      {line(4, h / 2, w - 4, h / 2, { stroke: 'var(--live-pe)', strokeWidth: 2.5 })}
      {text(12, h / 2 - 3, 'PE', 8, { fill: 'var(--live-pe)' })}
    </g>
  ),

  nBar: ({ w, h }) => (
    <g>
      {rect(0, 0, w, h, { rx: 2, fill: 'var(--live-n)', fillOpacity: 0.14 })}
      {line(4, h / 2, w - 4, h / 2, { stroke: 'var(--live-n)', strokeWidth: 2.5 })}
      {text(10, h / 2 - 3, 'N', 8, { fill: 'var(--live-n)' })}
    </g>
  ),

  wago: ({ w, h }) => (
    <g>
      {rect(0, 0, w, h, { rx: 3 })}
      {line(4, h / 2, w - 4, h / 2)}
    </g>
  ),

  junctionBox: ({ w, h }) => (
    <g>
      {rect(1, 1, w - 2, h - 2, { rx: 4, strokeDasharray: '4 3' })}
    </g>
  ),

  dinRail: ({ w, h }) => (
    <g>
      {rect(0, 2, w, h - 4, { fill: 'var(--bg-sunken)' })}
      {line(0, h / 2, w, h / 2, { strokeDasharray: '2 4' })}
    </g>
  ),

  gland: ({ w, h }) => (
    <g>
      {rect(4, 6, w - 8, h - 12, { rx: 2 })}
      {line(0, h / 2, w, h / 2)}
    </g>
  ),

  comb: ({ w, h, props }) => (
    <g>
      {rect(0, 2, w, h - 8, { rx: 2, fill: 'currentColor', fillOpacity: 0.1 })}
      {Array.from({ length: Math.floor(w / 20) }, (_, i) => (
        <g key={i}>{line(i * 20 + 10, h - 8, i * 20 + 10, h - 2)}</g>
      ))}
      {text(20, h - 10, String(props.kind ?? '1P'), 8)}
    </g>
  ),

  switch1: ({ w, h, state }) => (
    <g>
      {line(10, h, 10, h - 12)}
      {state?.closed ? line(10, h - 12, 25, 12) : line(10, h - 12, 22, h - 26)}
      {line(25, 12, 25, 0)}
      <circle cx={10} cy={h - 12} r={2} fill="currentColor" stroke="none" />
      <circle cx={25} cy={12} r={2} fill="currentColor" stroke="none" />
    </g>
  ),

  switch5: ({ w, h, state }) => (
    <g>
      {line(30, h, 30, h - 12)}
      {line(30, h - 12, state?.a ? 15 : 22, state?.a ? 12 : h - 24)}
      {line(30, h - 12, state?.b ? 45 : 40, state?.b ? 12 : h - 24)}
      {line(15, 12, 15, 0)}
      {line(45, 12, 45, 0)}
    </g>
  ),

  switch6: ({ w, h, state }) => {
    const pos = Number(state?.pos ?? 1);
    return (
      <g>
        {line(30, h, 30, h - 12)}
        {line(30, h - 12, pos === 1 ? 15 : 45, 12)}
        {line(15, 12, 15, 0)}
        {line(45, 12, 45, 0)}
        <circle cx={30} cy={h - 12} r={2} fill="currentColor" stroke="none" />
      </g>
    );
  },

  switch66: ({ w, h, state }) => {
    const a = Number(state?.posA ?? 1);
    const b = Number(state?.posB ?? 1);
    return (
      <g>
        {line(25, h, 25, h - 12)}
        {line(25, h - 12, a === 1 ? 15 : 35, 12)}
        {line(65, h, 65, h - 12)}
        {line(65, h - 12, b === 1 ? 55 : 75, 12)}
        {[15, 35, 55, 75].map((x) => line(x, 12, x, 0))}
      </g>
    );
  },

  switch7: ({ w, h, state }) => {
    const x = !!state?.crossed;
    return (
      <g>
        {line(20, h, 20, h - 12)}
        {line(50, h, 50, h - 12)}
        {line(20, 12, 20, 0)}
        {line(50, 12, 50, 0)}
        {x ? (
          <>
            {line(20, h - 12, 50, 12)}
            {line(50, h - 12, 20, 12)}
          </>
        ) : (
          <>
            {line(20, h - 12, 20, 12)}
            {line(50, h - 12, 50, 12)}
          </>
        )}
      </g>
    );
  },

  button: ({ w, h, state }) => (
    <g>
      {line(10, h, 10, h - 12)}
      {line(25, 12, 25, 0)}
      {state?.pressed ? line(10, h - 12, 25, 12) : line(10, h - 14, 25, h - 20)}
      {line(17, h - 22, 17, h - 30)}
      {line(12, h - 30, 22, h - 30)}
    </g>
  ),

  dimmer: ({ w, h, props }) => (
    <g>
      {rect(4, 8, w - 8, h - 16, { rx: 3 })}
      <path d={`M10 ${h - 14} L${w - 10} 14`} strokeWidth={S} />
      {text(w / 2, h - 20, `${props.level ?? 100}%`, 9)}
    </g>
  ),

  motion: ({ w, h, state }) => (
    <g>
      {rect(4, 8, w - 8, h - 16, { rx: 3 })}
      <path d={`M${w / 2 - 10} ${h / 2 + 6} a10 10 0 0 1 20 0`} fill="none" strokeWidth={S} />
      <path d={`M${w / 2 - 5} ${h / 2 + 6} a5 5 0 0 1 10 0`} fill="none" strokeWidth={S} />
      {state?.closed ? circle(w - 12, 14, 3, { fill: 'var(--ok)' }) : null}
    </g>
  ),

  smartRelay: ({ w, h, state }) => (
    <g>
      {rect(4, 6, w - 8, h - 12, { rx: 3 })}
      {text(w / 2, h / 2 + 4, 'REL', 9)}
      {state?.closed ? circle(w - 12, 12, 3, { fill: 'var(--ok)' }) : null}
    </g>
  ),

  socket: ({ w, h, props, state }) => (
    <g>
      <path d={`M${w / 2 - 14} ${h - 14} a14 14 0 0 1 28 0 z`} fill="none" strokeWidth={S} />
      {line(w / 2 - 14, h - 14, w / 2 + 14, h - 14)}
      <circle cx={w / 2 - 6} cy={h - 22} r={2} fill="currentColor" stroke="none" />
      <circle cx={w / 2 + 6} cy={h - 22} r={2} fill="currentColor" stroke="none" />
      {line(w / 2, h - 14, w / 2, h - 10)}
      {Number(props.outlets) === 2 ? text(w - 8, 14, '2×', 9) : null}
      {state?.plugged ? rect(w / 2 - 7, h - 34, 14, 8, { rx: 1, fill: 'currentColor', fillOpacity: 0.3 }) : null}
    </g>
  ),

  socketUsb: ({ w, h }) => (
    <g>
      <path d={`M${w / 2 - 14} ${h - 14} a14 14 0 0 1 28 0 z`} fill="none" strokeWidth={S} />
      {line(w / 2 - 14, h - 14, w / 2 + 14, h - 14)}
      {text(w / 2, h - 30, 'USB', 8)}
    </g>
  ),

  socketCee: ({ w, h, props }) => (
    <g>
      {circle(w / 2, h / 2, 16)}
      {[0, 72, 144, 216, 288].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={w / 2 + Math.cos(r) * 8}
            cy={h / 2 + Math.sin(r) * 8}
            r={2.2}
            fill="currentColor"
            stroke="none"
          />
        );
      })}
      {text(w / 2, h - 2, `${props.inA ?? 16} A`, 8)}
    </g>
  ),

  connectionBox: ({ w, h }) => (
    <g>
      {rect(4, 6, w - 8, h - 12, { rx: 2 })}
      {line(4, h / 2, w - 4, h / 2)}
    </g>
  ),

  lamp: ({ w, h, meas }) => {
    const b = meas?.brightness ?? 0;
    return (
      <g>
        {circle(w / 2, h / 2, 13, { fill: b > 0.02 ? '#f5c542' : 'none', fillOpacity: 0.15 + b * 0.85 })}
        {line(w / 2 - 9, h / 2 - 9, w / 2 + 9, h / 2 + 9)}
        {line(w / 2 + 9, h / 2 - 9, w / 2 - 9, h / 2 + 9)}
      </g>
    );
  },

  ledPanel: ({ w, h, meas }) => {
    const b = meas?.brightness ?? 0;
    return (
      <g>
        {rect(6, 12, w - 12, h - 24, { rx: 2, fill: '#f5e6a3', fillOpacity: b * 0.9 })}
        {line(12, h / 2, w - 12, h / 2)}
        {text(w / 2, h - 4, 'LED', 8)}
      </g>
    );
  },

  ledStrip: ({ w, h, meas }) => {
    const b = meas?.brightness ?? 0;
    return (
      <g>
        {rect(4, h / 2 - 5, w - 8, 10, { rx: 5, fill: '#f5e6a3', fillOpacity: b * 0.9 })}
        {Array.from({ length: 6 }, (_, i) => <g key={i}>{circle(12 + i * ((w - 24) / 5), h / 2, 2)}</g>)}
      </g>
    );
  },

  fluorescent: ({ w, h, meas }) => {
    const b = meas?.brightness ?? 0;
    return (
      <g>
        {rect(6, h / 2 - 7, w - 12, 14, { rx: 7, fill: '#dff0f5', fillOpacity: b * 0.9 })}
        {line(2, h / 2, 6, h / 2)}
        {line(w - 6, h / 2, w - 2, h / 2)}
      </g>
    );
  },

  boiler: ({ w, h }) => (
    <g>
      {rect(10, 10, w - 20, h - 18, { rx: 8 })}
      <path d={`M${w / 2 - 6} ${h - 16} q6 -8 0 -14 q-6 -6 0 -12`} fill="none" strokeWidth={S} />
    </g>
  ),

  cooker: ({ w, h }) => (
    <g>
      {rect(6, 10, w - 12, h - 20, { rx: 3 })}
      {[0, 1].map((r) =>
        [0, 1].map((c) => <g key={`${r}${c}`}>{circle(w / 3 + c * (w / 3), h / 3 + r * (h / 4), 7)}</g>),
      )}
    </g>
  ),

  oven: ({ w, h }) => (
    <g>
      {rect(6, 8, w - 12, h - 16, { rx: 3 })}
      {line(6, 20, w - 6, 20)}
      {rect(12, 26, w - 24, h - 38, { rx: 2 })}
    </g>
  ),

  washer: ({ w, h }) => (
    <g>
      {rect(6, 8, w - 12, h - 16, { rx: 3 })}
      {circle(w / 2, h / 2 + 4, 12)}
      {circle(w / 2, h / 2 + 4, 6)}
    </g>
  ),

  dishwasher: ({ w, h }) => (
    <g>
      {rect(6, 8, w - 12, h - 16, { rx: 3 })}
      {line(10, h / 2, w - 10, h / 2)}
      {line(10, h / 2 + 10, w - 10, h / 2 + 10)}
    </g>
  ),

  floorHeating: ({ w, h }) => (
    <g>
      {rect(4, 10, w - 8, h - 20, { rx: 2 })}
      <path
        d={`M10 ${h / 2 + 6} q8 -14 16 0 t16 0 t16 0`}
        fill="none"
        strokeWidth={S}
      />
    </g>
  ),

  airCon: ({ w, h }) => (
    <g>
      {rect(6, 12, w - 12, h - 26, { rx: 4 })}
      {line(12, h - 18, w - 12, h - 18)}
      <path d={`M${w / 2 - 10} ${h - 10} q10 8 20 0`} fill="none" strokeWidth={S} />
    </g>
  ),

  heatPump: ({ w, h }) => (
    <g>
      {rect(6, 10, w - 12, h - 20, { rx: 3 })}
      {circle(w / 2, h / 2, 12)}
      {[0, 120, 240].map((a) => {
        const r = (a * Math.PI) / 180;
        return <g key={a}>{line(w / 2, h / 2, w / 2 + Math.cos(r) * 12, h / 2 + Math.sin(r) * 12)}</g>;
      })}
    </g>
  ),

  motor: ({ w, h, meas, live }) => {
    const rot = Number(meas?.rotation ?? 0);
    const running = live && (meas?.I_L1 ?? 0) > 0.2;
    return (
      <g>
        {circle(w / 2, h / 2, 17, { fill: running ? 'var(--ok)' : 'none', fillOpacity: 0.12 })}
        {text(w / 2, h / 2 + 5, 'M', 14)}
        {text(w / 2, h / 2 + 15, '3~', 8)}
        {running && rot !== 0 ? (
          <g>
            <path
              d={rot > 0 ? `M${w / 2 - 12} ${h / 2 - 16} a20 20 0 0 1 24 0` : `M${w / 2 + 12} ${h / 2 - 16} a20 20 0 0 0 -24 0`}
              fill="none"
              stroke="var(--ok)"
              strokeWidth={1.6}
                          />
            {text(w / 2 + 26, h / 2 - 12, rot > 0 ? '↻' : '↺', 11, { fill: 'var(--ok)' })}
          </g>
        ) : null}
        {running && rot === 0 ? text(w / 2, h - 2, '~ hum', 7, { fill: 'var(--warn)' }) : null}
      </g>
    );
  },

  machine: ({ w, h }) => (
    <g>
      {rect(6, 10, w - 12, h - 20, { rx: 2 })}
      {circle(w / 2, h / 2, 9)}
      {line(w / 2, h / 2 - 14, w / 2, h / 2 - 9)}
    </g>
  ),

  genericLoad: ({ w, h }) => (
    <g>
      {rect(8, 12, w - 16, h - 24, { rx: 2 })}
      {line(8, 12, w - 8, h - 12)}
    </g>
  ),

  evse: ({ w, h, props }) => (
    <g>
      {rect(8, 8, w - 16, h - 16, { rx: 4 })}
      <path d={`M${w / 2 - 3} ${h / 2 - 10} l-6 12 h8 l-4 10 l10 -14 h-8 z`} fill="currentColor" stroke="none" />
      {text(w / 2, h - 4, `${props.powerKw ?? 11} kW`, 8)}
    </g>
  ),

  multimeter: ({ w, h, props, meas }) => (
    <g>
      {rect(2, 2, w - 4, h - 14, { rx: 5 })}
      {rect(8, 10, w - 16, 18, { rx: 2, fill: 'var(--bg-sunken)' })}
      {text(w / 2, 24, formatReading(meas?.reading, String(props.mode ?? 'V')), 11)}
      {circle(w / 2, h - 28, 9)}
      {text(w / 2, h - 25, String(props.mode ?? 'V'), 9)}
    </g>
  ),

  clampMeter: ({ w, h, meas }) => (
    <g>
      <path d={`M${w / 2} 6 a14 14 0 1 1 -0.1 0`} fill="none" strokeWidth={2} />
      {rect(8, h - 44, w - 16, 22, { rx: 3, fill: 'var(--bg-sunken)' })}
      {text(w / 2, h - 29, meas?.reading !== undefined ? `${meas.reading.toFixed(2)} A` : '— A', 10)}
    </g>
  ),

  insulationTester: ({ w, h }) => (
    <g>
      {rect(2, 2, w - 4, h - 14, { rx: 5 })}
      {rect(8, 10, w - 16, 20, { rx: 2, fill: 'var(--bg-sunken)' })}
      {text(w / 2, 24, 'MΩ', 11)}
    </g>
  ),

  loopTester: ({ w, h }) => (
    <g>
      {rect(2, 2, w - 4, h - 14, { rx: 5 })}
      {rect(8, 10, w - 16, 20, { rx: 2, fill: 'var(--bg-sunken)' })}
      {text(w / 2, 24, 'Zs', 11)}
    </g>
  ),

  rcdTester: ({ w, h }) => (
    <g>
      {rect(2, 2, w - 4, h - 14, { rx: 5 })}
      {rect(8, 10, w - 16, 20, { rx: 2, fill: 'var(--bg-sunken)' })}
      {text(w / 2, 24, 'IΔn', 11)}
    </g>
  ),

  phaseTester: ({ w, h }) => (
    <g>
      {rect(2, 2, w - 4, h - 12, { rx: 5 })}
      {circle(w / 2, h / 2 - 4, 12)}
      <path d={`M${w / 2 - 5} ${h / 2 - 9} l10 5 l-10 5 z`} fill="currentColor" stroke="none" />
    </g>
  ),

  socketTester: ({ w, h }) => (
    <g>
      {rect(6, 2, w - 12, h - 14, { rx: 4 })}
      {[0, 1, 2].map((i) => <g key={i}>{circle(16 + i * 14, 18, 4)}</g>)}
    </g>
  ),

  motorContactor: ({ w, h, props, state, live }) => (
    <g>
      {body(w, h, { strokeWidth: 0.8 })}
      {mainContacts(poleColumns(80, 3), h, !!state?.closed, live)}
      {line(20, h / 2, 84, h / 2, { strokeDasharray: '2 2', strokeWidth: 0.8, opacity: 0.7 })}
      {coil(90, h, !!state?.closed, live)}
      {contactRow(contactColumns(parseContacts(props.aux), 100), h, !!state?.closed, live, 96)}
      {text(40, h - 2, `${props.inA ?? 9} A AC-3`, 6.5)}
    </g>
  ),

  controlRelay: ({ w, h, props, state, live }) => (
    <g>
      {body(w, h, { strokeWidth: 0.8 })}
      {coil(15, h, !!state?.closed, live)}
      {contactRow(contactColumns(parseContacts(props.contacts), 30), h, !!state?.closed, live, 21)}
      {circle(w - 7, 10, 2.2, { fill: live && state?.closed ? 'var(--warn)' : 'none', strokeWidth: 0.8 })}
    </g>
  ),

  pushButton: ({ w, h, props, state, live }) => {
    const cols = contactColumns(parseContacts(props.contacts), PILOT_X0);
    const pressed = !!state?.pressed;
    const color = BUTTON_COLORS[String(props.color ?? 'green')] ?? '#2e9e4f';
    const xEnd = cols.length ? cols[cols.length - 1]!.x : w / 2;
    return (
      <g>
        {pilotBody(w, h)}
        {contactRow(cols, h, pressed, live)}
        {/* push actuator: E-] */}
        <g transform={`translate(${pressed ? 3 : 0} 0)`}>
          <path d={`M12 ${h / 2 - 6} h-3 v12 h3`} fill="none" strokeWidth={S} />
          {rect(3, h / 2 - 5, 5, 10, { fill: color, stroke: 'none', rx: 1.5 })}
        </g>
        {line(12, h / 2, xEnd - 4, h / 2, { strokeDasharray: '2 2', strokeWidth: 0.8, opacity: 0.7 })}
      </g>
    );
  },

  selectorSwitch: ({ w, h, props, state, live }) => {
    const three = props.positions === '1-0-2';
    const cols = contactColumns(three ? ['NO', 'NO'] : parseContacts(props.contacts), PILOT_X0);
    const pos = Number(state?.pos3) || 0;
    return (
      <g>
        {pilotBody(w, h)}
        {three ? (
          <g>
            {contactRow([cols[0]!], h, pos === 1, live, 13)}
            {contactRow([cols[1]!], h, pos === 2, live)}
          </g>
        ) : (
          contactRow(cols, h, pos !== 0, live, 13)
        )}
        {/* rotary actuator with the position shown */}
        {circle(9, h / 2, 6)}
        {text(9, h / 2 + 3, three ? (pos === 1 ? '1' : pos === 2 ? '2' : '0') : pos ? 'I' : '0', 8, { fill: live ? 'var(--accent)' : 'currentColor' })}
      </g>
    );
  },

  emergencyStop: ({ w, h, props, state, live }) => {
    const latched = !!state?.latched;
    return (
      <g>
        {pilotBody(w, h, { stroke: '#c0322b' })}
        {contactRow(contactColumns(parseContacts(props.contacts), PILOT_X0), h, latched, live, 13)}
        <path d={`M4 ${h / 2 - 8} a8 8 0 0 1 0 16 z`} fill="#c0322b" stroke="none" transform={`translate(${latched ? 3 : 0} 0)`} />
        {rect(11, h / 2 - 2, 4, 4, { fill: '#e0a33a', stroke: 'none' })}
        {latched && live ? text(w / 2, 4, 'STOP', 7, { fill: 'var(--fail)' }) : null}
      </g>
    );
  },

  limitSwitch: ({ w, h, props, state, live }) => {
    const on = !!state?.actuated;
    return (
      <g>
        {pilotBody(w, h)}
        {contactRow(contactColumns(parseContacts(props.contacts), PILOT_X0), h, on, live, 13)}
        {/* roller lever */}
        {line(8, h / 2 + (on ? 0 : 6), 15, h / 2)}
        {circle(6, h / 2 + (on ? 0 : 7), 3)}
      </g>
    );
  },
};

function formatReading(v: number | undefined, mode: string): string {
  if (v === undefined) return '—';
  if (mode === 'A') return `${v.toFixed(3)} A`;
  if (mode === 'R') return `${v.toFixed(1)} Ω`;
  return `${v.toFixed(1)} V`;
}

/** Fallback for any component without a drawn symbol. */
function genericSymbol({ w, h }: SymbolCtx): JSX.Element {
  return (
    <g>
      {rect(4, 6, w - 8, h - 12, { rx: 3 })}
      {line(10, h / 2, w - 10, h / 2, { strokeDasharray: '3 3' })}
    </g>
  );
}

export function renderSymbol(name: string, ctx: SymbolCtx): JSX.Element {
  const fn = SYMBOLS[name];
  return fn ? fn(ctx) : genericSymbol(ctx);
}

export function hasSymbol(name: string): boolean {
  return name in SYMBOLS;
}
