import type { ComponentInstance, ProjectSettings } from '../schema.js';
import type { Network, Solution, Cx } from '../physics/network.js';

export type Category =
  | 'supply'
  | 'protection'
  | 'switching'
  | 'relays'
  | 'control'
  | 'terminals'
  | 'wiring'
  | 'loads'
  | 'instruments';

export type TerminalRole = 'L' | 'N' | 'PE' | 'any' | 'ctrl' | 'elv' | 'earth';

export interface TerminalDef {
  id: string;
  /** Printed marking on the device, e.g. "1", "2", "N", "L1". */
  mark?: string;
  role: TerminalRole;
  /** Position relative to the component origin, in schematic pixels. */
  x: number;
  y: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Terminal is inside the panel and normally fed by a comb busbar. */
  comb?: boolean;
}

export type PropType = 'number' | 'select' | 'text' | 'bool';

export interface PropOption {
  value: string | number | boolean;
  /** Optional explicit i18n key; otherwise the raw value is shown. */
  i18n?: string;
}

export interface PropSpec {
  key: string;
  type: PropType;
  /** i18n key, defaults to `prop.<key>`. */
  i18n?: string;
  options?: PropOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Hide the property unless this predicate passes. */
  when?: (props: any) => boolean;
  /** Shown in a compact secondary group in the inspector. */
  advanced?: boolean;
}

/** Anything the simulator wants to remember about one component between ticks. */
export interface DeviceState {
  [k: string]: any;
  /** Branch ids created during the last stamp, keyed by tag. */
  br?: Record<string, number>;
}

export type FaultKind =
  | 'shortLN'
  | 'shortLPE'
  | 'shortLL'
  | 'earthFault'
  | 'touch'
  | 'insulation'
  | 'lossPE'
  | 'lossPhase'
  | 'surge'
  | 'cableDamage'
  | 'arc'
  | 'dcResidual';

export interface ActiveFault {
  id: string;
  kind: FaultKind;
  /** Component the fault is applied to. */
  target: string;
  /** Terminal within the target, where meaningful. */
  terminal?: string;
  /** Second terminal for L-L / L-N faults. */
  terminal2?: string;
  /** Fault resistance in ohms (earth fault, insulation, touch). */
  resistance?: number;
  /** Body resistance for a touch fault. */
  bodyResistance?: number;
  /** Standing condition resistance to earth (shoes, floor). */
  standingResistance?: number;
  /** Surge peak voltage. */
  surgeV?: number;
  /** Arc current for an arc fault. */
  arcCurrent?: number;
  /** DC residual injected, in amperes. */
  dcResidual?: number;
  /** Wire id for cable damage. */
  wire?: string;
  enabled: boolean;
  /** Simulation time at which the fault was armed. */
  since?: number;
}

export interface SimEnv {
  /** Simulation time in seconds. */
  t: number;
  /** Time step of the current tick in seconds. */
  dt: number;
  settings: ProjectSettings;
  faults: ActiveFault[];
  /** Resolved node key of the installation main earth terminal, if any. */
  mainEarthNode?: number;
  /** The instruments solve an isolated installation; sources are then inactive. */
  deEnergized?: boolean;
  /**
   * Measure as the electrician does, with the manually operated switching
   * devices closed: a loop impedance is not taken through an open light switch.
   */
  closeSwitches?: boolean;
}

export type LogLevel = 'info' | 'warn' | 'danger' | 'trip';

export interface SimEvent {
  t: number;
  /** i18n key of the message. */
  key: string;
  /** Interpolation values for the message. */
  vars?: Record<string, string | number>;
  level: LogLevel;
  /** Component the event refers to. */
  comp?: string;
  /** Standard reference, e.g. "ČSN 33 2000-4-41 ed. 3, 411.3.3". */
  ref?: string;
  /** Reference is a plain-language restatement pending verification of the clause. */
  refToVerify?: boolean;
}

export interface StampCtx {
  net: Network;
  comp: ComponentInstance;
  props: any;
  state: DeviceState;
  env: SimEnv;
  /** Node index of one of this component's terminals. */
  node(terminal: string): number;
  /** Node index of a terminal on any component. */
  nodeOf(compId: string, terminal: string): number;
  earth: number;
  R(a: number, b: number, r: number, tag?: string): number;
  Z(a: number, b: number, r: number, x: number, tag?: string): number;
  V(a: number, b: number, mag: number, deg: number, zr?: number, zx?: number, tag?: string): number;
  I(a: number, b: number, mag: number, deg: number, tag?: string): number;
  /** Attach a leakage/insulation path from a terminal to earth. */
  leak(a: number, r: number, tag?: string): number;
  /** Faults targeting this component. */
  myFaults(): ActiveFault[];
  /** Node index of an internal node of this component, e.g. the metal enclosure. */
  internalNode(name: string): number;
}

export interface UpdateCtx {
  comp: ComponentInstance;
  props: any;
  state: DeviceState;
  env: SimEnv;
  sol: Solution;
  node(terminal: string): number;
  earth: number;
  /** RMS current magnitude through a branch created with the given tag. */
  i(tag: string): number;
  /** Complex current through a tagged branch. */
  ic(tag: string): Cx;
  /** RMS voltage of a node with respect to earth. */
  v(node: number): number;
  /** RMS voltage between two nodes. */
  vd(a: number, b: number): number;
  log(ev: Omit<SimEvent, 't'>): void;
  /** Ask the simulator to re-solve immediately because a state change happened. */
  invalidate(): void;
  /** Publish a measured value for the inspector and status bar. */
  meas(key: string, value: number): void;
  myFaults(): ActiveFault[];
  /** Node index of an internal node of this component, e.g. the metal enclosure. */
  internalNode(name: string): number;
  /** True when the given component is electrically downstream of this one. */
  isDownstream(compId: string): boolean;
}

export interface ComponentDef {
  type: string;
  category: Category;
  /** DIN modules of 17,5 mm occupied in the panel; 0 for non-modular items. */
  modules?: number | ((p: any) => number);
  /** Symbol renderer key used by the web app. */
  symbol: string;
  /** Schematic footprint in pixels. */
  size: (p: any) => { w: number; h: number };
  defaultProps: Record<string, unknown>;
  props: PropSpec[];
  terminals: (p: any) => TerminalDef[];
  initState?: (p: any) => DeviceState;
  stamp?: (ctx: StampCtx) => void;
  update?: (ctx: UpdateCtx) => void;
  /** How the user interacts with it in live mode. */
  interactive?: 'toggle' | 'button' | 'plug' | 'none';
  /** Classification used by the design rule check. */
  flags?: {
    source?: boolean;
    protective?: boolean;
    rcd?: boolean;
    overcurrent?: boolean;
    load?: boolean;
    socket?: boolean;
    luminaire?: boolean;
    classI?: boolean;
    instrument?: boolean;
    enclosurePart?: boolean;
    threePhase?: (p: any) => boolean;
  };
  /** Search keywords in addition to the translated name. */
  keywords?: string[];
}

export const GRID = 10;

/** Convenience builders for terminal layouts. */
export function topBottom(w: number, h: number, pairs: Array<[string, TerminalRole, string?]>): TerminalDef[] {
  const n = pairs.length;
  const out: TerminalDef[] = [];
  pairs.forEach(([id, role, mark], i) => {
    const x = ((i + 1) * w) / (n + 1);
    out.push({ id: `in.${id}`, role, mark, x, y: 0, side: 'top' });
    out.push({ id: `out.${id}`, role, mark, x, y: h, side: 'bottom' });
  });
  return out;
}
