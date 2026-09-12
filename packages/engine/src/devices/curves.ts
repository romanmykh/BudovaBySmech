/**
 * Time–current characteristics of protective devices.
 *
 * The values are mid-band figures for devices complying with ČSN EN 60898-1 (MCB),
 * ČSN EN 61008/61009 (RCD/RCBO) and ČSN EN 60269 (fuses). They sit inside the
 * published tripping envelopes; the envelope limits themselves are exposed
 * separately so that the design rule check can reason about worst cases.
 */

export type McbCurve = 'B' | 'C' | 'D';

/** Magnetic (instantaneous) tripping range as multiples of In, ČSN EN 60898-1. */
export const MAGNETIC_RANGE: Record<McbCurve, [number, number]> = {
  B: [3, 5],
  C: [5, 10],
  D: [10, 20],
};

/** The multiple at which a typical device actually operates magnetically. */
export function magneticThreshold(curve: McbCurve): number {
  const [lo, hi] = MAGNETIC_RANGE[curve];
  return (lo + hi) / 2;
}

/**
 * Thermal region of the characteristic, shared by curves B/C/D
 * (the bimetal is the same, only the magnetic release differs).
 * Pairs of [multiple of In, typical operating time in seconds].
 */
const THERMAL: Array<[number, number]> = [
  [1.13, Infinity],
  [1.15, 7200],
  [1.2, 3600],
  [1.3, 1800],
  [1.45, 600],
  [1.6, 240],
  [1.8, 120],
  [2.0, 60],
  [2.55, 20],
  [3.0, 12],
  [4.0, 6],
  [5.0, 4],
  [6.0, 3],
  [8.0, 2],
  [10.0, 1.5],
  [13.0, 1.2],
  [20.0, 1.0],
];

/** Conventional non-tripping current — below this the device never operates. */
export const MCB_NON_TRIP_MULTIPLE = 1.13;
/** Conventional tripping current — must operate within the conventional time. */
export const MCB_TRIP_MULTIPLE = 1.45;

function logInterp(points: Array<[number, number]>, x: number): number {
  if (x <= points[0][0]) return Infinity;
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, t1] = points[i - 1];
    const [x2, t2] = points[i];
    if (x <= x2) {
      if (!Number.isFinite(t1)) {
        // First finite segment: approach infinity asymptotically at x1.
        const f = (x - x1) / (x2 - x1);
        if (f <= 0) return Infinity;
        return t2 / Math.max(1e-6, f);
      }
      const lx = Math.log(x / x1) / Math.log(x2 / x1);
      return Math.exp(Math.log(t1) + lx * (Math.log(t2) - Math.log(t1)));
    }
  }
  return last[1];
}

export interface McbTrip {
  /** Seconds until operation at this current; Infinity if it never operates. */
  time: number;
  region: 'none' | 'thermal' | 'magnetic';
}

/** Operating time of an MCB at `current` amperes. */
export function mcbTripTime(current: number, inA: number, curve: McbCurve): McbTrip {
  if (inA <= 0) return { time: Infinity, region: 'none' };
  const x = current / inA;
  const mag = magneticThreshold(curve);
  if (x >= mag) {
    // Instantaneous release: 3–10 ms including arc extinction.
    const t = Math.min(0.01, Math.max(0.0025, 0.01 * Math.pow(mag / x, 0.7)));
    return { time: t, region: 'magnetic' };
  }
  const t = logInterp(THERMAL, x);
  return { time: t, region: Number.isFinite(t) ? 'thermal' : 'none' };
}

/** Fuse pre-arcing + arcing time, gG characteristic (ČSN EN 60269-1). */
const FUSE_GG: Array<[number, number]> = [
  [1.25, Infinity],
  [1.3, 7200],
  [1.6, 1800],
  [1.9, 300],
  [2.0, 40],
  [2.5, 10],
  [3.0, 3],
  [4.0, 0.8],
  [5.0, 0.3],
  [6.0, 0.15],
  [8.0, 0.05],
  [10.0, 0.02],
  [15.0, 0.007],
  [20.0, 0.004],
];

/** NH knife-blade fuses are slower at low multiples and faster at very high ones. */
const FUSE_NH: Array<[number, number]> = [
  [1.25, Infinity],
  [1.3, 10800],
  [1.6, 3600],
  [2.0, 120],
  [2.5, 25],
  [3.0, 8],
  [4.0, 2],
  [5.0, 0.7],
  [6.0, 0.35],
  [8.0, 0.12],
  [10.0, 0.05],
  [15.0, 0.012],
  [20.0, 0.005],
];

export type FuseKind = 'gG' | 'D01' | 'D02' | 'NH';

export function fuseTripTime(current: number, inA: number, kind: FuseKind): number {
  if (inA <= 0) return Infinity;
  const x = current / inA;
  const table = kind === 'NH' ? FUSE_NH : FUSE_GG;
  return logInterp(table, x);
}

/* ------------------------------------------------------------------ */
/* RCD                                                                 */
/* ------------------------------------------------------------------ */

export type RcdType = 'AC' | 'A' | 'F' | 'B' | 'B+' | 'EV';
export type RcdDelay = 'instant' | 'S' | 'G';

/**
 * Shape of the residual current. A residual current can only operate an RCD
 * whose type is able to sense that waveform (ČSN EN 61008-1 / 62423).
 */
export type ResidualWaveform = 'ac' | 'pulsatingDC' | 'mixedFreq' | 'smoothDC';

const SENSES: Record<RcdType, ResidualWaveform[]> = {
  AC: ['ac'],
  A: ['ac', 'pulsatingDC'],
  F: ['ac', 'pulsatingDC', 'mixedFreq'],
  B: ['ac', 'pulsatingDC', 'mixedFreq', 'smoothDC'],
  'B+': ['ac', 'pulsatingDC', 'mixedFreq', 'smoothDC'],
  // Type "EV" / A-EV: type A plus a 6 mA smooth DC detector (ČSN EN 62955).
  EV: ['ac', 'pulsatingDC', 'smoothDC'],
};

export function rcdSenses(type: RcdType, wf: ResidualWaveform): boolean {
  return SENSES[type].includes(wf);
}

/** Smooth DC residual current that saturates the core of a type AC or A device. */
export const DC_BLINDING_THRESHOLD = 0.006; // 6 mA

export function rcdBlindedBy(type: RcdType, smoothDcAmps: number): boolean {
  if (type === 'B' || type === 'B+' || type === 'EV') return false;
  return smoothDcAmps > DC_BLINDING_THRESHOLD;
}

/** DC detection threshold of an EV-type device (ČSN EN 62955 RDC-DD). */
export const EV_DC_THRESHOLD = 0.006;

export interface RcdTiming {
  /** Typical operating time in seconds. */
  typical: number;
  /** Maximum permitted operating time in seconds. */
  max: number;
  /** Minimum non-actuating time (S and G types) in seconds. */
  minNonActuating: number;
}

/** Operating time of an RCD at a residual current of `i` amperes. */
export function rcdTripTime(i: number, idn: number, delay: RcdDelay = 'instant'): RcdTiming {
  if (idn <= 0) return { typical: Infinity, max: Infinity, minNonActuating: 0 };
  const x = i / idn;
  const pick = (at1: number, at2: number, at5: number): number => {
    if (x < 1) return at1 * 1.3;
    if (x < 2) return at1 + ((at2 - at1) * (x - 1)) / 1;
    if (x < 5) return at2 + ((at5 - at2) * (x - 2)) / 3;
    return at5;
  };
  if (delay === 'S') {
    return {
      typical: pick(0.2, 0.1, 0.06),
      max: pick(0.5, 0.2, 0.15),
      minNonActuating: pick(0.13, 0.06, 0.05),
    };
  }
  if (delay === 'G') {
    return {
      typical: pick(0.05, 0.035, 0.025),
      max: pick(0.3, 0.15, 0.04),
      minNonActuating: 0.01,
    };
  }
  return {
    typical: pick(0.025, 0.015, 0.009),
    max: pick(0.3, 0.15, 0.04),
    minNonActuating: 0,
  };
}

/**
 * Residual current at which the device actually operates. ČSN EN 61008-1 requires
 * operation between 0,5·IΔn and IΔn; real devices sit around 0,7·IΔn.
 */
export function rcdActualTripCurrent(idn: number): number {
  return 0.7 * idn;
}

/* ------------------------------------------------------------------ */
/* AFDD                                                                */
/* ------------------------------------------------------------------ */

/** Maximum arc-fault break times of ČSN EN 62606 at 230 V, by test current. */
const AFDD_LIMITS: Array<[number, number]> = [
  [2.5, 1.0],
  [5, 0.5],
  [10, 0.25],
  [16, 0.15],
  [32, 0.12],
  [63, 0.12],
];

/** Minimum arc current an AFDD can discriminate. */
export const AFDD_MIN_CURRENT = 2.5;

export function afddTripTime(current: number): number {
  if (current < AFDD_MIN_CURRENT) return Infinity;
  for (const [i, t] of AFDD_LIMITS) {
    if (current <= i) return t * 0.6; // typical device operates well inside the limit
  }
  return 0.07;
}

/* ------------------------------------------------------------------ */
/* Human body                                                          */
/* ------------------------------------------------------------------ */

/**
 * Effects of AC current on the human body, IEC/TS 60479-1 zones.
 * Returns the zone and the time before ventricular fibrillation becomes likely.
 */
export type BodyZone = 'none' | 'perception' | 'muscular' | 'severe' | 'fibrillation';

export interface BodyEffect {
  zone: BodyZone;
  /** Time in seconds after which ventricular fibrillation becomes probable (c2/c3 curve). */
  fibrillationTime: number;
  /** Whether the person can release their grip. */
  canLetGo: boolean;
}

export function bodyEffect(currentA: number): BodyEffect {
  const mA = currentA * 1000;
  if (mA < 0.5) return { zone: 'none', fibrillationTime: Infinity, canLetGo: true };
  if (mA < 10) return { zone: 'perception', fibrillationTime: Infinity, canLetGo: true };
  if (mA < 30) return { zone: 'muscular', fibrillationTime: Infinity, canLetGo: false };
  if (mA < 50) return { zone: 'severe', fibrillationTime: 5, canLetGo: false };
  // Curve c2 of IEC 60479-1: ~5 % probability of fibrillation.
  // Approximate body current / time boundary above 50 mA.
  const t = Math.max(0.04, 10 / Math.pow(mA / 50, 2.2));
  return { zone: 'fibrillation', fibrillationTime: t, canLetGo: false };
}

/**
 * Conventional touch voltage limit UL, ČSN 33 2000-4-41 ed. 3:
 * 50 V AC in normal conditions, 25 V AC in increased-risk locations.
 */
export const TOUCH_VOLTAGE_LIMIT = 50;
export const TOUCH_VOLTAGE_LIMIT_WET = 25;
