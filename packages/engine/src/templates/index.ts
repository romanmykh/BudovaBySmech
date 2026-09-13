/**
 * Ready-made starting projects. Every template is a complete, wired,
 * simulatable installation, not a picture.
 */
import type { Project } from '../schema.js';
import { ProjectBuilder } from '../build.js';

export interface TemplateDef {
  id: string;
  /** i18n key: `template.<id>.name` / `.desc`. */
  category: 'board' | 'teaching';
  build: () => Project;
}

/** Supply, main earthing terminal and the N/PE bars every board starts with. */
function origin(b: ProjectBuilder, opts: { phases: 1 | 3; main: number; system?: 'TN-C-S' | 'TN-S' } = { phases: 3, main: 25 }) {
  const system = opts.system ?? 'TN-C-S';
  b.settings({ system, premises: 'dwelling' });
  b.add('supply', 's1', { system, phases: opts.phases, voltageLN: 230, ipk: 3000, rb: 2 }, { x: 40, y: 20, label: 'Přípojka' });
  b.add('mainEarthBar', 'hop', { ways: 6 }, { x: 520, y: 30, label: 'HOP' });
  b.add('earthElectrode', 'zem', { ra: 10 }, { x: 760, y: 110 });
  b.add('nBar', 'nb', { ways: 12 }, { x: 300, y: 560, label: 'N' });
  b.add('peBar', 'pb', { ways: 12 }, { x: 560, y: 560, label: 'PE' });

  const lines = opts.phases === 3 ? ['L1', 'L2', 'L3'] : ['L1'];
  b.add(
    'mainBreaker',
    'hj',
    { inA: opts.main, curve: 'B', poles: opts.phases === 3 ? '3P' : '1P', icn: 10000 },
    { x: 40, y: 120, label: 'HJ', panel: { enclosureId: 'e1', row: 1, slot: 0 } },
  );
  lines.forEach((ph, i) => {
    b.wire(`s1.${ph}`, `hj.in.${opts.phases === 3 ? ph : 'L'}`, ph as any, 10, 6);
  });
  if (system === 'TN-C-S') {
    // The PEN arrives at the main earthing terminal and is split there.
    b.wire('s1.PEN', 'hop.pen', 'PEN', 10, 6);
    b.wire('hop.n', 'nb.t1', 'N', 10, 1);
  } else {
    b.wire('s1.N', 'nb.t1', 'N', 10, 6);
    b.wire('s1.PE', 'hop.t1', 'PE', 10, 6);
  }
  b.wire('hop.t2', 'pb.t1', 'PE', 10, 1);
  b.wire('hop.t3', 'zem.pe', 'PE', 16, 3);
  return { lines };
}

/* ------------------------------------------------------------------ */
/* Teaching circuits                                                   */
/* ------------------------------------------------------------------ */

export function lampOneWay(): Project {
  const b = new ProjectBuilder('Světlo s vypínačem řazení 1', 'tpl-lamp1');
  origin(b, { phases: 1, main: 25 });
  b.circuit('c1', 'Světlo', 'lighting', '#f0b429');
  b.add('mcb', 'q1', { inA: 10, curve: 'B', poles: '1P' }, { x: 40, y: 240, label: 'F1', circuit: 'c1' });
  b.add('switch1', 'sw1', {}, { x: 200, y: 420, label: 'S1', circuit: 'c1' });
  b.add('lampE27', 'la1', { watts: 60, classI: false }, { x: 200, y: 280, label: 'E1', circuit: 'c1' });
  b.wire('hj.out.L', 'q1.in.L', 'L1', 10, 0.5);
  b.wire('q1.out.L', 'sw1.c1', 'L1', 1.5, 9, { circuit: 'c1' });
  b.wire('sw1.c1.t1', 'la1.in.L', 'L1', 1.5, 3, { circuit: 'c1' });
  b.wire('nb.t2', 'la1.in.N', 'N', 1.5, 12, { circuit: 'c1' });
  b.wire('pb.t2', 'la1.in.PE', 'PE', 1.5, 12, { circuit: 'c1' });
  return b.build();
}

export function stairway(): Project {
  const b = new ProjectBuilder('Schodišťové zapojení 6+6', 'tpl-stair');
  origin(b, { phases: 1, main: 25 });
  b.circuit('c1', 'Schodiště', 'lighting', '#f0b429');
  b.add('mcb', 'q1', { inA: 10, curve: 'B', poles: '1P' }, { x: 40, y: 240, label: 'F1', circuit: 'c1' });
  b.add('switch6', 'sw1', {}, { x: 160, y: 440, label: 'S1', circuit: 'c1' });
  b.add('switch6', 'sw2', {}, { x: 360, y: 440, label: 'S2', circuit: 'c1' });
  b.add('lampE27', 'la1', { watts: 60, classI: false }, { x: 260, y: 260, label: 'E1', circuit: 'c1' });
  b.add('lampE27', 'la2', { watts: 60, classI: false }, { x: 360, y: 260, label: 'E2', circuit: 'c1' });
  b.wire('hj.out.L', 'q1.in.L', 'L1', 10, 0.5);
  b.wire('q1.out.L', 'sw1.c1', 'L1', 1.5, 10, { circuit: 'c1' });
  b.wire('sw1.c1.t1', 'sw2.c1.t1', 'L1', 1.5, 6, { circuit: 'c1' });
  b.wire('sw1.c1.t2', 'sw2.c1.t2', 'L1', 1.5, 6, { circuit: 'c1' });
  b.wire('sw2.c1', 'la1.in.L', 'L1', 1.5, 4, { circuit: 'c1' });
  b.wire('la1.in.L', 'la2.in.L', 'L1', 1.5, 1.5, { circuit: 'c1' });
  b.wire('nb.t2', 'la1.in.N', 'N', 1.5, 14, { circuit: 'c1' });
  b.wire('la1.in.N', 'la2.in.N', 'N', 1.5, 1.5, { circuit: 'c1' });
  b.wire('pb.t2', 'la1.in.PE', 'PE', 1.5, 14, { circuit: 'c1' });
  return b.build();
}

export function intermediate(): Project {
  const b = new ProjectBuilder('Křížový přepínač řazení 7', 'tpl-inter');
  origin(b, { phases: 1, main: 25 });
  b.circuit('c1', 'Chodba', 'lighting', '#f0b429');
  b.add('mcb', 'q1', { inA: 10, curve: 'B', poles: '1P' }, { x: 40, y: 240, label: 'F1', circuit: 'c1' });
  b.add('switch6', 'sw1', {}, { x: 140, y: 460, label: 'S1', circuit: 'c1' });
  b.add('switch7', 'sw2', {}, { x: 280, y: 460, label: 'S2', circuit: 'c1' });
  b.add('switch6', 'sw3', {}, { x: 440, y: 460, label: 'S3', circuit: 'c1' });
  b.add('lampE27', 'la1', { watts: 60, classI: false }, { x: 340, y: 260, label: 'E1', circuit: 'c1' });
  b.wire('hj.out.L', 'q1.in.L', 'L1', 10, 0.5);
  b.wire('q1.out.L', 'sw1.c1', 'L1', 1.5, 10, { circuit: 'c1' });
  b.wire('sw1.c1.t1', 'sw2.in1', 'L1', 1.5, 5, { circuit: 'c1' });
  b.wire('sw1.c1.t2', 'sw2.in2', 'L1', 1.5, 5, { circuit: 'c1' });
  b.wire('sw2.out1', 'sw3.c1.t1', 'L1', 1.5, 5, { circuit: 'c1' });
  b.wire('sw2.out2', 'sw3.c1.t2', 'L1', 1.5, 5, { circuit: 'c1' });
  b.wire('sw3.c1', 'la1.in.L', 'L1', 1.5, 4, { circuit: 'c1' });
  b.wire('nb.t2', 'la1.in.N', 'N', 1.5, 16, { circuit: 'c1' });
  b.wire('pb.t2', 'la1.in.PE', 'PE', 1.5, 16, { circuit: 'c1' });
  return b.build();
}

export function impulseLighting(): Project {
  const b = new ProjectBuilder('Osvětlení s impulzním relé', 'tpl-impulse');
  origin(b, { phases: 1, main: 25 });
  b.circuit('c1', 'Osvětlení', 'lighting', '#f0b429');
  b.add('mcb', 'q1', { inA: 10, curve: 'B', poles: '1P' }, { x: 40, y: 240, label: 'F1', circuit: 'c1' });
  b.add('impulseRelay', 'ri1', { coilV: 230 }, { x: 160, y: 240, label: 'RI', circuit: 'c1' });
  b.add('button', 'b1', {}, { x: 160, y: 460, label: 'T1', circuit: 'c1' });
  b.add('button', 'b2', {}, { x: 280, y: 460, label: 'T2', circuit: 'c1' });
  b.add('ledPanel', 'la1', { watts: 36 }, { x: 380, y: 260, label: 'E1', circuit: 'c1' });
  b.wire('hj.out.L', 'q1.in.L', 'L1', 10, 0.5);
  b.wire('q1.out.L', 'ri1.in.L', 'L1', 1.5, 2, { circuit: 'c1' });
  b.wire('q1.out.L', 'b1.c1', 'L1', 1.5, 8, { circuit: 'c1' });
  b.wire('q1.out.L', 'b2.c1', 'L1', 1.5, 12, { circuit: 'c1' });
  b.wire('b1.c1.t1', 'ri1.A1', 'L1', 1.5, 8, { circuit: 'c1' });
  b.wire('b2.c1.t1', 'ri1.A1', 'L1', 1.5, 12, { circuit: 'c1' });
  b.wire('nb.t2', 'ri1.A2', 'N', 1.5, 2, { circuit: 'c1' });
  b.wire('ri1.out.L', 'la1.in.L', 'L1', 1.5, 10, { circuit: 'c1' });
  b.wire('nb.t3', 'la1.in.N', 'N', 1.5, 10, { circuit: 'c1' });
  b.wire('pb.t2', 'la1.in.PE', 'PE', 1.5, 10, { circuit: 'c1' });
  return b.build();
}

export function contactorMotor(): Project {
  const b = new ProjectBuilder('Motor ovládaný stykačem', 'tpl-motor');
  origin(b, { phases: 3, main: 32 });
  b.circuit('c1', 'Motor', 'motor', '#7c5cbf');
  b.add('mcb', 'q1', { inA: 16, curve: 'C', poles: '3P' }, { x: 40, y: 240, label: 'F1', circuit: 'c1' });
  b.add('contactor', 'km1', { poles: '3P', coilV: 230, inA: 25 }, { x: 200, y: 240, label: 'KM1', circuit: 'c1' });
  b.add('overloadRelay', 'f2', { setA: 5, class: 10 }, { x: 200, y: 360, label: 'F2', circuit: 'c1' });
  b.add('button', 'bs', { nc: true }, { x: 420, y: 300, label: 'STOP', circuit: 'c1' });
  b.add('button', 'bo', {}, { x: 520, y: 300, label: 'START', circuit: 'c1' });
  b.add('motor3f', 'm1', { watts: 2200, pf: 0.82 }, { x: 200, y: 480, label: 'M1', circuit: 'c1' });
  for (const ph of ['L1', 'L2', 'L3'] as const) {
    b.wire(`hj.out.${ph}`, `q1.in.${ph}`, ph, 6, 1);
    b.wire(`q1.out.${ph}`, `km1.in.${ph}`, ph, 2.5, 1, { circuit: 'c1' });
    b.wire(`km1.out.${ph}`, `f2.in.${ph}`, ph, 2.5, 0.5, { circuit: 'c1' });
    b.wire(`f2.out.${ph}`, `m1.in.${ph}`, ph, 2.5, 12, { circuit: 'c1' });
  }
  b.wire('nb.t2', 'm1.in.N', 'N', 2.5, 12, { circuit: 'c1' });
  b.wire('pb.t2', 'm1.in.PE', 'PE', 2.5, 12, { circuit: 'c1' });
  // Control circuit: start/stop with the overload relay contact in series.
  b.wire('q1.out.L1', 'bs.c1', 'L1', 1.5, 4, { circuit: 'c1' });
  b.wire('bs.c1.t1', 'bo.c1', 'L1', 1.5, 1, { circuit: 'c1' });
  b.wire('bo.c1.t1', 'f2.nc.1', 'L1', 1.5, 2, { circuit: 'c1' });
  b.wire('f2.nc.2', 'km1.A1', 'L1', 1.5, 2, { circuit: 'c1' });
  b.wire('nb.t3', 'km1.A2', 'N', 1.5, 2, { circuit: 'c1' });
  return b.build();
}

/* ------------------------------------------------------------------ */
/* Boards                                                              */
/* ------------------------------------------------------------------ */

export function socketCircuitDemo(): Project {
  const b = new ProjectBuilder('Zásuvkový obvod s chráničem', 'tpl-socket');
  origin(b, { phases: 3, main: 25 });
  b.circuit('c1', 'Zásuvky', 'socket', '#2f8fd0');
  b.enclosure({ id: 'e1', name: 'RD', rows: 2, modulesPerRow: 12, mount: 'flush', ip: 'IP40', x: 0, y: 0, door: true });
  b.add('rcd', 'rc1', { inA: 40, idn: 30, rcdType: 'A', poles: '4P' }, { x: 40, y: 240, label: 'RCD1', panel: { enclosureId: 'e1', row: 1, slot: 4 } });
  b.add('mcb', 'q1', { inA: 16, curve: 'B', poles: '1P' }, { x: 220, y: 360, label: 'F1', circuit: 'c1', panel: { enclosureId: 'e1', row: 2, slot: 0 } });
  b.add('socket16', 'z1', { inA: 16, outlets: 2, pluggedW: 3000, plugged: false }, { x: 220, y: 500, label: 'Z1', circuit: 'c1' });
  for (const ph of ['L1', 'L2', 'L3'] as const) b.wire(`hj.out.${ph}`, `rc1.in.${ph}`, ph, 10, 0.5);
  b.wire('nb.t2', 'rc1.in.N', 'N', 10, 0.5);
  b.wire('rc1.out.L1', 'q1.in.L', 'L1', 10, 0.3, { circuit: 'c1' });
  b.wire('q1.out.L', 'z1.in.L', 'L1', 2.5, 15, { circuit: 'c1', installMethod: 'B2' });
  b.wire('rc1.out.N', 'z1.in.N', 'N', 2.5, 15, { circuit: 'c1', installMethod: 'B2' });
  b.wire('pb.t2', 'z1.in.PE', 'PE', 2.5, 15, { circuit: 'c1', installMethod: 'B2' });
  return b.build();
}

export function houseBoard(): Project {
  const b = new ProjectBuilder('Rodinný dům 3+1', 'tpl-house');
  origin(b, { phases: 3, main: 25 });
  b.enclosure({ id: 'e1', name: 'RD 4×12', rows: 4, modulesPerRow: 12, mount: 'flush', ip: 'IP40', x: 0, y: 0, door: true });
  b.add('meter', 'em', { phases: 3, tariff: 'dual' }, { x: 200, y: 120, label: 'EM', panel: { enclosureId: 'e1', row: 1, slot: 3 } });
  b.add('spd', 'spd', { spdType: 'T1+T2', poles: '3P+N' }, { x: 820, y: 250, label: 'SPD', panel: { enclosureId: 'e1', row: 2, slot: 0 } });

  b.circuit('c1', 'Světla', 'lighting', '#f0b429');
  b.circuit('c2', 'Zásuvky', 'socket', '#2f8fd0');
  b.circuit('c3', 'Sporák', 'cooker', '#d0472f');
  b.circuit('c4', 'Bojler', 'boiler', '#d07a2f');
  b.circuit('c5', 'Wallbox', 'evse', '#2fb37a');

  b.add('rcbo', 'f1', { inA: 10, curve: 'B', idn: 30, rcdType: 'A', poles: '1P+N' }, { x: 40, y: 340, label: 'F1', circuit: 'c1', panel: { enclosureId: 'e1', row: 3, slot: 0 } });
  b.add('rcbo', 'f2', { inA: 16, curve: 'B', idn: 30, rcdType: 'A', poles: '1P+N' }, { x: 200, y: 340, label: 'F2', circuit: 'c2', panel: { enclosureId: 'e1', row: 3, slot: 2 } });
  b.add('rcbo', 'f3', { inA: 16, curve: 'B', idn: 30, rcdType: 'A', poles: '3P+N' }, { x: 360, y: 340, label: 'F3', circuit: 'c3', panel: { enclosureId: 'e1', row: 2, slot: 4 } });
  b.add('rcbo', 'f4', { inA: 16, curve: 'B', idn: 30, rcdType: 'A', poles: '1P+N' }, { x: 560, y: 340, label: 'F4', circuit: 'c4', panel: { enclosureId: 'e1', row: 3, slot: 4 } });
  b.add('rcbo', 'f5', { inA: 20, curve: 'B', idn: 30, rcdType: 'EV', poles: '3P+N' }, { x: 700, y: 340, label: 'F5', circuit: 'c5', panel: { enclosureId: 'e1', row: 2, slot: 8 } });

  // The large appliances start switched off — a real board is not loaded to
  // 20 kW the moment it is energised.
  b.add('ledPanel', 'la1', { watts: 36 }, { x: 40, y: 700, label: 'E1', circuit: 'c1', location: 'obývací pokoj' });
  b.add('switch1', 'sw1', {}, { x: 40, y: 820, label: 'S1', circuit: 'c1' });
  b.add('socket16', 'z1', { outlets: 2, pluggedW: 2000, plugged: false }, { x: 200, y: 700, label: 'Z1', circuit: 'c2' });
  b.add('cooker3f', 'sp1', { watts: 7000, wL1: 3000, wL2: 2500, wL3: 1500, on: false }, { x: 360, y: 700, label: 'Sporák', circuit: 'c3' });
  b.add('boiler', 'bo1', { watts: 2000, on: false }, { x: 560, y: 700, label: 'Bojler', circuit: 'c4' });
  b.add('evse', 'ev1', { phases: 3, powerKw: 11, chargingA: 16, on: false }, { x: 700, y: 700, label: 'Wallbox', circuit: 'c5' });

  for (const ph of ['L1', 'L2', 'L3'] as const) {
    b.wire(`hj.out.${ph}`, `em.in.${ph}`, ph, 10, 1);
    b.wire(`em.out.${ph}`, `spd.in.${ph}`, ph, 10, 1);
  }
  b.wire('nb.t2', 'em.in.N', 'N', 10, 1);
  b.wire('em.out.N', 'spd.in.N', 'N', 10, 1);
  b.wire('pb.t3', 'spd.PE', 'PE', 6, 1);

  // Lighting and sockets on L1 / L2, cooker and wallbox three-phase.
  b.wire('em.out.L1', 'f1.in.L', 'L1', 10, 0.4, { circuit: 'c1' });
  b.wire('nb.t3', 'f1.in.N', 'N', 10, 0.4, { circuit: 'c1' });
  b.wire('em.out.L2', 'f2.in.L', 'L2', 10, 0.4, { circuit: 'c2' });
  b.wire('nb.t4', 'f2.in.N', 'N', 10, 0.4, { circuit: 'c2' });
  for (const ph of ['L1', 'L2', 'L3'] as const) {
    b.wire(`em.out.${ph}`, `f3.in.${ph}`, ph, 10, 0.4, { circuit: 'c3' });
    b.wire(`em.out.${ph}`, `f5.in.${ph}`, ph, 10, 0.4, { circuit: 'c5' });
  }
  b.wire('nb.t5', 'f3.in.N', 'N', 10, 0.4, { circuit: 'c3' });
  b.wire('em.out.L3', 'f4.in.L', 'L3', 10, 0.4, { circuit: 'c4' });
  b.wire('nb.t6', 'f4.in.N', 'N', 10, 0.4, { circuit: 'c4' });
  b.wire('nb.t7', 'f5.in.N', 'N', 10, 0.4, { circuit: 'c5' });

  b.wire('f1.out.L', 'sw1.c1', 'L1', 1.5, 12, { circuit: 'c1' });
  b.wire('sw1.c1.t1', 'la1.in.L', 'L1', 1.5, 4, { circuit: 'c1' });
  b.wire('f1.out.N', 'la1.in.N', 'N', 1.5, 16, { circuit: 'c1' });
  b.wire('pb.t4', 'la1.in.PE', 'PE', 1.5, 16, { circuit: 'c1' });

  b.wire('f2.out.L', 'z1.in.L', 'L2', 2.5, 18, { circuit: 'c2' });
  b.wire('f2.out.N', 'z1.in.N', 'N', 2.5, 18, { circuit: 'c2' });
  b.wire('pb.t5', 'z1.in.PE', 'PE', 2.5, 18, { circuit: 'c2' });

  for (const ph of ['L1', 'L2', 'L3'] as const) b.wire(`f3.out.${ph}`, `sp1.in.${ph}`, ph, 4, 8, { circuit: 'c3' });
  b.wire('f3.out.N', 'sp1.in.N', 'N', 4, 8, { circuit: 'c3' });
  b.wire('pb.t6', 'sp1.in.PE', 'PE', 4, 8, { circuit: 'c3' });

  b.wire('f4.out.L', 'bo1.in.L', 'L3', 2.5, 10, { circuit: 'c4' });
  b.wire('f4.out.N', 'bo1.in.N', 'N', 2.5, 10, { circuit: 'c4' });
  b.wire('pb.t7', 'bo1.in.PE', 'PE', 2.5, 10, { circuit: 'c4' });

  for (const ph of ['L1', 'L2', 'L3'] as const) b.wire(`f5.out.${ph}`, `ev1.in.${ph}`, ph, 4, 14, { circuit: 'c5' });
  b.wire('f5.out.N', 'ev1.in.N', 'N', 4, 14, { circuit: 'c5' });
  b.wire('pb.t8', 'ev1.in.PE', 'PE', 4, 14, { circuit: 'c5' });
  return b.build();
}

export function flatBoard(): Project {
  const b = new ProjectBuilder('Byt 2+kk', 'tpl-flat');
  origin(b, { phases: 1, main: 25 });
  b.enclosure({ id: 'e1', name: 'Bytová rozvodnice', rows: 2, modulesPerRow: 12, mount: 'flush', ip: 'IP40', x: 0, y: 0, door: true });
  b.circuit('c1', 'Světla', 'lighting', '#f0b429');
  b.circuit('c2', 'Zásuvky pokoje', 'socket', '#2f8fd0');
  b.circuit('c3', 'Kuchyň', 'socket', '#2f6fd0');
  b.circuit('c4', 'Pračka', 'appliance', '#8f5cbf');
  b.add('rcd', 'rc1', { inA: 40, idn: 30, rcdType: 'A', poles: '2P' }, { x: 40, y: 240, label: 'RCD1', panel: { enclosureId: 'e1', row: 1, slot: 2 } });
  b.add('mcb', 'f1', { inA: 10, curve: 'B', poles: '1P' }, { x: 200, y: 360, label: 'F1', circuit: 'c1', panel: { enclosureId: 'e1', row: 1, slot: 5 } });
  b.add('mcb', 'f2', { inA: 16, curve: 'B', poles: '1P' }, { x: 300, y: 360, label: 'F2', circuit: 'c2', panel: { enclosureId: 'e1', row: 1, slot: 6 } });
  b.add('mcb', 'f3', { inA: 16, curve: 'B', poles: '1P' }, { x: 400, y: 360, label: 'F3', circuit: 'c3', panel: { enclosureId: 'e1', row: 1, slot: 7 } });
  b.add('mcb', 'f4', { inA: 16, curve: 'B', poles: '1P' }, { x: 500, y: 360, label: 'F4', circuit: 'c4', panel: { enclosureId: 'e1', row: 1, slot: 8 } });
  b.add('ledPanel', 'la1', { watts: 36 }, { x: 200, y: 560, label: 'E1', circuit: 'c1' });
  b.add('switch1', 'sw1', {}, { x: 200, y: 680, label: 'S1', circuit: 'c1' });
  b.add('socket16', 'z1', { outlets: 2 }, { x: 300, y: 560, label: 'Z1', circuit: 'c2' });
  b.add('socket16', 'z2', { outlets: 2 }, { x: 400, y: 560, label: 'Z2', circuit: 'c3' });
  b.add('washingMachine', 'pr1', { watts: 2200 }, { x: 500, y: 560, label: 'Pračka', circuit: 'c4' });
  b.wire('hj.out.L', 'rc1.in.L', 'L1', 10, 0.5);
  b.wire('nb.t2', 'rc1.in.N', 'N', 10, 0.5);
  for (const [f, c] of [['f1', 'c1'], ['f2', 'c2'], ['f3', 'c3'], ['f4', 'c4']] as const) {
    b.wire('rc1.out.L', `${f}.in.L`, 'L1', 10, 0.3, { circuit: c });
  }
  b.wire('f1.out.L', 'sw1.c1', 'L1', 1.5, 10, { circuit: 'c1' });
  b.wire('sw1.c1.t1', 'la1.in.L', 'L1', 1.5, 3, { circuit: 'c1' });
  b.wire('rc1.out.N', 'la1.in.N', 'N', 1.5, 13, { circuit: 'c1' });
  b.wire('pb.t2', 'la1.in.PE', 'PE', 1.5, 13, { circuit: 'c1' });
  b.wire('f2.out.L', 'z1.in.L', 'L1', 2.5, 14, { circuit: 'c2' });
  b.wire('rc1.out.N', 'z1.in.N', 'N', 2.5, 14, { circuit: 'c2' });
  b.wire('pb.t3', 'z1.in.PE', 'PE', 2.5, 14, { circuit: 'c2' });
  b.wire('f3.out.L', 'z2.in.L', 'L1', 2.5, 12, { circuit: 'c3' });
  b.wire('rc1.out.N', 'z2.in.N', 'N', 2.5, 12, { circuit: 'c3' });
  b.wire('pb.t4', 'z2.in.PE', 'PE', 2.5, 12, { circuit: 'c3' });
  b.wire('f4.out.L', 'pr1.in.L', 'L1', 2.5, 9, { circuit: 'c4' });
  b.wire('rc1.out.N', 'pr1.in.N', 'N', 2.5, 9, { circuit: 'c4' });
  b.wire('pb.t5', 'pr1.in.PE', 'PE', 2.5, 9, { circuit: 'c4' });
  return b.build();
}

export function garageBoard(): Project {
  const b = new ProjectBuilder('Garáž / dílna', 'tpl-garage');
  origin(b, { phases: 3, main: 25 });
  b.enclosure({ id: 'e1', name: 'Dílna 2×12', rows: 2, modulesPerRow: 12, mount: 'surface', ip: 'IP54', x: 0, y: 0, door: true });
  b.circuit('c1', 'Osvětlení dílny', 'lighting', '#f0b429');
  b.circuit('c2', 'Zásuvky dílny', 'socket', '#2f8fd0');
  b.circuit('c3', 'Zásuvka 400 V', 'socket', '#d0472f');
  b.add('rcd', 'rc1', { inA: 40, idn: 30, rcdType: 'A', poles: '4P' }, { x: 40, y: 240, label: 'RCD1', panel: { enclosureId: 'e1', row: 1, slot: 4 } });
  b.add('mcb', 'f1', { inA: 10, curve: 'B', poles: '1P' }, { x: 220, y: 360, label: 'F1', circuit: 'c1', panel: { enclosureId: 'e1', row: 2, slot: 0 } });
  b.add('mcb', 'f2', { inA: 16, curve: 'B', poles: '1P' }, { x: 320, y: 360, label: 'F2', circuit: 'c2', panel: { enclosureId: 'e1', row: 2, slot: 1 } });
  b.add('mcb', 'f3', { inA: 16, curve: 'C', poles: '3P' }, { x: 440, y: 360, label: 'F3', circuit: 'c3', panel: { enclosureId: 'e1', row: 2, slot: 3 } });
  b.add('fluorescent', 'la1', { watts: 58 }, { x: 220, y: 560, label: 'E1', circuit: 'c1' });
  b.add('socket16', 'z1', { outlets: 2, ip: 'IP44' }, { x: 320, y: 560, label: 'Z1', circuit: 'c2' });
  b.add('socketCee', 'z2', { inA: 16 }, { x: 440, y: 560, label: 'Z2', circuit: 'c3' });
  for (const ph of ['L1', 'L2', 'L3'] as const) b.wire(`hj.out.${ph}`, `rc1.in.${ph}`, ph, 10, 0.5);
  b.wire('nb.t2', 'rc1.in.N', 'N', 10, 0.5);
  b.wire('rc1.out.L1', 'f1.in.L', 'L1', 10, 0.3, { circuit: 'c1' });
  b.wire('rc1.out.L2', 'f2.in.L', 'L2', 10, 0.3, { circuit: 'c2' });
  for (const ph of ['L1', 'L2', 'L3'] as const) b.wire(`rc1.out.${ph}`, `f3.in.${ph}`, ph, 10, 0.3, { circuit: 'c3' });
  b.wire('f1.out.L', 'la1.in.L', 'L1', 1.5, 12, { circuit: 'c1' });
  b.wire('rc1.out.N', 'la1.in.N', 'N', 1.5, 12, { circuit: 'c1' });
  b.wire('pb.t2', 'la1.in.PE', 'PE', 1.5, 12, { circuit: 'c1' });
  b.wire('f2.out.L', 'z1.in.L', 'L2', 2.5, 10, { circuit: 'c2' });
  b.wire('rc1.out.N', 'z1.in.N', 'N', 2.5, 10, { circuit: 'c2' });
  b.wire('pb.t3', 'z1.in.PE', 'PE', 2.5, 10, { circuit: 'c2' });
  for (const ph of ['L1', 'L2', 'L3'] as const) b.wire(`f3.out.${ph}`, `z2.in.${ph}`, ph, 2.5, 8, { circuit: 'c3' });
  b.wire('rc1.out.N', 'z2.in.N', 'N', 2.5, 8, { circuit: 'c3' });
  b.wire('pb.t4', 'z2.in.PE', 'PE', 2.5, 8, { circuit: 'c3' });
  return b.build();
}

export function bareEnclosure(): Project {
  const b = new ProjectBuilder('Prázdná rozvodnice', 'tpl-empty');
  origin(b, { phases: 3, main: 25 });
  b.enclosure({ id: 'e1', name: 'Rozvodnice 3×12', rows: 3, modulesPerRow: 12, mount: 'flush', ip: 'IP40', x: 0, y: 0, door: true });
  return b.build();
}

export const TEMPLATES: TemplateDef[] = [
  { id: 'house', category: 'board', build: houseBoard },
  { id: 'flat', category: 'board', build: flatBoard },
  { id: 'garage', category: 'board', build: garageBoard },
  { id: 'socketDemo', category: 'board', build: socketCircuitDemo },
  { id: 'empty', category: 'board', build: bareEnclosure },
  { id: 'lamp1', category: 'teaching', build: lampOneWay },
  { id: 'stairway', category: 'teaching', build: stairway },
  { id: 'intermediate', category: 'teaching', build: intermediate },
  { id: 'impulse', category: 'teaching', build: impulseLighting },
  { id: 'motor', category: 'teaching', build: contactorMotor },
];

export function templateById(id: string): Project | null {
  const t = TEMPLATES.find((x) => x.id === id);
  return t ? t.build() : null;
}
