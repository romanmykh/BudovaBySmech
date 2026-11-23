import { create } from 'zustand';
import {
  type Project, type ComponentInstance, type Wire, type ConductorRole, type Enclosure,
  type Annotation, type Circuit, type CircuitKind,
  emptyProject, effectiveProps, getDef, sizeOf, moduleCount, uid, newComponent,
} from '@budova/engine';

export type StorageKind = 'local' | 'cloud';

const HISTORY_LIMIT = 60;

function clone<T>(v: T): T {
  return typeof structuredClone === 'function' ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
}

interface ProjectState {
  project: Project;
  /** Server id (cloud) or local storage id. */
  projectId: string | null;
  storage: StorageKind;
  dirty: boolean;
  selection: string[];
  selectedWires: string[];
  selectedAnnotations: string[];
  past: Project[];
  future: Project[];
  clipboard: { components: ComponentInstance[]; wires: Wire[] } | null;
  /** Snapshot taken when a drag gesture starts, so undo can return to it. */
  gesture: Project | null;

  loadProject(p: Project, id: string | null, storage: StorageKind): void;
  commit(mutate: (p: Project) => void): void;
  /** Change without pushing a history entry — used while dragging. */
  touch(mutate: (p: Project) => void): void;
  /**
   * Drag gestures update the project continuously but must leave exactly one
   * history entry, holding the state from *before* the drag started.
   */
  beginGesture(): void;
  endGesture(mutate?: (p: Project) => void): void;
  cancelGesture(): void;
  undo(): void;
  redo(): void;
  markSaved(id?: string | null, storage?: StorageKind): void;

  select(ids: string[], wires?: string[], annotations?: string[]): void;
  toggleSelect(id: string, additive: boolean): void;
  clearSelection(): void;

  addComponent(type: string, x: number, y: number): string;
  deleteSelection(): void;
  duplicateSelection(): void;
  copySelection(): void;
  paste(dx?: number, dy?: number): void;
  moveSelection(dx: number, dy: number, commitMove: boolean): void;
  rotateSelection(): void;
  alignSelection(edge: 'left' | 'top' | 'right' | 'bottom'): void;
  distributeSelection(axis: 'h' | 'v'): void;
  groupSelection(): void;
  ungroupSelection(): void;

  setProps(id: string, props: Record<string, unknown>): void;
  setComponent(id: string, patch: Partial<ComponentInstance>): void;
  addWire(w: Omit<Wire, 'id'>): string | null;
  setWire(id: string, patch: Partial<Wire>): void;
  deleteWire(id: string): void;

  addAnnotation(a: Omit<Annotation, 'id'>): string;
  updateAnnotation(id: string, patch: Partial<Annotation>): void;

  addCircuit(name: string, kind: CircuitKind): string;
  updateCircuit(id: string, patch: Partial<Circuit>): void;
  deleteCircuit(id: string): void;

  addEnclosure(e: Omit<Enclosure, 'id'>): string;
  placeInPanel(compId: string, enclosureId: string, row: number, slot: number): void;
  removeFromPanel(compId: string): void;
  setName(name: string): void;
  setSettings(patch: Partial<Project['settings']>): void;
}

const DESIGNATION: Record<string, string> = {
  contactor: 'KM', motorContactor: 'KM', controlRelay: 'K', timeRelay: 'KT', impulseRelay: 'KR',
  stairTimer: 'KT', pushButton: 'SB', selectorSwitch: 'SA', emergencyStop: 'SB', limitSwitch: 'SQ',
  signalLamp: 'HL', overloadRelay: 'FR', motor3f: 'M', switch1: 'S', switch5: 'S', switch6: 'S', switch7: 'S',
  button: 'S', lampE27: 'E', ledPanel: 'E', socket16: 'XS',
};

function newEmpty(): Project {
  const p = emptyProject(uid('p'), 'Untitled');
  return p;
}

export const useProject = create<ProjectState>((set, get) => ({
  project: newEmpty(),
  projectId: null,
  storage: 'local',
  dirty: false,
  selection: [],
  selectedWires: [],
  selectedAnnotations: [],
  past: [],
  future: [],
  clipboard: null,
  gesture: null,

  loadProject: (p, id, storage) =>
    set({
      project: clone(p),
      projectId: id,
      storage,
      dirty: false,
      selection: [],
      selectedWires: [],
      selectedAnnotations: [],
      past: [],
      future: [],
      gesture: null,
    }),

  commit: (mutate) =>
    set((s) => {
      const before = s.project;
      const next = clone(before);
      mutate(next);
      next.meta.updatedAt = new Date().toISOString();
      const past = [...s.past, before].slice(-HISTORY_LIMIT);
      return { project: next, past, future: [], dirty: true };
    }),

  touch: (mutate) =>
    set((s) => {
      const next = clone(s.project);
      mutate(next);
      return { project: next, dirty: true };
    }),

  beginGesture: () => set((s) => ({ gesture: s.gesture ?? s.project })),

  endGesture: (mutate) =>
    set((s) => {
      const before = s.gesture;
      const next = clone(s.project);
      if (mutate) mutate(next);
      next.meta.updatedAt = new Date().toISOString();
      if (!before) return { project: next, gesture: null, dirty: true };
      return {
        project: next,
        gesture: null,
        past: [...s.past, before].slice(-HISTORY_LIMIT),
        future: [],
        dirty: true,
      };
    }),

  cancelGesture: () => set({ gesture: null }),

  undo: () =>
    set((s) => {
      if (!s.past.length) return {};
      const previous = s.past[s.past.length - 1];
      return {
        project: previous,
        past: s.past.slice(0, -1),
        future: [s.project, ...s.future].slice(0, HISTORY_LIMIT),
        dirty: true,
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return {};
      const next = s.future[0];
      return {
        project: next,
        past: [...s.past, s.project].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        dirty: true,
      };
    }),

  markSaved: (id, storage) =>
    set((s) => ({ dirty: false, projectId: id ?? s.projectId, storage: storage ?? s.storage })),

  select: (ids, wires = [], annotations = []) =>
    set({ selection: ids, selectedWires: wires, selectedAnnotations: annotations }),
  toggleSelect: (id, additive) =>
    set((s) => {
      if (!additive) return { selection: [id], selectedWires: [], selectedAnnotations: [] };
      return s.selection.includes(id)
        ? { selection: s.selection.filter((x) => x !== id) }
        : { selection: [...s.selection, id] };
    }),
  clearSelection: () => set({ selection: [], selectedWires: [], selectedAnnotations: [] }),

  addComponent: (type, x, y) => {
    const id = uid('c');
    get().commit((p) => {
      const comp = newComponent(type, x, y, id);
      // Give protective devices a sensible default label so the board is
      // labelled from the start.
      const def = getDef(type);
      if (def?.flags?.overcurrent || def?.flags?.rcd) {
        const n = p.components.filter((c) => {
          const d = getDef(c.type);
          return d?.flags?.overcurrent || d?.flags?.rcd;
        }).length;
        comp.label = `F${n + 1}`;
      } else {
        // Reference designations as drawn in Czech control schematics.
        const prefix = DESIGNATION[type];
        if (prefix) {
          const used = new Set(p.components.map((c) => c.label));
          let n = 1;
          while (used.has(`${prefix}${n}`)) n++;
          comp.label = `${prefix}${n}`;
        }
      }
      p.components.push(comp);
    });
    set({ selection: [id], selectedWires: [] });
    return id;
  },

  deleteSelection: () => {
    const { selection, selectedWires, selectedAnnotations } = get();
    if (!selection.length && !selectedWires.length && !selectedAnnotations.length) return;
    get().commit((p) => {
      const ids = new Set(selection);
      p.components = p.components.filter((c) => !ids.has(c.id));
      const wireIds = new Set(selectedWires);
      p.wires = p.wires.filter(
        (w) => !wireIds.has(w.id) && !ids.has(w.from.comp) && !ids.has(w.to.comp),
      );
      const annIds = new Set(selectedAnnotations);
      p.annotations = p.annotations.filter((a) => !annIds.has(a.id));
      p.groups = p.groups
        .map((g) => ({ ...g, members: g.members.filter((m) => !ids.has(m)) }))
        .filter((g) => g.members.length > 1);
    });
    set({ selection: [], selectedWires: [], selectedAnnotations: [] });
  },

  copySelection: () => {
    const { project, selection } = get();
    const ids = new Set(selection);
    set({
      clipboard: {
        components: project.components.filter((c) => ids.has(c.id)).map(clone),
        wires: project.wires.filter((w) => ids.has(w.from.comp) && ids.has(w.to.comp)).map(clone),
      },
    });
  },

  paste: (dx = 40, dy = 40) => {
    const cb = get().clipboard;
    if (!cb || !cb.components.length) return;
    const map = new Map<string, string>();
    const newIds: string[] = [];
    get().commit((p) => {
      for (const c of cb.components) {
        const id = uid('c');
        map.set(c.id, id);
        newIds.push(id);
        p.components.push({ ...clone(c), id, x: c.x + dx, y: c.y + dy });
      }
      for (const w of cb.wires) {
        const from = map.get(w.from.comp);
        const to = map.get(w.to.comp);
        if (!from || !to) continue;
        p.wires.push({
          ...clone(w),
          id: uid('w'),
          from: { comp: from, terminal: w.from.terminal },
          to: { comp: to, terminal: w.to.terminal },
          points: (w.points ?? []).map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
        });
      }
    });
    set({ selection: newIds, selectedWires: [] });
  },

  duplicateSelection: () => {
    get().copySelection();
    get().paste(30, 30);
  },

  moveSelection: (dx, dy, commitMove) => {
    const ids = new Set(get().selection);
    if (!ids.size) return;
    const apply = (p: Project) => {
      for (const c of p.components) {
        if (ids.has(c.id) && !c.locked) {
          c.x += dx;
          c.y += dy;
        }
      }
      for (const w of p.wires) {
        if (ids.has(w.from.comp) && ids.has(w.to.comp) && w.points?.length) {
          w.points = w.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
        }
      }
    };
    if (commitMove) get().commit(apply);
    else get().touch(apply);
  },

  rotateSelection: () => {
    const ids = new Set(get().selection);
    if (!ids.size) return;
    get().commit((p) => {
      for (const c of p.components) {
        if (ids.has(c.id)) c.rot = (((c.rot ?? 0) + 90) % 360) as 0 | 90 | 180 | 270;
      }
    });
  },

  alignSelection: (edge) => {
    const { project, selection } = get();
    const ids = new Set(selection);
    const sel = project.components.filter((c) => ids.has(c.id));
    if (sel.length < 2) return;
    const boxes = sel.map((c) => ({ c, s: sizeOf(c.type, c.props) }));
    const target =
      edge === 'left' ? Math.min(...boxes.map((b) => b.c.x))
      : edge === 'top' ? Math.min(...boxes.map((b) => b.c.y))
      : edge === 'right' ? Math.max(...boxes.map((b) => b.c.x + b.s.w))
      : Math.max(...boxes.map((b) => b.c.y + b.s.h));
    get().commit((p) => {
      for (const b of boxes) {
        const c = p.components.find((x) => x.id === b.c.id)!;
        if (edge === 'left') c.x = target;
        else if (edge === 'top') c.y = target;
        else if (edge === 'right') c.x = target - b.s.w;
        else c.y = target - b.s.h;
      }
    });
  },

  distributeSelection: (axis) => {
    const { project, selection } = get();
    const ids = new Set(selection);
    const sel = project.components.filter((c) => ids.has(c.id));
    if (sel.length < 3) return;
    const key = axis === 'h' ? 'x' : 'y';
    const sorted = [...sel].sort((a, b) => (a as any)[key] - (b as any)[key]);
    const first = (sorted[0] as any)[key];
    const last = (sorted[sorted.length - 1] as any)[key];
    const gap = (last - first) / (sorted.length - 1);
    get().commit((p) => {
      sorted.forEach((c, i) => {
        const target = p.components.find((x) => x.id === c.id)!;
        (target as any)[key] = Math.round(first + gap * i);
      });
    });
  },

  groupSelection: () => {
    const sel = get().selection;
    if (sel.length < 2) return;
    get().commit((p) => {
      p.groups.push({ id: uid('g'), members: [...sel] });
    });
  },

  ungroupSelection: () => {
    const sel = new Set(get().selection);
    get().commit((p) => {
      p.groups = p.groups.filter((g) => !g.members.some((m) => sel.has(m)));
    });
  },

  setProps: (id, props) =>
    get().commit((p) => {
      const c = p.components.find((x) => x.id === id);
      if (c) c.props = { ...c.props, ...props };
    }),

  setComponent: (id, patch) =>
    get().commit((p) => {
      const c = p.components.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
    }),

  addWire: (w) => {
    const { project } = get();
    // A terminal pair may only be joined once.
    const exists = project.wires.some(
      (x) =>
        (x.from.comp === w.from.comp && x.from.terminal === w.from.terminal &&
          x.to.comp === w.to.comp && x.to.terminal === w.to.terminal) ||
        (x.to.comp === w.from.comp && x.to.terminal === w.from.terminal &&
          x.from.comp === w.to.comp && x.from.terminal === w.to.terminal),
    );
    if (exists) return null;
    const id = uid('w');
    get().commit((p) => {
      p.wires.push({ ...w, id } as Wire);
    });
    return id;
  },

  setWire: (id, patch) =>
    get().commit((p) => {
      const w = p.wires.find((x) => x.id === id);
      if (w) Object.assign(w, patch);
    }),

  deleteWire: (id) =>
    get().commit((p) => {
      p.wires = p.wires.filter((w) => w.id !== id);
    }),

  addAnnotation: (a) => {
    const id = uid('a');
    get().commit((p) => {
      p.annotations.push({ ...a, id } as Annotation);
    });
    set({ selection: [], selectedWires: [], selectedAnnotations: [id] });
    return id;
  },

  updateAnnotation: (id, patch) =>
    get().commit((p) => {
      const a = p.annotations.find((x) => x.id === id);
      if (a) Object.assign(a, patch);
    }),

  addCircuit: (name, kind) => {
    const id = uid('circ');
    const palette = ['#f0b429', '#2f8fd0', '#d0472f', '#2fb37a', '#7c5cbf', '#d07a2f', '#3f9fa8'];
    get().commit((p) => {
      p.circuits.push({ id, name, kind, color: palette[p.circuits.length % palette.length] });
    });
    return id;
  },

  updateCircuit: (id, patch) =>
    get().commit((p) => {
      const c = p.circuits.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
    }),

  deleteCircuit: (id) =>
    get().commit((p) => {
      p.circuits = p.circuits.filter((c) => c.id !== id);
      for (const c of p.components) if (c.circuit === id) delete c.circuit;
      for (const w of p.wires) if (w.circuit === id) delete w.circuit;
    }),

  addEnclosure: (e) => {
    const id = uid('e');
    get().commit((p) => {
      p.enclosures.push({ ...e, id });
    });
    return id;
  },

  placeInPanel: (compId, enclosureId, row, slot) =>
    get().commit((p) => {
      const c = p.components.find((x) => x.id === compId);
      if (c) c.panel = { enclosureId, row, slot };
    }),

  removeFromPanel: (compId) =>
    get().commit((p) => {
      const c = p.components.find((x) => x.id === compId);
      if (c) delete c.panel;
    }),

  setName: (name) =>
    get().commit((p) => {
      p.name = name;
    }),

  setSettings: (patch) =>
    get().commit((p) => {
      Object.assign(p.settings, patch);
    }),
}));

/** Modules occupied by the devices already placed in a row. */
export function rowUsage(project: Project, enclosureId: string, row: number): number {
  return project.components
    .filter((c) => c.panel?.enclosureId === enclosureId && c.panel.row === row)
    .reduce((n, c) => n + moduleCount(c.type, c.props), 0);
}

export { effectiveProps, sizeOf, moduleCount };
export type { ConductorRole };
