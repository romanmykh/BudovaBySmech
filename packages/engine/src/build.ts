/**
 * Small helpers for assembling projects programmatically — used by the
 * templates, the tests and the editor when it drops a component on the canvas.
 */
import type { ComponentInstance, Project, Wire, ConductorRole, Csa, ConductorMaterial } from './schema.js';
import { emptyProject } from './schema.js';
import { effectiveProps } from './catalog/index.js';

let seq = 0;
export function uid(prefix = 'x'): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`;
}

export function resetUid(): void {
  seq = 0;
}

export class ProjectBuilder {
  project: Project;

  constructor(name = 'Project', id = 'p1') {
    this.project = emptyProject(id, name);
  }

  settings(s: Partial<Project['settings']>): this {
    Object.assign(this.project.settings, s);
    return this;
  }

  add(
    type: string,
    id: string,
    props: Record<string, unknown> = {},
    extra: Partial<ComponentInstance> = {},
  ): ComponentInstance {
    const comp: ComponentInstance = {
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

  wire(
    from: string,
    to: string,
    role: ConductorRole,
    csa: Csa = 2.5,
    length = 1,
    opts: Partial<Wire> = {},
  ): Wire {
    const [fc, ft] = splitRef(from);
    const [tc, tt] = splitRef(to);
    const w: Wire = {
      id: opts.id ?? uid('w'),
      from: { comp: fc, terminal: ft },
      to: { comp: tc, terminal: tt },
      role,
      csa,
      length,
      material: (opts.material as ConductorMaterial) ?? 'Cu',
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
  wireLNPE(
    from: string,
    to: string,
    csa: Csa,
    length: number,
    opts: Partial<Wire> & { line?: ConductorRole } = {},
  ): Wire[] {
    const line = opts.line ?? 'L1';
    return [
      this.wire(`${from}.L`, `${to}.L`, line, csa, length, opts),
      this.wire(`${from}.N`, `${to}.N`, 'N', csa, length, opts),
      this.wire(`${from}.PE`, `${to}.PE`, 'PE', csa, length, opts),
    ];
  }

  circuit(id: string, name: string, kind: Project['circuits'][number]['kind'], color?: string): this {
    this.project.circuits.push({ id, name, kind, color });
    return this;
  }

  enclosure(e: Project['enclosures'][number]): this {
    this.project.enclosures.push(e);
    return this;
  }

  build(): Project {
    return this.project;
  }
}

function splitRef(ref: string): [string, string] {
  const i = ref.indexOf('.');
  if (i < 0) return [ref, ''];
  return [ref.slice(0, i), ref.slice(i + 1)];
}

/** Default properties for a newly dropped component. */
export function newComponent(type: string, x: number, y: number, id = uid('c')): ComponentInstance {
  return { id, type, x, y, rot: 0, props: { ...effectiveProps(type, {}) } };
}
