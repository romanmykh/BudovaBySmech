/**
 * Project JSON schema — versioned, forward-migratable.
 * See docs/PROJECT_SCHEMA.md for the human-readable specification.
 */
export const SCHEMA_VERSION = 1;
/** Standard cross-sections in mm² offered by the editor. */
export const CSA_VALUES = [0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95];
export const DEFAULT_SETTINGS = {
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
export function emptyProject(id, name) {
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
export const ROLE_COLORS = {
    L1: '#8a5a2b', // brown
    L2: '#1a1a1a', // black
    L3: '#8e8e8e', // grey
    N: '#2f6fd0', // blue
    PE: '#2faa3c', // green-yellow (rendered with a stripe)
    PEN: '#2faa3c',
    CTRL: '#c0392b',
    'ELV+': '#e07b1a',
    'ELV-': '#6b4fa0',
};
export function roleColor(w) {
    return w.color || ROLE_COLORS[w.role] || '#666';
}
export function isLine(role) {
    return role === 'L1' || role === 'L2' || role === 'L3';
}
/**
 * Migrations are applied in order for every version below SCHEMA_VERSION.
 * Index i migrates a document of version i+1 to version i+2.
 */
const MIGRATIONS = [
// (no migrations yet — v1 is the first published schema)
];
export function migrateProject(raw) {
    const warnings = [];
    if (!raw || typeof raw !== 'object')
        throw new Error('Project JSON is not an object');
    let doc = { ...raw };
    const from = typeof doc.schemaVersion === 'number' ? doc.schemaVersion : null;
    if (from === null) {
        warnings.push('Document has no schemaVersion; assuming version 1.');
        doc.schemaVersion = 1;
    }
    if (doc.schemaVersion > SCHEMA_VERSION) {
        throw new Error(`Project uses schema version ${doc.schemaVersion}, this build understands up to ${SCHEMA_VERSION}.`);
    }
    while (doc.schemaVersion < SCHEMA_VERSION) {
        const m = MIGRATIONS[doc.schemaVersion - 1];
        if (!m)
            throw new Error(`Missing migration from schema version ${doc.schemaVersion}`);
        doc = m(doc);
        doc.schemaVersion += 1;
    }
    return { project: normaliseProject(doc), migratedFrom: from, warnings };
}
/** Fills in defaults so that older or hand-written documents load safely. */
export function normaliseProject(doc) {
    const p = {
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
function normComp(c) {
    return {
        id: String(c.id),
        type: String(c.type),
        x: Number(c.x) || 0,
        y: Number(c.y) || 0,
        rot: (c.rot ?? 0),
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
function normWire(w) {
    return {
        id: String(w.id),
        from: { comp: String(w.from?.comp), terminal: String(w.from?.terminal) },
        to: { comp: String(w.to?.comp), terminal: String(w.to?.terminal) },
        role: (w.role ?? 'L1'),
        csa: Number(w.csa) || 1.5,
        length: Number.isFinite(Number(w.length)) ? Number(w.length) : 1,
        material: (w.material ?? 'Cu'),
        color: w.color ?? null,
        points: Array.isArray(w.points) ? w.points : [],
        circuit: w.circuit,
        installMethod: w.installMethod,
        loadedConductors: w.loadedConductors,
        groupingFactor: w.groupingFactor,
        notes: w.notes,
    };
}
