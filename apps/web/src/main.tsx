import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n/index.js';
import './index.css';
import { App } from './App.js';
import { useProject } from './store/project.js';
import { replaceSimulator } from './store/sim.js';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
