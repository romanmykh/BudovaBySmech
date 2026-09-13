import { create } from 'zustand';
import { api, ApiError, storeToken, storedToken, type ApiUser, type ProjectSummary } from '../api/client.js';
import { localStore } from '../storage/local.js';
import { useProject } from './project.js';
import { uid, type Project } from '@budova/engine';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface AuthState {
  user: ApiUser | null;
  checked: boolean;
  serverUp: boolean;
  cloudProjects: ProjectSummary[];
  saveState: SaveState;
  lastSavedAt: number | null;

  init(): Promise<void>;
  signup(email: string, password: string): Promise<void>;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refreshProjects(): Promise<void>;
  /** Save the current project to wherever it belongs. */
  save(force?: boolean): Promise<void>;
  saveAsNew(name: string): Promise<void>;
  /** One-click move of guest projects into the freshly created account. */
  importLocalProjects(): Promise<number>;
  deleteProject(id: string, storage: 'local' | 'cloud'): Promise<void>;
  renameProject(id: string, storage: 'local' | 'cloud', name: string): Promise<void>;
  duplicateProject(id: string, storage: 'local' | 'cloud', name: string): Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  checked: false,
  serverUp: true,
  cloudProjects: [],
  saveState: 'idle',
  lastSavedAt: null,

  init: async () => {
    if (!storedToken()) {
      set({ checked: true });
      // Still probe the server so the UI knows whether signing in is possible.
      try {
        await fetch('/api/health');
      } catch {
        set({ serverUp: false });
      }
      return;
    }
    try {
      const { user } = await api.me();
      set({ user, checked: true, serverUp: true });
      await get().refreshProjects();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'network') set({ serverUp: false });
      else storeToken(null);
      set({ checked: true });
    }
  },

  signup: async (email, password) => {
    const { token, user } = await api.signup(email, password);
    storeToken(token);
    set({ user, serverUp: true });
    adoptOpenProject();
    await get().refreshProjects();
  },

  login: async (email, password) => {
    const { token, user } = await api.login(email, password);
    storeToken(token);
    set({ user, serverUp: true });
    adoptOpenProject();
    await get().refreshProjects();
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      /* the token is dropped locally either way */
    }
    storeToken(null);
    set({ user: null, cloudProjects: [] });
  },

  refreshProjects: async () => {
    if (!get().user) return;
    try {
      const { projects } = await api.list();
      set({ cloudProjects: projects });
    } catch {
      /* leave the previous list in place */
    }
  },

  save: async (force = false) => {
    const ps = useProject.getState();
    if (!ps.dirty && !force) return;
    set({ saveState: 'saving' });
    const { project, projectId, storage } = ps;
    try {
      if (get().user && storage === 'cloud' && projectId) {
        await api.update(projectId, project.name, project);
      } else if (get().user && storage === 'cloud') {
        const { project: created } = await api.create(project.name, project);
        useProject.getState().markSaved(created.id, 'cloud');
        await get().refreshProjects();
      } else {
        const id = projectId ?? uid('lp');
        localStore.save(id, project.name, project);
        useProject.getState().markSaved(id, 'local');
      }
      useProject.getState().markSaved();
      set({ saveState: 'saved', lastSavedAt: Date.now() });
      if (get().user) await get().refreshProjects();
    } catch (e) {
      // Falling back to local storage means work is never lost because the
      // server is unreachable.
      const id = projectId ?? uid('lp');
      localStore.save(id, project.name, project);
      useProject.getState().markSaved(id, 'local');
      set({ saveState: e instanceof ApiError && e.code === 'network' ? 'saved' : 'error' });
      if (e instanceof ApiError && e.code === 'network') set({ serverUp: false });
    }
  },

  saveAsNew: async (name) => {
    const project: Project = { ...useProject.getState().project, name };
    if (get().user) {
      const { project: created } = await api.create(name, project);
      useProject.getState().loadProject(project, created.id, 'cloud');
      useProject.getState().markSaved(created.id, 'cloud');
      await get().refreshProjects();
    } else {
      const id = uid('lp');
      localStore.save(id, name, project);
      useProject.getState().loadProject(project, id, 'local');
      useProject.getState().markSaved(id, 'local');
    }
    set({ saveState: 'saved', lastSavedAt: Date.now() });
  },

  importLocalProjects: async () => {
    const local = localStore.list();
    if (!local.length || !get().user) return 0;
    const { imported } = await api.importLocal(local.map((p) => ({ name: p.name, data: p.data })));
    localStore.clear();
    await get().refreshProjects();
    // If the open project came from local storage, re-point it at the copy.
    const ps = useProject.getState();
    if (ps.storage === 'local') {
      const match = imported.find((i) => i.name === ps.project.name);
      if (match) ps.markSaved(match.id, 'cloud');
    }
    return imported.length;
  },

  deleteProject: async (id, storage) => {
    if (storage === 'cloud') {
      await api.remove(id);
      await get().refreshProjects();
    } else {
      localStore.remove(id);
    }
    if (useProject.getState().projectId === id) {
      useProject.getState().markSaved(null, storage);
    }
  },

  renameProject: async (id, storage, name) => {
    if (storage === 'cloud') {
      const { project } = await api.get(id);
      await api.update(id, name, project.data);
      await get().refreshProjects();
    } else {
      const rec = localStore.get(id);
      if (rec) localStore.save(id, name, rec.data);
    }
    if (useProject.getState().projectId === id) useProject.getState().setName(name);
  },

  duplicateProject: async (id, storage, name) => {
    if (storage === 'cloud') {
      const { project } = await api.get(id);
      await api.create(name, { ...project.data, name });
      await get().refreshProjects();
    } else {
      const rec = localStore.get(id);
      if (rec) localStore.save(uid('lp'), name, { ...rec.data, name });
    }
  },
}));

/**
 * After signing in, the project on screen belongs to the account: the next save
 * creates it on the server instead of writing to this browser again.
 */
function adoptOpenProject(): void {
  const ps = useProject.getState();
  if (ps.storage === 'local') ps.markSaved(null, 'cloud');
}

/** Autosave every few seconds while there is something to save. */
export function startAutosave(intervalMs = 4000): () => void {
  const timer = window.setInterval(() => {
    const ps = useProject.getState();
    if (ps.dirty && useAuth.getState().saveState !== 'saving') void useAuth.getState().save();
  }, intervalMs);
  return () => window.clearInterval(timer);
}
