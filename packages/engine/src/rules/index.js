import { getDef, effectiveProps, moduleCount } from '../catalog/index.js';
import { Simulator } from '../sim/simulation.js';
import { measureLoop } from '../sim/instruments.js';
import { ampacity, minPeCsa, conductorResistance, MIN_CSA } from '../physics/conductor.js';
import { MAGNETIC_RANGE } from '../devices/curves.js';
import { REFS, refString } from './refs.js';
export class Analysis {
    project;
    sim;
    downstream = new Map();
    constructor(project, sim) {
        this.project = project;
        this.sim = sim ?? new Simulator(project);
        this.sim.solve();
    }
    comp(id) {
        return this.project.components.find((c) => c.id === id);
    }
    props(c) {
        return effectiveProps(c.type, c.props);
    }
    /** Component ids electrically downstream of the given device. */
    downstreamOf(compId) {
        let s = this.downstream.get(compId);
        if (s)
            return s;
        s = new Set();
        for (const c of this.project.components) {
            if (c.id === compId)
                continue;
            try {
                if (this.sim.isDownstream(compId, c.id, this.sim.network ?? this.sim.probe({})))
                    s.add(c.id);
            }
            catch {
                /* ignore */
            }
        }
        this.downstream.set(compId, s);
        return s;
    }
    overcurrentDevices() {
        return this.project.components.filter((c) => getDef(c.type)?.flags?.overcurrent);
    }
    rcds() {
        return this.project.components.filter((c) => getDef(c.type)?.flags?.rcd);
    }
    /** Protective devices whose downstream set contains no other overcurrent device. */
    finalDevices() {
        const all = this.overcurrentDevices();
        return all.filter((d) => {
            const down = this.downstreamOf(d.id);
            return !all.some((o) => o.id !== d.id && down.has(o.id));
        });
    }
    /** Wires whose two ends are both downstream of the device. */
    wiresOf(compId) {
        const down = this.downstreamOf(compId);
        return this.project.wires.filter((w) => (down.has(w.from.comp) || w.from.comp === compId) &&
            (down.has(w.to.comp) || w.to.comp === compId) &&
            !(w.from.comp === compId && w.to.comp === compId));
    }
    finalCircuits() {
        const out = [];
        for (const d of this.finalDevices()) {
            const dp = this.props(d);
            const downIds = this.downstreamOf(d.id);
            const comps = this.project.components.filter((c) => downIds.has(c.id));
            const wires = this.wiresOf(d.id).filter((w) => w.role !== 'PE' && w.role !== 'PEN');
            const sockets = comps.filter((c) => getDef(c.type)?.flags?.socket);
            const loads = comps.filter((c) => getDef(c.type)?.flags?.load);
            const lineWires = wires.filter((w) => w.role !== 'N');
            const minCsa = lineWires.length ? Math.min(...lineWires.map((w) => w.csa)) : 0;
            const length = lineWires.length ? Math.max(...lineWires.map((w) => w.length)) : 0;
            const rcd = this.rcdFor(d.id);
            const rcdProps = rcd ? this.props(rcd) : null;
            out.push({
                device: d,
                deviceProps: dp,
                inA: Number(dp.inA) || 16,
                curve: (dp.curve || 'B'),
                components: comps,
                wires,
                sockets,
                loads,
                kind: this.kindOf(d, comps),
                minCsa,
                length,
                rcd,
                rcdIdn: rcdProps ? Number(rcdProps.idn) || null : null,
                rcdType: rcdProps ? (rcdProps.rcdType || 'A') : null,
            });
        }
        return out;
    }
    /** The RCD protecting a circuit: the device itself if it is an RCBO, else upstream. */
    rcdFor(compId) {
        const self = this.comp(compId);
        if (self && getDef(self.type)?.flags?.rcd)
            return self;
        for (const r of this.rcds()) {
            if (this.downstreamOf(r.id).has(compId))
                return r;
        }
        return null;
    }
    kindOf(device, comps) {
        const declared = device.circuit
            ? this.project.circuits.find((c) => c.id === device.circuit)?.kind
            : undefined;
        if (declared)
            return declared;
        if (comps.some((c) => c.type === 'evse'))
            return 'evse';
        if (comps.some((c) => c.type === 'cooker3f'))
            return 'cooker';
        if (comps.some((c) => c.type === 'boiler'))
            return 'boiler';
        if (comps.some((c) => c.type === 'motor3f' || c.type === 'machine'))
            return 'motor';
        if (comps.some((c) => getDef(c.type)?.flags?.socket))
            return 'socket';
        if (comps.some((c) => getDef(c.type)?.flags?.luminaire))
            return 'lighting';
        return 'other';
    }
    /** Loop impedance at the far end of a circuit, measured through the model. */
    loopAt(comp) {
        const def = getDef(comp.type);
        if (!def)
            return null;
        const terms = def.terminals(this.props(comp)).map((t) => t.id);
        const line = terms.find((t) => t === 'in.L' || t === 'in.L1' || t === 'out.L');
        const pe = terms.find((t) => t === 'in.PE' || t === 'out.PE');
        if (!line || !pe)
            return null;
        const r = measureLoop(this.sim, { comp: comp.id, terminal: line }, { comp: comp.id, terminal: pe }, 'L-PE', { closeSwitches: true });
        return Number.isFinite(r.zs) ? r.zs : null;
    }
}
const ref = (r) => ({ ref: refString(r), refToVerify: r.toVerify });
/** Assumed disconnection current of a device, for the Zs check. */
function disconnectCurrent(device, props) {
    const def = getDef(device.type);
    const inA = Number(props.inA) || 16;
    if (device.type === 'fuse') {
        // A gG fuse must clear in 0,4 s at roughly 5×In for small ratings.
        return inA * 5;
    }
    if (def?.flags?.overcurrent) {
        const curve = (props.curve || 'B');
        // The upper limit of the magnetic range is the value to design with.
        return inA * MAGNETIC_RANGE[curve][1];
    }
    return inA * 5;
}
const ruleSocketsRcd = (a, push) => {
    const circuits = a.finalCircuits().filter((c) => c.sockets.length > 0);
    if (!circuits.length) {
        push({ rule: 'rcd.sockets', status: 'na', key: 'rule.rcd.sockets.none', ...ref(REFS.shockRcd) });
        return;
    }
    for (const c of circuits) {
        const rated = c.inA;
        const needsRcd = rated <= 32 && a.project.settings.premises !== 'industrial';
        if (!needsRcd) {
            push({
                rule: 'rcd.sockets',
                status: 'warn',
                key: 'rule.rcd.sockets.aboveLimit',
                vars: { label: c.device.label || c.device.id, inA: rated },
                components: [c.device.id],
                ...ref(REFS.shockRcd),
            });
            continue;
        }
        if (!c.rcd || !c.rcdIdn) {
            push({
                rule: 'rcd.sockets',
                status: 'fail',
                key: 'rule.rcd.sockets.missing',
                vars: { label: c.device.label || c.device.id, inA: rated },
                components: [c.device.id, ...c.sockets.map((s) => s.id)],
                ...ref(REFS.shockRcd),
            });
        }
        else if (c.rcdIdn > 30) {
            push({
                rule: 'rcd.sockets',
                status: 'fail',
                key: 'rule.rcd.sockets.tooCoarse',
                vars: { label: c.device.label || c.device.id, idn: c.rcdIdn },
                components: [c.device.id, c.rcd.id],
                ...ref(REFS.shockRcd),
            });
        }
        else {
            push({
                rule: 'rcd.sockets',
                status: 'pass',
                key: 'rule.rcd.sockets.ok',
                vars: { label: c.device.label || c.device.id, idn: c.rcdIdn },
                components: [c.device.id, c.rcd.id],
                ...ref(REFS.shockRcd),
            });
        }
    }
};
const ruleLightingRcd = (a, push) => {
    if (a.project.settings.premises !== 'dwelling')
        return;
    const circuits = a.finalCircuits().filter((c) => c.kind === 'lighting');
    for (const c of circuits) {
        if (!c.rcd || !c.rcdIdn || c.rcdIdn > 30) {
            push({
                rule: 'rcd.lighting',
                status: 'warn',
                key: 'rule.rcd.lighting.missing',
                vars: { label: c.device.label || c.device.id },
                components: [c.device.id],
                ...ref(REFS.shockRcdLighting),
            });
        }
        else {
            push({
                rule: 'rcd.lighting',
                status: 'pass',
                key: 'rule.rcd.lighting.ok',
                vars: { label: c.device.label || c.device.id },
                components: [c.device.id],
                ...ref(REFS.shockRcdLighting),
            });
        }
    }
};
const ruleWetLocations = (a, push) => {
    const wet = a.project.components.filter((c) => /koupel|bath|łazien|ванн|venk|outdoor|zewn|улиц|зовн/i.test(c.location ?? '') || a.props(c).ip === 'IP44' || a.props(c).ip === 'IP54');
    if (!wet.length) {
        push({ rule: 'rcd.wet', status: 'na', key: 'rule.rcd.wet.none', ...ref(REFS.bathroom) });
        return;
    }
    for (const c of wet) {
        const rcd = a.rcdFor(c.id);
        const idn = rcd ? Number(a.props(rcd).idn) : null;
        if (!rcd || !idn || idn > 30) {
            push({
                rule: 'rcd.wet',
                status: 'fail',
                key: 'rule.rcd.wet.missing',
                vars: { label: c.label || c.id, location: c.location ?? '' },
                components: [c.id],
                ...ref(REFS.bathroom),
            });
        }
        else {
            push({
                rule: 'rcd.wet',
                status: 'pass',
                key: 'rule.rcd.wet.ok',
                vars: { label: c.label || c.id },
                components: [c.id],
                ...ref(REFS.bathroom),
            });
        }
    }
};
const ruleCableAmpacity = (a, push) => {
    const s = a.project.settings;
    for (const c of a.finalCircuits()) {
        for (const w of c.wires) {
            const iz = ampacity({
                csa: w.csa,
                material: w.material,
                method: w.installMethod ?? s.defaultInstallMethod,
                loadedConductors: w.loadedConductors ?? 2,
                ambientTemp: s.ambientTemp,
                groupingFactor: w.groupingFactor ?? 1,
            });
            if (c.inA > iz + 1e-6) {
                push({
                    rule: 'cable.ampacity',
                    status: 'fail',
                    key: 'rule.cable.ampacity.fail',
                    vars: {
                        label: c.device.label || c.device.id,
                        inA: c.inA,
                        csa: w.csa,
                        iz: iz.toFixed(1),
                        method: w.installMethod ?? s.defaultInstallMethod,
                    },
                    components: [c.device.id],
                    wires: [w.id],
                    ...ref(REFS.overcurrent),
                });
            }
        }
    }
    if (!a.finalCircuits().length) {
        push({ rule: 'cable.ampacity', status: 'na', key: 'rule.cable.ampacity.none', ...ref(REFS.overcurrent) });
    }
    else {
        push({ rule: 'cable.ampacity', status: 'pass', key: 'rule.cable.ampacity.ok', ...ref(REFS.overcurrent) });
    }
};
const ruleMinCsa = (a, push) => {
    for (const c of a.finalCircuits()) {
        let min = 0;
        if (c.kind === 'socket')
            min = MIN_CSA.socket;
        else if (c.kind === 'lighting')
            min = MIN_CSA.lighting;
        else if (c.kind === 'cooker')
            min = MIN_CSA.cooker;
        else if (c.kind === 'evse')
            min = MIN_CSA.evse;
        if (!min || !c.minCsa)
            continue;
        if (c.minCsa < min) {
            push({
                rule: 'cable.minCsa',
                status: 'fail',
                key: 'rule.cable.minCsa.fail',
                vars: { label: c.device.label || c.device.id, csa: c.minCsa, min, kind: c.kind },
                components: [c.device.id],
                wires: c.wires.filter((w) => w.csa < min).map((w) => w.id),
                ...ref(REFS.indoor),
            });
        }
    }
};
const rulePeCsa = (a, push) => {
    /*
     * The protective conductor of a cable is compared with the line conductors of
     * the same cable. Cores of one cable share a route, so they are matched by
     * circuit and by route length rather than being pooled across the whole
     * installation — a 1,5 mm² PE in a lighting cable has nothing to do with the
     * 10 mm² tails feeding the board.
     */
    const lines = a.project.wires.filter((w) => w.role === 'L1' || w.role === 'L2' || w.role === 'L3');
    /** Equipment with an exposed conductive part — what a PE actually protects. */
    const isEquipment = (compId) => {
        const c = a.comp(compId);
        const def = c ? getDef(c.type) : undefined;
        return !!(def?.flags?.load || def?.flags?.socket || c?.type === 'connectionBox');
    };
    const undersized = [];
    let checked = 0;
    for (const pe of a.project.wires) {
        if (pe.role !== 'PE')
            continue;
        // Only the protective conductor running to a piece of equipment is sized
        // against a line conductor; bonding tails of protective devices are not.
        const ends = [pe.from.comp, pe.to.comp].filter(isEquipment);
        if (!ends.length)
            continue;
        const sameRun = lines.filter((l) => Math.abs(l.length - pe.length) < 0.01 &&
            l.material === pe.material &&
            (ends.includes(l.from.comp) || ends.includes(l.to.comp)));
        if (!sameRun.length)
            continue;
        checked++;
        const line = Math.max(...sameRun.map((l) => l.csa));
        const need = minPeCsa(line);
        if (pe.csa < need - 1e-9)
            undersized.push({ wire: pe, line, need });
    }
    if (undersized.length) {
        const worst = undersized[0];
        push({
            rule: 'pe.csa',
            status: 'fail',
            key: 'rule.pe.csa.fail',
            vars: { pe: worst.wire.csa, line: worst.line, need: worst.need, count: undersized.length },
            wires: undersized.map((u) => u.wire.id),
            ...ref(REFS.earthing),
        });
    }
    else if (checked) {
        push({ rule: 'pe.csa', status: 'pass', key: 'rule.pe.csa.ok', ...ref(REFS.earthing) });
    }
    else {
        push({ rule: 'pe.csa', status: 'na', key: 'rule.pe.csa.none', ...ref(REFS.earthing) });
    }
};
const ruleVoltageDrop = (a, push) => {
    const s = a.project.settings;
    const sim = a.sim;
    const res = sim.results;
    let worst = 0;
    let worstComp = null;
    let worstLimit = s.voltageDropOther;
    for (const c of a.finalCircuits()) {
        const limit = c.kind === 'lighting' ? s.voltageDropLighting : s.voltageDropOther;
        for (const l of [...c.loads, ...c.sockets]) {
            const def = getDef(l.type);
            if (!def)
                continue;
            const terms = def.terminals(a.props(l)).map((t) => t.id);
            const line = terms.find((t) => t === 'in.L' || t === 'in.L1');
            const n = terms.find((t) => t === 'in.N');
            if (!line || !n)
                continue;
            const u = res.nodeV[`${l.id}:${line}`] ?? 0;
            const un = res.nodeV[`${l.id}:${n}`] ?? 0;
            if (u < 50)
                continue;
            const uAcross = Math.abs(u - un) || u;
            const drop = ((s.voltageLN - uAcross) / s.voltageLN) * 100;
            if (drop > worst) {
                worst = drop;
                worstComp = l.id;
                worstLimit = limit;
            }
            if (drop > limit) {
                push({
                    rule: 'voltageDrop',
                    status: 'fail',
                    key: 'rule.voltageDrop.fail',
                    vars: { label: l.label || l.id, drop: drop.toFixed(1), limit },
                    components: [l.id, c.device.id],
                    ...ref(REFS.voltageDrop),
                });
            }
        }
        // Calculated drop at full rated current, independent of what is switched on.
        if (c.minCsa > 0 && c.length > 0) {
            const r = conductorResistance(c.length * 2, c.minCsa, 'Cu', s.conductorTemp);
            const drop = ((c.inA * r) / s.voltageLN) * 100;
            if (drop > limit) {
                push({
                    rule: 'voltageDrop',
                    status: 'warn',
                    key: 'rule.voltageDrop.atRated',
                    vars: {
                        label: c.device.label || c.device.id,
                        drop: drop.toFixed(1),
                        limit,
                        length: c.length,
                        csa: c.minCsa,
                    },
                    components: [c.device.id],
                    ...ref(REFS.voltageDrop),
                });
            }
        }
    }
    if (worst <= worstLimit) {
        push({
            rule: 'voltageDrop',
            status: 'pass',
            key: 'rule.voltageDrop.ok',
            vars: { drop: worst.toFixed(1), label: worstComp ?? '—' },
            ...ref(REFS.voltageDrop),
        });
    }
};
const ruleDisconnectionTime = (a, push) => {
    const s = a.project.settings;
    if (s.system === 'TN-C' || s.system === 'TN-C-S' || s.system === 'TN-S') {
        for (const c of a.finalCircuits()) {
            const target = [...c.sockets, ...c.loads][0];
            if (!target)
                continue;
            const zs = a.loopAt(target);
            if (zs === null || !Number.isFinite(zs)) {
                push({
                    rule: 'disconnection',
                    status: 'fail',
                    key: 'rule.disconnection.noLoop',
                    vars: { label: c.device.label || c.device.id },
                    components: [c.device.id, target.id],
                    ...ref(REFS.shockDisconnect),
                });
                continue;
            }
            const ia = disconnectCurrent(c.device, c.deviceProps);
            const zsMax = (s.voltageLN * 0.95) / ia;
            const time = c.inA <= 32 ? 0.4 : 5;
            if (zs > zsMax) {
                push({
                    rule: 'disconnection',
                    status: 'fail',
                    key: 'rule.disconnection.fail',
                    vars: {
                        label: c.device.label || c.device.id,
                        zs: zs.toFixed(2),
                        zsMax: zsMax.toFixed(2),
                        t: time,
                        ia: Math.round(ia),
                    },
                    components: [c.device.id, target.id],
                    ...ref(REFS.shockDisconnect),
                });
            }
            else {
                push({
                    rule: 'disconnection',
                    status: 'pass',
                    key: 'rule.disconnection.ok',
                    vars: { label: c.device.label || c.device.id, zs: zs.toFixed(2), zsMax: zsMax.toFixed(2), t: time },
                    components: [c.device.id],
                    ...ref(REFS.shockDisconnect),
                });
            }
        }
    }
};
const rulePeSeparation = (a, push) => {
    const s = a.project.settings;
    if (s.system !== 'TN-C-S') {
        push({ rule: 'pe.separation', status: 'na', key: 'rule.pe.separation.na', vars: { system: s.system }, ...ref(REFS.peSeparation) });
        return;
    }
    // After the main earthing terminal, no conductor may carry both functions.
    const hop = a.project.components.find((c) => c.type === 'mainEarthBar');
    if (!hop) {
        push({ rule: 'pe.separation', status: 'fail', key: 'rule.pe.separation.noSplit', ...ref(REFS.peSeparation) });
        return;
    }
    const down = a.downstreamOf(hop.id);
    const offending = a.project.wires.filter((w) => w.role === 'PEN' && (down.has(w.from.comp) || down.has(w.to.comp)) && w.from.comp !== hop.id && w.to.comp !== hop.id);
    if (offending.length) {
        push({
            rule: 'pe.separation',
            status: 'fail',
            key: 'rule.pe.separation.penAfterSplit',
            vars: { count: offending.length },
            wires: offending.map((w) => w.id),
            ...ref(REFS.peSeparation),
        });
    }
    else {
        push({ rule: 'pe.separation', status: 'pass', key: 'rule.pe.separation.ok', components: [hop.id], ...ref(REFS.peSeparation) });
    }
};
const rulePeNotSwitched = (a, push) => {
    const bad = [];
    for (const w of a.project.wires) {
        if (w.role !== 'PE' && w.role !== 'PEN')
            continue;
        for (const end of [w.from, w.to]) {
            const c = a.comp(end.comp);
            if (!c)
                continue;
            const def = getDef(c.type);
            if (!def)
                continue;
            const switching = def.flags?.overcurrent || def.flags?.rcd || c.type === 'isolator' || c.type === 'contactor' || c.type === 'fuse' || c.type.startsWith('switch');
            if (switching && (end.terminal.startsWith('in.') || end.terminal.startsWith('out.') || end.terminal.startsWith('c'))) {
                bad.push({ comp: c, wire: w });
            }
        }
    }
    if (bad.length) {
        push({
            rule: 'pe.switched',
            status: 'fail',
            key: 'rule.pe.switched.fail',
            vars: { count: bad.length, label: bad[0].comp.label || bad[0].comp.id },
            components: [...new Set(bad.map((b) => b.comp.id))],
            wires: bad.map((b) => b.wire.id),
            ...ref(REFS.earthing),
        });
    }
    else {
        push({ rule: 'pe.switched', status: 'pass', key: 'rule.pe.switched.ok', ...ref(REFS.earthing) });
    }
};
const rulePeContinuity = (a, push) => {
    const exposed = a.project.components.filter((c) => {
        const def = getDef(c.type);
        if (!def)
            return false;
        if (def.flags?.socket)
            return true;
        return def.flags?.load && a.props(c).classI !== false;
    });
    const missing = [];
    for (const c of exposed) {
        const def = getDef(c.type);
        const terms = def.terminals(a.props(c)).map((t) => t.id);
        const pe = terms.find((t) => t.endsWith('.PE') || t === 'PE');
        if (!pe)
            continue;
        const connected = a.project.wires.some((w) => (w.from.comp === c.id && w.from.terminal === pe) || (w.to.comp === c.id && w.to.terminal === pe));
        if (!connected)
            missing.push(c.id);
    }
    if (missing.length) {
        push({
            rule: 'pe.continuity',
            status: 'fail',
            key: 'rule.pe.continuity.fail',
            vars: { count: missing.length },
            components: missing,
            ...ref(REFS.shock),
        });
    }
    else if (exposed.length) {
        push({ rule: 'pe.continuity', status: 'pass', key: 'rule.pe.continuity.ok', vars: { count: exposed.length }, ...ref(REFS.shock) });
    }
};
const ruleOutletsPerCircuit = (a, push) => {
    for (const c of a.finalCircuits()) {
        if (!c.sockets.length)
            continue;
        const outlets = c.sockets.reduce((n, s) => n + (Number(a.props(s).outlets) || 1), 0);
        // ČSN 33 2130 ed. 3 limits the number of outlets on a final socket circuit;
        // the customary figure in dwellings is ten single outlets on a 16 A circuit.
        const limit = c.inA >= 16 ? 10 : 6;
        if (outlets > limit) {
            push({
                rule: 'circuit.outlets',
                status: 'fail',
                key: 'rule.circuit.outlets.fail',
                vars: { label: c.device.label || c.device.id, outlets, limit },
                components: [c.device.id, ...c.sockets.map((s) => s.id)],
                ref: refString(REFS.indoor),
                refToVerify: true,
            });
        }
        else {
            push({
                rule: 'circuit.outlets',
                status: 'pass',
                key: 'rule.circuit.outlets.ok',
                vars: { label: c.device.label || c.device.id, outlets, limit },
                components: [c.device.id],
                ref: refString(REFS.indoor),
                refToVerify: true,
            });
        }
    }
};
const DEDICATED = [
    { type: 'cooker3f', key: 'cooker' },
    { type: 'boiler', key: 'boiler' },
    { type: 'washingMachine', key: 'washingMachine' },
    { type: 'dishwasher', key: 'dishwasher' },
    { type: 'evse', key: 'evse' },
];
const ruleDedicatedCircuits = (a, push) => {
    for (const c of a.finalCircuits()) {
        for (const d of DEDICATED) {
            const items = c.components.filter((x) => x.type === d.type);
            if (!items.length)
                continue;
            const others = c.components.filter((x) => x.id !== items[0].id && (getDef(x.type)?.flags?.load || getDef(x.type)?.flags?.socket));
            if (others.length) {
                push({
                    rule: 'circuit.dedicated',
                    status: 'fail',
                    key: 'rule.circuit.dedicated.fail',
                    vars: { appliance: d.key, label: c.device.label || c.device.id, others: others.length },
                    components: [c.device.id, items[0].id, ...others.map((o) => o.id)],
                    ref: refString(REFS.indoor),
                    refToVerify: true,
                });
            }
            else {
                push({
                    rule: 'circuit.dedicated',
                    status: 'pass',
                    key: 'rule.circuit.dedicated.ok',
                    vars: { appliance: d.key, label: c.device.label || c.device.id },
                    components: [c.device.id],
                    ref: refString(REFS.indoor),
                    refToVerify: true,
                });
            }
        }
    }
};
const ruleEvse = (a, push) => {
    const evs = a.project.components.filter((c) => c.type === 'evse');
    if (!evs.length) {
        push({ rule: 'evse', status: 'na', key: 'rule.evse.none', ...ref(REFS.evse) });
        return;
    }
    for (const ev of evs) {
        const rcd = a.rcdFor(ev.id);
        const p = rcd ? a.props(rcd) : null;
        const type = p ? p.rcdType : null;
        const idn = p ? Number(p.idn) : null;
        const evProps = a.props(ev);
        const ok = type === 'B' || type === 'B+' || (type === 'EV') || (type === 'A' && evProps.rdcDd === true);
        if (!rcd || !idn || idn > 30) {
            push({
                rule: 'evse',
                status: 'fail',
                key: 'rule.evse.noRcd',
                vars: { label: ev.label || ev.id },
                components: [ev.id],
                ...ref(REFS.evse),
            });
        }
        else if (!ok) {
            push({
                rule: 'evse',
                status: 'fail',
                key: 'rule.evse.wrongType',
                vars: { label: ev.label || ev.id, type: String(type) },
                components: [ev.id, rcd.id],
                ...ref(REFS.evse),
            });
        }
        else {
            push({
                rule: 'evse',
                status: 'pass',
                key: 'rule.evse.ok',
                vars: { label: ev.label || ev.id, type: String(type) },
                components: [ev.id, rcd.id],
                ...ref(REFS.evse),
            });
        }
    }
};
const ruleSpd = (a, push) => {
    const spds = a.project.components.filter((c) => c.type === 'spd');
    if (!spds.length) {
        push({ rule: 'spd', status: 'warn', key: 'rule.spd.missing', ...ref(REFS.spd) });
        return;
    }
    const hasT1 = spds.some((s) => /T1/.test(String(a.props(s).spdType)));
    const bondedToPe = spds.every((s) => a.project.wires.some((w) => (w.from.comp === s.id && w.from.terminal === 'PE') || (w.to.comp === s.id && w.to.terminal === 'PE')));
    if (!bondedToPe) {
        push({
            rule: 'spd',
            status: 'fail',
            key: 'rule.spd.notBonded',
            components: spds.map((s) => s.id),
            ...ref(REFS.spd),
        });
    }
    else {
        push({
            rule: 'spd',
            status: 'pass',
            key: hasT1 ? 'rule.spd.ok' : 'rule.spd.okT2',
            components: spds.map((s) => s.id),
            ...ref(REFS.spd),
        });
    }
};
const ruleBonding = (a, push) => {
    const hop = a.project.components.find((c) => c.type === 'mainEarthBar');
    const electrode = a.project.components.find((c) => c.type === 'earthElectrode');
    if (!hop) {
        push({ rule: 'bonding.main', status: 'fail', key: 'rule.bonding.main.missing', ...ref(REFS.earthing) });
    }
    else {
        push({ rule: 'bonding.main', status: 'pass', key: 'rule.bonding.main.ok', components: [hop.id], ...ref(REFS.earthing) });
    }
    if (!electrode) {
        push({ rule: 'bonding.earth', status: 'warn', key: 'rule.bonding.earth.missing', ...ref(REFS.earthing) });
    }
    else {
        const ra = Number(a.props(electrode).ra) || 10;
        push({
            rule: 'bonding.earth',
            status: ra <= 15 ? 'pass' : 'warn',
            key: ra <= 15 ? 'rule.bonding.earth.ok' : 'rule.bonding.earth.high',
            vars: { ra },
            components: [electrode.id],
            ...ref(REFS.earthing),
        });
    }
};
const ruleEnclosureCapacity = (a, push) => {
    if (!a.project.enclosures.length) {
        push({ rule: 'enclosure.capacity', status: 'na', key: 'rule.enclosure.capacity.none', ...ref(REFS.boards) });
        return;
    }
    for (const e of a.project.enclosures) {
        const placed = a.project.components.filter((c) => c.panel?.enclosureId === e.id);
        const used = placed.reduce((n, c) => n + moduleCount(c.type, c.props), 0);
        const capacity = e.rows * e.modulesPerRow;
        // Rows must not overflow individually either.
        const perRow = new Map();
        for (const c of placed) {
            const r = c.panel.row;
            perRow.set(r, (perRow.get(r) ?? 0) + moduleCount(c.type, c.props));
        }
        const overRow = [...perRow.entries()].filter(([, n]) => n > e.modulesPerRow);
        if (used > capacity || overRow.length) {
            push({
                rule: 'enclosure.capacity',
                status: 'fail',
                key: 'rule.enclosure.capacity.fail',
                vars: { name: e.name, used, capacity, row: overRow[0]?.[0] ?? 0 },
                ...ref(REFS.boards),
            });
        }
        else {
            const spare = capacity - used;
            push({
                rule: 'enclosure.capacity',
                status: spare >= Math.ceil(capacity * 0.15) ? 'pass' : 'warn',
                key: spare >= Math.ceil(capacity * 0.15) ? 'rule.enclosure.capacity.ok' : 'rule.enclosure.capacity.tight',
                vars: { name: e.name, used, capacity, spare },
                ...ref(REFS.boards),
            });
        }
    }
};
const ruleLabelling = (a, push) => {
    const devices = a.overcurrentDevices();
    const unlabelled = devices.filter((d) => !d.label || !d.label.trim());
    if (unlabelled.length) {
        push({
            rule: 'labels',
            status: 'fail',
            key: 'rule.labels.missing',
            vars: { count: unlabelled.length },
            components: unlabelled.map((d) => d.id),
            ...ref(REFS.boards),
        });
    }
    else if (devices.length) {
        push({ rule: 'labels', status: 'pass', key: 'rule.labels.ok', vars: { count: devices.length }, ...ref(REFS.boards) });
    }
    const named = a.finalCircuits().filter((c) => !c.device.circuit);
    if (named.length) {
        push({
            rule: 'labels.schedule',
            status: 'warn',
            key: 'rule.labels.schedule',
            vars: { count: named.length },
            components: named.map((c) => c.device.id),
            ...ref(REFS.boards),
        });
    }
    else if (a.project.circuits.length) {
        push({ rule: 'labels.schedule', status: 'pass', key: 'rule.labels.scheduleOk', ...ref(REFS.boards) });
    }
};
const ruleSelectivity = (a, push) => {
    // RCD selectivity: an upstream RCD must be at least three times coarser and
    // of the delayed (S) type.
    const rcds = a.rcds();
    for (const up of rcds) {
        const down = a.downstreamOf(up.id);
        for (const other of rcds) {
            if (other.id === up.id || !down.has(other.id))
                continue;
            const pu = a.props(up);
            const pd = a.props(other);
            const idnU = Number(pu.idn) || 30;
            const idnD = Number(pd.idn) || 30;
            const delayed = pu.delay === 'S' || pu.delay === 'G';
            if (idnU < idnD * 3 || !delayed) {
                push({
                    rule: 'selectivity.rcd',
                    status: 'warn',
                    key: 'rule.selectivity.rcd.fail',
                    vars: { up: up.label || up.id, down: other.label || other.id, idnU, idnD },
                    components: [up.id, other.id],
                    ref: refString(REFS.shock),
                    refToVerify: true,
                });
            }
            else {
                push({
                    rule: 'selectivity.rcd',
                    status: 'pass',
                    key: 'rule.selectivity.rcd.ok',
                    vars: { up: up.label || up.id, down: other.label || other.id },
                    components: [up.id, other.id],
                    ref: refString(REFS.shock),
                    refToVerify: true,
                });
            }
        }
    }
    // MCB selectivity: an upstream device should be at least 1,6× the downstream one.
    const ocs = a.overcurrentDevices();
    for (const up of ocs) {
        const down = a.downstreamOf(up.id);
        const pu = a.props(up);
        for (const other of ocs) {
            if (other.id === up.id || !down.has(other.id))
                continue;
            const pd = a.props(other);
            const ratio = (Number(pu.inA) || 16) / (Number(pd.inA) || 16);
            if (ratio < 1.6) {
                push({
                    rule: 'selectivity.mcb',
                    status: 'warn',
                    key: 'rule.selectivity.mcb.fail',
                    vars: { up: up.label || up.id, down: other.label || other.id, inU: pu.inA, inD: pd.inA },
                    components: [up.id, other.id],
                    ref: refString(REFS.overcurrent),
                    refToVerify: true,
                });
            }
        }
    }
};
const ruleSharedNeutral = (a, push) => {
    // Every circuit protected by an RCD must keep its own neutral: a neutral that
    // is common to two RCD-protected circuits makes both devices trip spuriously.
    const rcds = a.rcds();
    const offenders = [];
    for (const w of a.project.wires) {
        if (w.role !== 'N')
            continue;
        const owners = rcds.filter((r) => {
            const d = a.downstreamOf(r.id);
            return d.has(w.from.comp) || d.has(w.to.comp);
        });
        if (owners.length > 1) {
            // Nested RCDs are legitimate; only siblings are a problem.
            const nested = owners.some((o) => owners.some((p) => p.id !== o.id && a.downstreamOf(p.id).has(o.id)));
            if (!nested)
                offenders.push(w.id);
        }
    }
    // A neutral bar shared by two RCD-protected circuits is the classic mistake.
    for (const bar of a.project.components.filter((c) => c.type === 'nBar')) {
        const feeding = rcds.filter((r) => a.downstreamOf(r.id).has(bar.id));
        if (feeding.length > 1) {
            push({
                rule: 'neutral.shared',
                status: 'fail',
                key: 'rule.neutral.shared.bar',
                vars: { label: bar.label || bar.id, count: feeding.length },
                components: [bar.id, ...feeding.map((f) => f.id)],
                ref: refString(REFS.shockRcd),
                refToVerify: true,
            });
        }
    }
    if (offenders.length) {
        push({
            rule: 'neutral.shared',
            status: 'fail',
            key: 'rule.neutral.shared.fail',
            vars: { count: offenders.length },
            wires: offenders,
            ref: refString(REFS.shockRcd),
            refToVerify: true,
        });
    }
    else {
        push({ rule: 'neutral.shared', status: 'pass', key: 'rule.neutral.shared.ok', ref: refString(REFS.shockRcd), refToVerify: true });
    }
};
const ruleWireRoles = (a, push) => {
    const bad = [];
    for (const w of a.project.wires) {
        for (const end of [w.from, w.to]) {
            const c = a.comp(end.comp);
            if (!c)
                continue;
            const def = getDef(c.type);
            const t = def?.terminals(a.props(c)).find((x) => x.id === end.terminal);
            if (!t || t.role === 'any' || t.role === 'ctrl' || t.role === 'elv')
                continue;
            const wantsLine = t.role === 'L';
            const wantsN = t.role === 'N';
            const wantsPe = t.role === 'PE' || t.role === 'earth';
            const isLine = w.role === 'L1' || w.role === 'L2' || w.role === 'L3';
            const isN = w.role === 'N';
            const isPe = w.role === 'PE' || w.role === 'PEN';
            if ((wantsLine && !isLine) || (wantsN && !isN && w.role !== 'PEN') || (wantsPe && !isPe)) {
                bad.push(w.id);
            }
        }
    }
    if (bad.length) {
        push({
            rule: 'wire.role',
            status: 'fail',
            key: 'rule.wire.role.fail',
            vars: { count: [...new Set(bad)].length },
            wires: [...new Set(bad)],
            ref: refString(REFS.indoor),
            refToVerify: true,
        });
    }
    else {
        push({ rule: 'wire.role', status: 'pass', key: 'rule.wire.role.ok', ref: refString(REFS.indoor), refToVerify: true });
    }
};
const ruleSwitchInNeutral = (a, push) => {
    const bad = [];
    for (const c of a.project.components) {
        if (!c.type.startsWith('switch') && c.type !== 'button' && c.type !== 'dimmer')
            continue;
        const attached = a.project.wires.filter((w) => w.from.comp === c.id || w.to.comp === c.id);
        if (attached.some((w) => w.role === 'N'))
            bad.push(c.id);
    }
    if (bad.length) {
        push({
            rule: 'switch.neutral',
            status: 'fail',
            key: 'rule.switch.neutral.fail',
            vars: { count: bad.length },
            components: bad,
            ref: refString(REFS.shock),
            refToVerify: true,
        });
    }
    else {
        push({ rule: 'switch.neutral', status: 'pass', key: 'rule.switch.neutral.ok', ref: refString(REFS.shock), refToVerify: true });
    }
};
const ruleMainBreakerVsSupply = (a, push) => {
    const supply = a.project.components.find((c) => c.type === 'supply');
    const main = a.project.components.find((c) => c.type === 'mainBreaker');
    if (!supply) {
        push({ rule: 'supply.present', status: 'fail', key: 'rule.supply.missing' });
        return;
    }
    if (!main) {
        push({ rule: 'supply.present', status: 'warn', key: 'rule.supply.noMain', components: [supply.id], ...ref(REFS.indoor) });
        return;
    }
    const mp = a.props(main);
    const icn = Number(mp.icn) || 6000;
    const ipk = Number(a.props(supply).ipk) || 3000;
    if (icn < ipk) {
        push({
            rule: 'supply.present',
            status: 'fail',
            key: 'rule.supply.breakingCapacity',
            vars: { icn, ipk },
            components: [main.id, supply.id],
            ...ref(REFS.overcurrentShort),
        });
    }
    else {
        push({ rule: 'supply.present', status: 'pass', key: 'rule.supply.ok', vars: { inA: mp.inA }, components: [main.id], ...ref(REFS.indoor) });
    }
};
const ALL_RULES = [
    ruleMainBreakerVsSupply,
    ruleSocketsRcd,
    ruleLightingRcd,
    ruleWetLocations,
    ruleCableAmpacity,
    ruleMinCsa,
    rulePeCsa,
    ruleVoltageDrop,
    ruleDisconnectionTime,
    rulePeSeparation,
    rulePeNotSwitched,
    rulePeContinuity,
    ruleOutletsPerCircuit,
    ruleDedicatedCircuits,
    ruleEvse,
    ruleSpd,
    ruleBonding,
    ruleEnclosureCapacity,
    ruleLabelling,
    ruleSelectivity,
    ruleSharedNeutral,
    ruleWireRoles,
    ruleSwitchInNeutral,
];
export function runDesignRuleCheck(project, sim) {
    const a = new Analysis(project, sim);
    const findings = [];
    for (const rule of ALL_RULES) {
        try {
            rule(a, (f) => findings.push(f));
        }
        catch (err) {
            findings.push({
                rule: 'internal',
                status: 'warn',
                key: 'rule.internalError',
                vars: { message: String(err?.message ?? err) },
            });
        }
    }
    const summary = { pass: 0, warn: 0, fail: 0, na: 0 };
    for (const f of findings)
        summary[f.status]++;
    return {
        generatedAt: new Date().toISOString(),
        projectName: project.name,
        findings,
        summary,
    };
}
export { refString };
