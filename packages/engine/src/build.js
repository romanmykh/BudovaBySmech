import { emptyProject } from './schema.js';
import { effectiveProps } from './catalog/index.js';
let seq = 0;
export function uid(prefix = 'x') {
    seq += 1;
    return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`;
}
export function resetUid() {
    seq = 0;
}
export class ProjectBuilder {
    project;
    constructor(name = 'Project', id = 'p1') {
        this.project = emptyProject(id, name);
    }
    settings(s) {
        Object.assign(this.project.settings, s);
        return this;
    }
    add(type, id, props = {}, extra = {}) {
        const comp = {
            id,
            type,
            x: extra.x ?? 0,
            y: extra.y ?? 0,
            rot: extra.rot ?? 0,
            label: extra.label,
            props,
            circuit: extra.circuit,
            panel: extra.panel,
            location: extra.location,
        };
        this.project.components.push(comp);
        return comp;
    }
    wire(from, to, role, csa = 2.5, length = 1, opts = {}) {
        const [fc, ft] = splitRef(from);
        const [tc, tt] = splitRef(to);
        const w = {
            id: opts.id ?? uid('w'),
            from: { comp: fc, terminal: ft },
            to: { comp: tc, terminal: tt },
            role,
            csa,
            length,
            material: opts.material ?? 'Cu',
            color: opts.color ?? null,
            points: opts.points ?? [],
            circuit: opts.circuit,
            installMethod: opts.installMethod,
            loadedConductors: opts.loadedConductors,
            groupingFactor: opts.groupingFactor,
        };
        this.project.wires.push(w);
        return w;
    }
    /** Wire a complete L/N/PE run between two components in one call. */
    wireLNPE(from, to, csa, length, opts = {}) {
        const line = opts.line ?? 'L1';
        return [
            this.wire(`${from}.L`, `${to}.L`, line, csa, length, opts),
            this.wire(`${from}.N`, `${to}.N`, 'N', csa, length, opts),
            this.wire(`${from}.PE`, `${to}.PE`, 'PE', csa, length, opts),
        ];
    }
    circuit(id, name, kind, color) {
        this.project.circuits.push({ id, name, kind, color });
        return this;
    }
    enclosure(e) {
        this.project.enclosures.push(e);
        return this;
    }
    build() {
        return this.project;
    }
}
function splitRef(ref) {
    const i = ref.indexOf('.');
    if (i < 0)
        return [ref, ''];
    return [ref.slice(0, i), ref.slice(i + 1)];
}
/** Default properties for a newly dropped component. */
export function newComponent(type, x, y, id = uid('c')) {
    return { id, type, x, y, rot: 0, props: { ...effectiveProps(type, {}) } };
}
