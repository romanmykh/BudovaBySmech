import { create } from 'zustand';
const THEME_KEY = 'budova.theme';
function initialTheme() {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark')
            return saved;
    }
    catch {
        /* private mode */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export const useUi = create((set) => ({
    theme: initialTheme(),
    view: 'schematic',
    mode: 'select',
    sidePanel: 'inspector',
    libraryOpen: true,
    inspectorOpen: true,
    showGrid: true,
    snap: true,
    showMinimap: true,
    drawRole: 'L1',
    drawCsa: 2.5,
    drawLength: 5,
    highlight: [],
    highlightWires: [],
    toast: null,
    dialog: null,
    setTheme: (t) => {
        document.documentElement.classList.toggle('dark', t === 'dark');
        try {
            localStorage.setItem(THEME_KEY, t);
        }
        catch {
            /* private mode */
        }
        set({ theme: t });
    },
    toggleTheme: () => set((s) => {
        const t = s.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.classList.toggle('dark', t === 'dark');
        try {
            localStorage.setItem(THEME_KEY, t);
        }
        catch {
            /* private mode */
        }
        return { theme: t };
    }),
    set: (k, v) => set({ [k]: v }),
    showToast: (text, kind = 'info') => {
        set({ toast: { text, kind } });
        window.setTimeout(() => set((s) => (s.toast?.text === text ? { toast: null } : {})), 3500);
    },
    setHighlight: (components, wires = []) => set({ highlight: components, highlightWires: wires }),
}));
// Apply the theme before the first paint of the app shell.
document.documentElement.classList.toggle('dark', useUi.getState().theme === 'dark');
