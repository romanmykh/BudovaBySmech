import { migrateProject } from '@budova/engine';
/** Guest mode: complete projects kept in this browser only. */
const KEY = 'budova.projects';
function readAll() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function writeAll(items) {
    try {
        localStorage.setItem(KEY, JSON.stringify(items));
    }
    catch {
        /* quota or private mode — the caller shows a toast */
    }
}
export const localStore = {
    list() {
        return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    get(id) {
        const found = readAll().find((p) => p.id === id);
        if (!found)
            return null;
        return { ...found, data: migrateProject(found.data).project };
    },
    save(id, name, data) {
        const items = readAll();
        const now = new Date().toISOString();
        const idx = items.findIndex((p) => p.id === id);
        const rec = {
            id,
            name,
            data,
            createdAt: idx >= 0 ? items[idx].createdAt : now,
            updatedAt: now,
        };
        if (idx >= 0)
            items[idx] = rec;
        else
            items.push(rec);
        writeAll(items);
        return rec;
    },
    remove(id) {
        writeAll(readAll().filter((p) => p.id !== id));
    },
    clear() {
        writeAll([]);
    },
};
