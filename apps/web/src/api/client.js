const TOKEN_KEY = 'budova.token';
export function storedToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    }
    catch {
        return null;
    }
}
export function storeToken(token) {
    try {
        if (token)
            localStorage.setItem(TOKEN_KEY, token);
        else
            localStorage.removeItem(TOKEN_KEY);
    }
    catch {
        /* private mode */
    }
}
export class ApiError extends Error {
    code;
    status;
    constructor(code, status) {
        super(code);
        this.code = code;
        this.status = status;
    }
}
async function request(path, init = {}) {
    const token = storedToken();
    let res;
    try {
        res = await fetch(`/api${path}`, {
            ...init,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(init.headers ?? {}),
            },
        });
    }
    catch {
        throw new ApiError('network', 0);
    }
    if (!res.ok) {
        let code = 'network';
        try {
            code = (await res.json()).error ?? 'network';
        }
        catch {
            /* non-JSON error */
        }
        throw new ApiError(code, res.status);
    }
    return (await res.json());
}
export const api = {
    signup: (email, password) => request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }),
    login: (email, password) => request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
    list: () => request('/projects'),
    create: (name, data) => request('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, data }),
    }),
    get: (id) => request(`/projects/${id}`),
    update: (id, name, data) => request(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, data }),
    }),
    remove: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
    importLocal: (projects) => request('/projects/import', {
        method: 'POST',
        body: JSON.stringify({ projects }),
    }),
};
