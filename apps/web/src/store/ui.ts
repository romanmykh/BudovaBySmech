import { create } from 'zustand';

export type EditorMode = 'select' | 'wire' | 'pan' | 'text';
export type MainView = 'schematic' | 'panel' | 'report';
export type SidePanel = 'inspector' | 'faults' | 'log' | 'instruments';

const THEME_KEY = 'budova.theme';

function initialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* private mode */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface UiState {
  theme: 'light' | 'dark';
  view: MainView;
  mode: EditorMode;
  sidePanel: SidePanel;
  libraryOpen: boolean;
  inspectorOpen: boolean;
  showGrid: boolean;
  snap: boolean;
  showMinimap: boolean;
  /** Conductor role and size used when drawing new wires. */
  drawRole: string;
  drawCsa: number;
  drawLength: number;
  /** Components highlighted by a report finding. */
  highlight: string[];
  highlightWires: string[];
  toast: { text: string; kind: 'info' | 'error' } | null;
  dialog: null | 'auth' | 'projects' | 'templates' | 'shortcuts' | 'settings' | 'export';
  setTheme(t: 'light' | 'dark'): void;
  toggleTheme(): void;
  set<K extends keyof UiState>(k: K, v: UiState[K]): void;
  showToast(text: string, kind?: 'info' | 'error'): void;
  setHighlight(components: string[], wires?: string[]): void;
}

export const useUi = create<UiState>((set) => ({
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
    } catch {
      /* private mode */
    }
    set({ theme: t });
  },
  toggleTheme: () =>
    set((s) => {
      const t = s.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', t === 'dark');
      try {
        localStorage.setItem(THEME_KEY, t);
      } catch {
        /* private mode */
      }
      return { theme: t };
    }),
  set: (k, v) => set({ [k]: v } as any),
  showToast: (text, kind = 'info') => {
    set({ toast: { text, kind } });
    window.setTimeout(() => set((s) => (s.toast?.text === text ? { toast: null } : {})), 3500);
  },
  setHighlight: (components, wires = []) => set({ highlight: components, highlightWires: wires }),
}));

// Apply the theme before the first paint of the app shell.
document.documentElement.classList.toggle('dark', useUi.getState().theme === 'dark');
