import type { Project } from '@budova/engine';

export interface ApiUser {
  id: string;
  email: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const TOKEN_KEY = 'budova.token';

/**
 * Where the API lives. A static deployment — GitHub Pages, or the built files
 * opened from disk — has no backend at all; that build sets VITE_API_BASE to
 * "off" and the client then works entirely in the browser instead of firing
 * requests that can only 404.
 */
declare const __API_BASE__: string | undefined;

const RAW_API_BASE = typeof __API_BASE__ === 'string' ? __API_BASE__ : '/api';

export const API_AVAILABLE = RAW_API_BASE !== 'off' && RAW_API_BASE !== '';
export const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

export function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_AVAILABLE) throw new ApiError('offline', 0);
  const token = storedToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('network', 0);
  }
  if (!res.ok) {
    let code = 'network';
    try {
      code = ((await res.json()) as { error?: string }).error ?? 'network';
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(code, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  signup: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: ApiUser }>('/auth/me'),
  list: () => request<{ projects: ProjectSummary[] }>('/projects'),
  create: (name: string, data: Project) =>
    request<{ project: ProjectSummary }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, data }),
    }),
  get: (id: string) =>
    request<{ project: ProjectSummary & { data: Project } }>(`/projects/${id}`),
  update: (id: string, name: string, data: Project) =>
    request<{ ok: true; updatedAt: string }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, data }),
    }),
  remove: (id: string) => request<{ ok: true }>(`/projects/${id}`, { method: 'DELETE' }),
  importLocal: (projects: Array<{ name: string; data: Project }>) =>
    request<{ imported: Array<{ id: string; name: string }> }>('/projects/import', {
      method: 'POST',
      body: JSON.stringify({ projects }),
    }),
};
