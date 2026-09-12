import type { ConductorMaterial, InstallMethod, Csa } from '../schema.js';

/**
 * Conductor data and current-carrying capacity.
 *
 * Resistivity at 20 °C (Ω·mm²/m). The value used in a calculation is corrected to the
 * conductor operating temperature — 70 °C for PVC insulated cable, which is the basis
 * of the loop impedance figures used for disconnection-time checks.
 */
export const RHO_20: Record<ConductorMaterial, number> = {
  Cu: 0.017241,
  Al: 0.028264,
};

/** Temperature coefficient of resistance per K at 20 °C. */
export const ALPHA: Record<ConductorMaterial, number> = {
  Cu: 0.00393,
  Al: 0.00403,
};

/** Reactance of small installation cables, Ω/m (≈0.08 mΩ/m; negligible below 16 mm²). */
export function reactancePerMetre(csa: Csa): number {
  if (csa <= 16) return 0.00008;
  if (csa <= 35) return 0.000085;
  return 0.00009;
}

export function resistivityAt(material: ConductorMaterial, tempC: number): number {
  return RHO_20[material] * (1 + ALPHA[material] * (tempC - 20));
}

/** DC/AC resistance of a single conductor run of `length` metres. */
export function conductorResistance(
  lengthM: number,
  csa: Csa,
  material: ConductorMaterial,
  tempC = 70,
): number {
  if (csa <= 0) return 1e6;
  return (resistivityAt(material, tempC) * Math.max(0, lengthM)) / csa;
}

export function conductorReactance(lengthM: number, csa: Csa): number {
  return reactancePerMetre(csa) * Math.max(0, lengthM);
}

/**
 * Current-carrying capacity Iz in amperes for copper, PVC insulation, 30 °C ambient.
 * Table values follow ČSN 33 2000-5-52 ed. 2 (IEC 60364-5-52 table B.52.x).
 * [installation method][number of loaded conductors 2|3][csa]
 */
const AMPACITY_CU: Record<InstallMethod, Record<2 | 3, Partial<Record<number, number>>>> = {
  A1: {
    2: { 1: 11, 1.5: 14.5, 2.5: 19.5, 4: 26, 6: 34, 10: 46, 16: 61, 25: 80, 35: 99, 50: 119 },
    3: { 1: 10, 1.5: 13.5, 2.5: 18, 4: 24, 6: 31, 10: 42, 16: 56, 25: 73, 35: 89, 50: 108 },
  },
  A2: {
    2: { 1: 11, 1.5: 14, 2.5: 18.5, 4: 25, 6: 32, 10: 43, 16: 57, 25: 75, 35: 92, 50: 110 },
    3: { 1: 10, 1.5: 13, 2.5: 17.5, 4: 23, 6: 29, 10: 39, 16: 52, 25: 68, 35: 83, 50: 99 },
  },
  B1: {
    2: { 1: 13.5, 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 101, 35: 125, 50: 151 },
    3: { 1: 12, 1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 110, 50: 134 },
  },
  B2: {
    2: { 1: 13, 1.5: 16.5, 2.5: 23, 4: 30, 6: 38, 10: 52, 16: 69, 25: 90, 35: 111, 50: 133 },
    3: { 1: 11.5, 1.5: 15, 2.5: 20, 4: 27, 6: 34, 10: 46, 16: 62, 25: 80, 35: 99, 50: 118 },
  },
  C: {
    2: { 1: 15.5, 1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 112, 35: 138, 50: 168 },
    3: { 1: 13.5, 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 96, 35: 119, 50: 144 },
  },
  E: {
    2: { 1: 18, 1.5: 22, 2.5: 30, 4: 40, 6: 51, 10: 70, 16: 94, 25: 119, 35: 148, 50: 180 },
    3: { 1: 16.5, 1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 110, 35: 137, 50: 167 },
  },
};

/** Ambient temperature correction factor for PVC insulation (30 °C reference). */
const TEMP_FACTORS: Array<[number, number]> = [
  [10, 1.22], [15, 1.17], [20, 1.12], [25, 1.06], [30, 1.0],
  [35, 0.94], [40, 0.87], [45, 0.79], [50, 0.71], [55, 0.61], [60, 0.5],
];

export function ambientFactor(tempC: number): number {
  if (tempC <= TEMP_FACTORS[0][0]) return TEMP_FACTORS[0][1];
  const last = TEMP_FACTORS[TEMP_FACTORS.length - 1];
  if (tempC >= last[0]) return last[1];
  for (let i = 1; i < TEMP_FACTORS.length; i++) {
    const [t1, f1] = TEMP_FACTORS[i - 1];
    const [t2, f2] = TEMP_FACTORS[i];
    if (tempC <= t2) return f1 + ((f2 - f1) * (tempC - t1)) / (t2 - t1);
  }
  return 1;
}

export interface AmpacityQuery {
  csa: Csa;
  material: ConductorMaterial;
  method: InstallMethod;
  loadedConductors?: 2 | 3;
  ambientTemp?: number;
  groupingFactor?: number;
}

/** Corrected current-carrying capacity Iz (A). */
export function ampacity(q: AmpacityQuery): number {
  const lc = q.loadedConductors ?? 2;
  const table = AMPACITY_CU[q.method] ?? AMPACITY_CU.B2;
  let base = table[lc][q.csa];
  if (base === undefined) {
    // Interpolate on the nearest tabulated sizes for non-standard cross-sections.
    const sizes = Object.keys(table[lc]).map(Number).sort((a, b) => a - b);
    const lower = [...sizes].reverse().find((s) => s <= q.csa);
    const upper = sizes.find((s) => s >= q.csa);
    if (lower !== undefined && upper !== undefined && lower !== upper) {
      const fl = table[lc][lower]!;
      const fu = table[lc][upper]!;
      base = fl + ((fu - fl) * (q.csa - lower)) / (upper - lower);
    } else if (lower !== undefined) base = table[lc][lower]!;
    else if (upper !== undefined) base = table[lc][upper]!;
    else base = 10;
  }
  // Aluminium carries roughly 78 % of the copper value at equal cross-section.
  const matF = q.material === 'Al' ? 0.78 : 1;
  return base * matF * ambientFactor(q.ambientTemp ?? 30) * (q.groupingFactor ?? 1);
}

/** Minimum cross-section for a role, per ČSN 33 2130 ed. 3 indoor wiring practice. */
export const MIN_CSA = {
  lighting: 1.5,
  socket: 2.5,
  cooker: 4,
  evse: 2.5,
};

/**
 * Cross-section of the protective conductor per ČSN 33 2000-5-54,
 * for a line conductor of cross-section S (same material).
 */
export function minPeCsa(lineCsa: Csa): number {
  if (lineCsa <= 16) return lineCsa;
  if (lineCsa <= 35) return 16;
  return lineCsa / 2;
}

/** Next standard cross-section at or above the given value. */
export function nextCsa(v: number): number {
  const sizes = [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95];
  return sizes.find((s) => s >= v) ?? 95;
}
