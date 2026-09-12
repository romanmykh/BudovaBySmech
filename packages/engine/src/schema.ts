/**
 * Project JSON schema — versioned, forward-migratable.
 * See docs/PROJECT_SCHEMA.md for the human-readable specification.
 */

export const SCHEMA_VERSION = 1;

/** Conductor role carried by a wire. */
export type ConductorRole = 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'PEN' | 'CTRL' | 'ELV+' | 'ELV-';

export type ConductorMaterial = 'Cu' | 'Al';

/** Standard cross-sections in mm² offered by the editor. */
export const CSA_VALUES = [0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95] as const;
export type Csa = number;

/** Earthing system of the installation. */
export type EarthingSystem = 'TN-C' | 'TN-C-S' | 'TN-S';

/**
 * Reference installation methods of ČSN 33 2000-5-52 ed. 2 (IEC 60364-5-52).
 * A1 – insulated conductors in conduit in a thermally insulated wall
 * A2 – multi-core cable in conduit in a thermally insulated wall
 * B1 – insulated conductors in conduit on a wall
 * B2 – multi-core cable in conduit on a wall (typical CZ in-wall wiring)
 * C  – cable clipped direct to a surface
 * E  – multi-core cable in free air
 */
export type InstallMethod = 'A1' | 'A2' | 'B1' | 'B2' | 'C' | 'E';

export type CircuitKind =
  | 'lighting' | 'socket' | 'cooker' | 'boiler' | 'appliance'
  | 'evse' | 'motor' | 'heating' | 'distribution' | 'control' | 'other';

export interface Point { x: number; y: number }

/** Address of one terminal of one component. */
export interface TerminalRef {
  comp: string;
  terminal: string;
}

export interface ComponentInstance {
  id: string;
  /** Catalog type key, e.g. 'mcb', 'rcd', 'socket16'. */
  type: string;
  /** Position in schematic view (grid units of 10 px). */
  x: number;
  y: number;
  /** Rotation in degrees, multiples of 90. */
  rot?: 0 | 90 | 180 | 270;
  mirror?: boolean;
  /** User label, e.g. "F1", "Zásuvky kuchyň". */
  label?: string;
  /** Free-form properties validated against the catalog PropSpec list. */
  props: Record<string, unknown>;
  /** Circuit grouping id. */
  circuit?: string;
  /** Placement in the panel (front elevation) view. */
  panel?: PanelPlacement;
  /** Locked against accidental moving. */
  locked?: boolean;
  /** Room / location free text, used by the design rule check (bathroom zones). */
  location?: string;
  notes?: string;
}

export interface PanelPlacement {
  enclosureId: string;
  /** 1-based row index. */
  row: number;
  /** 0-based module offset from the left of the rail. */
  slot: number;
}

export interface Wire {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
  role: ConductorRole;
  /** Cross-section in mm². */
  csa: Csa;
  /** Route length in metres (electrically significant). */
  length: number;
  material: ConductorMaterial;
  /** Colour override; when absent the role convention applies. */
  color?: string | null;
  /** Manual bend points between the two terminals (schematic coordinates). */
  points?: Point[];
  circuit?: string;
  installMethod?: InstallMethod;
  /** Number of loaded conductors in the same enclosure/conduit (ampacity). */
  loadedConductors?: 2 | 3;
  /** Grouping derating factor, 0..1. */
  groupingFactor?: number;
  notes?: string;
}

export interface Circuit {
  id: string;
  name: string;
  kind: CircuitKind;
  color?: string;
  /** Free text used on the printable circuit schedule. */
  description?: string;
}

export interface Enclosure {
  id: string;
  name: string;
  rows: number;
  /** Modules per row — 12, 14 or 18 in common CZ enclosures. */
  modulesPerRow: number;
  mount: 'flush' | 'surface';
  ip: string;
  /** Position in the panel view. */
  x: number;
  y: number;
  door?: boolean;
}

export interface Busbar {
  id: string;
  enclosureId: string;
  row: number;
  /** First module covered. */
  slot: number;
  /** Width in modules. */
  modules: number;
  kind: '1P' | '3P' | '3P+N' | '1P+N';
  /** Phase the 1P comb is fed from. */
  phase?: 'L1' | 'L2' | 'L3';
  inA?: number;
}

export type AnnotationKind = 'text' | 'rect' | 'line' | 'note';

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  x2?: number;
  y2?: number;
  text?: string;
  color?: string;
  fontSize?: number;
  view?: 'schematic' | 'panel';
}

export interface Group {
  id: string;
  name?: string;
  members: string[];
}

export interface ProjectSettings {
  system: EarthingSystem;
  /** Nominal line-to-neutral voltage (V). */
  voltageLN: number;
  /** Nominal line-to-line voltage (V). */
  voltageLL: number;
  frequency: number;
  /** Ambient temperature (°C) for ampacity derating. */
  ambientTemp: number;
  defaultInstallMethod: InstallMethod;
  /** Voltage drop limits in % (ČSN 33 2000-5-52 ed. 2, informative annex). */
  voltageDropLighting: number;
  voltageDropOther: number;
  /** Default conductor operating temperature used for Zs / drop calculations. */
  conductorTemp: number;
  /** Dwelling, commercial… changes some rule severities. */
  premises: 'dwelling' | 'commercial' | 'industrial' | 'outdoor';
}

export interface ProjectMeta {
  author?: string;
  site?: string;
  notes?: string;
  revision?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ViewState {
  pan: Point;
  zoom: number;
}

export interface Project {
  schemaVersion: number;
  id: string;
  name: string;
  meta: ProjectMeta;
  settings: ProjectSettings;
  components: ComponentInstance[];
  wires: Wire[];
  circuits: Circuit[];
  enclosures: Enclosure[];
  busbars: Busbar[];
  annotations: Annotation[];
  groups: Group[];
  view?: { schematic?: ViewState; panel?: ViewState };
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  system: 'TN-C-S',
  voltageLN: 230,
  voltageLL: 400,
  frequency: 50,
  ambientTemp: 30,
  defaultInstallMethod: 'B2',
  voltageDropLighting: 3,
  voltageDropOther: 5,
  conductorTemp: 70,
  premises: 'dwelling',
};

export function emptyProject(id: string, name: string): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    name,
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    settings: { ...DEFAULT_SETTINGS },
    components: [],
    wires: [],
    circuits: [],
    enclosures: [],
    busbars: [],
    annotations: [],
    groups: [],
  };
}

/** Colour convention for conductor roles (ČSN EN 60445 / IEC 60446). */
export const ROLE_COLORS: Record<ConductorRole, string> = {
  L1: '#8a5a2b',   // brown
  L2: '#1a1a1a',   // black
  L3: '#8e8e8e',   // grey
  N: '#2f6fd0',    // blue
  PE: '#2faa3c',   // green-yellow (rendered with a stripe)
  PEN: '#2faa3c',
  CTRL: '#c0392b',
  'ELV+': '#e07b1a',
  'ELV-': '#6b4fa0',
};

export function roleColor(w: Pick<Wire, 'role' | 'color'>): string {
  return w.color || ROLE_COLORS[w.role] || '#666';
}

export function isLine(role: ConductorRole): role is 'L1' | 'L2' | 'L3' {
  return role === 'L1' || role === 'L2' || role === 'L3';
}

/* ------------------------------------------------------------------ */
/* Migration                                                           */
/* ------------------------------------------------------------------ */

type Migration = (p: any) => any;

/**
 * Migrations are applied in order for every version below SCHEMA_VERSION.
 * Index i migrates a document of version i+1 to version i+2.
 */
const MIGRATIONS: Migration[] = [
  // (no migrations yet — v1 is the first published schema)
];

export interface MigrationResult {
  project: Project;
  migratedFrom: number | null;
  warnings: string[];
}

export function migrateProject(raw: unknown): MigrationResult {
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object') throw new Error('Project JSON is not an object');
  let doc: any = { ...(raw as any) };
  const from = typeof doc.schemaVersion === 'number' ? doc.schemaVersion : null;
  if (from === null) {
    warnings.push('Document has no schemaVersion; assuming version 1.');
    doc.schemaVersion = 1;
  }
  if (doc.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `Project uses schema version ${doc.schemaVersion}, this build understands up to ${SCHEMA_VERSION}.`,
    );
  }
  while (doc.schemaVersion < SCHEMA_VERSION) {
    const m = MIGRATIONS[doc.schemaVersion - 1];
    if (!m) throw new Error(`Missing migration from schema version ${doc.schemaVersion}`);
    doc = m(doc);
    doc.schemaVersion += 1;
  }
  return { project: normaliseProject(doc), migratedFrom: from, warnings };
}

/** Fills in defaults so that older or hand-written documents load safely. */
export function normaliseProject(doc: any): Project {
  const p: Project = {
    schemaVersion: SCHEMA_VERSION,
    id: String(doc.id ?? 'project'),
    name: String(doc.name ?? 'Untitled'),
    meta: { ...(doc.meta ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(doc.settings ?? {}) },
    components: Array.isArray(doc.components) ? doc.components.map(normComp) : [],
    wires: Array.isArray(doc.wires) ? doc.wires.map(normWire) : [],
    circuits: Array.isArray(doc.circuits) ? doc.circuits : [],
    enclosures: Array.isArray(doc.enclosures) ? doc.enclosures : [],
    busbars: Array.isArray(doc.busbars) ? doc.busbars : [],
    annotations: Array.isArray(doc.annotations) ? doc.annotations : [],
    groups: Array.isArray(doc.groups) ? doc.groups : [],
    view: doc.view,
  };
  return p;
}

function normComp(c: any): ComponentInstance {
  return {
    id: String(c.id),
    type: String(c.type),
    x: Number(c.x) || 0,
    y: Number(c.y) || 0,
    rot: (c.rot ?? 0) as 0 | 90 | 180 | 270,
    mirror: !!c.mirror,
    label: c.label,
    props: c.props && typeof c.props === 'object' ? { ...c.props } : {},
    circuit: c.circuit,
    panel: c.panel,
    locked: !!c.locked,
    location: c.location,
    notes: c.notes,
  };
}

function normWire(w: any): Wire {
  return {
    id: String(w.id),
    from: { comp: String(w.from?.comp), terminal: String(w.from?.terminal) },
    to: { comp: String(w.to?.comp), terminal: String(w.to?.terminal) },
    role: (w.role ?? 'L1') as ConductorRole,
    csa: Number(w.csa) || 1.5,
    length: Number.isFinite(Number(w.length)) ? Number(w.length) : 1,
    material: (w.material ?? 'Cu') as ConductorMaterial,
    color: w.color ?? null,
    points: Array.isArray(w.points) ? w.points : [],
    circuit: w.circuit,
    installMethod: w.installMethod,
    loadedConductors: w.loadedConductors,
    groupingFactor: w.groupingFactor,
    notes: w.notes,
  };
}
