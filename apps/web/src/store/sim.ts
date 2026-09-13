import { create } from 'zustand';
import {
  Simulator, type Project, type SimResults, type SimEvent, type ActiveFault,
  runDesignRuleCheck, type RuleReport,
} from '@budova/engine';
import { useProject } from './project.js';

/**
 * The simulator instance lives outside the store: it is a mutable object with
 * its own device state, and putting it in React state would mean cloning it on
 * every tick. The store only publishes the results.
 */
let sim = new Simulator(useProject.getState().project);

export const SPEEDS = [0.25, 1, 5, 20, 60, 300, 1000] as const;

interface SimState {
  running: boolean;
  speed: number;
  results: SimResults;
  log: SimEvent[];
  faults: ActiveFault[];
  report: RuleReport | null;
  reportAt: number | null;
  tick: number;

  start(): void;
  stop(): void;
  toggle(): void;
  reset(): void;
  stepOnce(seconds: number): void;
  setSpeed(s: number): void;
  syncProject(p: Project): void;
  operate(compId: string, action: string, value?: unknown): void;
  addFault(f: ActiveFault): void;
  removeFault(id: string): void;
  clearFaults(): void;
  clearLog(): void;
  runCheck(): RuleReport;
  simulator(): Simulator;
}

let raf = 0;
let lastTs = 0;
let publishAcc = 0;

export const useSim = create<SimState>((set, get) => {
  const publish = () => {
    set({
      results: sim.results,
      log: sim.log.slice(-400),
      faults: [...sim.faults],
      tick: get().tick + 1,
    });
  };

  const frame = (ts: number) => {
    if (!get().running) return;
    const dtReal = lastTs ? Math.min(0.25, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    sim.step(dtReal * get().speed);
    publishAcc += dtReal;
    // Publishing at ~30 Hz keeps the UI responsive without re-rendering per solve.
    if (publishAcc >= 1 / 30) {
      publishAcc = 0;
      publish();
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    running: false,
    speed: 1,
    results: sim.solve(),
    log: [],
    faults: [],
    report: null,
    reportAt: null,
    tick: 0,

    start: () => {
      if (get().running) return;
      lastTs = 0;
      set({ running: true });
      raf = requestAnimationFrame(frame);
    },
    stop: () => {
      cancelAnimationFrame(raf);
      set({ running: false });
      publish();
    },
    toggle: () => (get().running ? get().stop() : get().start()),
    reset: () => {
      const wasRunning = get().running;
      get().stop();
      sim.clearFaults();
      sim.resetStates();
      sim.solve();
      publish();
      if (wasRunning) get().start();
    },
    stepOnce: (seconds) => {
      sim.step(seconds);
      publish();
    },
    setSpeed: (s) => set({ speed: s }),

    syncProject: (p) => {
      sim.setProject(p, true);
      sim.solve();
      publish();
    },

    operate: (compId, action, value) => {
      sim.operate(compId, action, value);
      sim.solve();
      publish();
    },

    addFault: (f) => {
      sim.addFault(f);
      sim.solve();
      publish();
    },
    removeFault: (id) => {
      sim.removeFault(id);
      sim.solve();
      publish();
    },
    clearFaults: () => {
      sim.clearFaults();
      sim.solve();
      publish();
    },
    clearLog: () => {
      sim.clearLog();
      publish();
    },

    runCheck: () => {
      const report = runDesignRuleCheck(useProject.getState().project);
      set({ report, reportAt: Date.now() });
      return report;
    },

    simulator: () => sim,
  };
});

/** Keep the simulator in step with edits to the project. */
let syncTimer = 0;
useProject.subscribe((state, prev) => {
  if (state.project === prev.project) return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => useSim.getState().syncProject(state.project), 30);
});

export function replaceSimulator(p: Project): void {
  sim = new Simulator(p);
  sim.solve();
  useSim.setState({ results: sim.results, log: [], faults: [], tick: Date.now() });
}
