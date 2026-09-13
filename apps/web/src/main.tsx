import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n/index.js';
import './index.css';
import { App } from './App.js';
import { useProject } from './store/project.js';
import { replaceSimulator, useSim } from './store/sim.js';
import { useUi } from './store/ui.js';
import { useAuth } from './store/auth.js';
import { houseBoard } from '@budova/engine';
import { localStore } from './storage/local.js';

/**
 * Open the most recent local project on start, or the family house template so
 * that the tool is immediately useful rather than showing an empty page.
 */
function bootstrap(): void {
  const recent = localStore.list()[0];
  if (recent) {
    useProject.getState().loadProject(recent.data, recent.id, 'local');
    replaceSimulator(recent.data);
  } else {
    const p = houseBoard();
    useProject.getState().loadProject(p, null, 'local');
    replaceSimulator(p);
  }
}

bootstrap();

// Development convenience: the stores are reachable from the browser console,
// which is also what the browser-driven tests use to inspect state.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).budova = {
    project: useProject,
    sim: useSim,
    ui: useUi,
    auth: useAuth,
    localStore,
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
