import { C, cdiv, cmul, csub, cabs, polar, ZERO, cadd, cconj, cscale } from './complex.js';
import { MatrixBuilder } from './linalg.js';
/** Reference (true earth) node. */
export const EARTH = -1;
/** Resistance floor for an "ideal" connection — a real screw terminal is ~0.1 mΩ. */
export const R_IDEAL = 1e-4;
/** Resistance of an open air-gap contact — treated as good insulation. */
export const R_OPEN = 1e8;
/** Default insulation resistance of every node to earth (1 GΩ). Keeps the matrix
 *  non-singular for floating sub-networks and is physically what real cable does. */
export const R_INSULATION = 1e9;
export class Network {
    nodeIdx = new Map();
    nodeNames = [];
    branches = [];
    nAux = 0;
    /** Get (or create) the index of a named node. */
    node(name) {
        if (name === 'EARTH')
            return EARTH;
        let i = this.nodeIdx.get(name);
        if (i === undefined) {
            i = this.nodeNames.length;
            this.nodeNames.push(name);
            this.nodeIdx.set(name, i);
        }
        return i;
    }
    hasNode(name) {
        return this.nodeIdx.has(name);
    }
    nodeName(i) {
        return i === EARTH ? 'EARTH' : this.nodeNames[i] ?? `#${i}`;
    }
    get nodeCount() {
        return this.nodeNames.length;
    }
    allNodes() {
        return this.nodeNames.slice();
    }
    addZ(a, b, r, x = 0, owner, tag) {
        const id = this.branches.length;
        const rr = Math.max(r, R_IDEAL);
        this.branches.push({ id, kind: 'Z', a, b, z: C(rr, x), s: ZERO, aux: -1, owner, tag });
        return id;
    }
    addV(a, b, mag, deg, zr = 0, zx = 0, owner, tag) {
        const id = this.branches.length;
        const aux = this.nAux++;
        this.branches.push({ id, kind: 'V', a, b, z: C(zr, zx), s: polar(mag, deg), aux, owner, tag });
        return id;
    }
    addI(a, b, mag, deg, owner, tag) {
        const id = this.branches.length;
        this.branches.push({ id, kind: 'I', a, b, z: ZERO, s: polar(mag, deg), aux: -1, owner, tag });
        return id;
    }
    /** Leakage to earth from a node (insulation resistance). */
    addLeak(a, r, owner) {
        return this.addZ(a, EARTH, r, 0, owner, 'leak');
    }
    solve() {
        const n = this.nodeNames.length;
        const size = n + this.nAux;
        const mb = new MatrixBuilder(size);
        // Baseline insulation: every node leaks to earth through R_INSULATION.
        const gIns = C(1 / R_INSULATION, 0);
        for (let i = 0; i < n; i++)
            mb.add(i, i, gIns);
        for (const br of this.branches) {
            if (br.kind === 'Z') {
                const y = cdiv(C(1), br.z);
                if (br.a >= 0)
                    mb.add(br.a, br.a, y);
                if (br.b >= 0)
                    mb.add(br.b, br.b, y);
                if (br.a >= 0 && br.b >= 0) {
                    mb.add(br.a, br.b, { re: -y.re, im: -y.im });
                    mb.add(br.b, br.a, { re: -y.re, im: -y.im });
                }
            }
            else if (br.kind === 'I') {
                // Current source drives `s` amperes from node a to node b.
                if (br.a >= 0)
                    mb.addB(br.a, { re: -br.s.re, im: -br.s.im });
                if (br.b >= 0)
                    mb.addB(br.b, br.s);
            }
            else {
                const k = n + br.aux;
                if (br.a >= 0) {
                    mb.add(br.a, k, C(1));
                    mb.add(k, br.a, C(1));
                }
                if (br.b >= 0) {
                    mb.add(br.b, k, C(-1));
                    mb.add(k, br.b, C(-1));
                }
                // V = Va - Vb - I*Zs  →  Va - Vb - I*Zs = s
                mb.add(k, k, { re: -br.z.re, im: -br.z.im });
                mb.addB(k, br.s);
            }
        }
        const x = mb.solve();
        const v = x.slice(0, n);
        const aux = x.slice(n);
        return new Solution(this, v, aux);
    }
}
export class Solution {
    net;
    nodeV;
    auxI;
    constructor(net, nodeV, auxI) {
        this.net = net;
        this.nodeV = nodeV;
        this.auxI = auxI;
    }
    /** Complex potential of a node with respect to true earth. */
    v(i) {
        if (i === EARTH || i < 0)
            return ZERO;
        return this.nodeV[i] ?? ZERO;
    }
    vmag(i) {
        return cabs(this.v(i));
    }
    /** Complex voltage across a branch (a − b). */
    vacross(id) {
        const br = this.net.branches[id];
        if (!br)
            return ZERO;
        return csub(this.v(br.a), this.v(br.b));
    }
    /** Complex current through a branch, positive from a to b. */
    i(id) {
        const br = this.net.branches[id];
        if (!br)
            return ZERO;
        if (br.kind === 'Z')
            return cdiv(csub(this.v(br.a), this.v(br.b)), br.z);
        if (br.kind === 'I')
            return br.s;
        // Voltage source: the auxiliary unknown is the current a→b.
        return this.auxI[br.aux] ?? ZERO;
    }
    imag(id) {
        return cabs(this.i(id));
    }
    /** Active power dissipated in a branch (W). */
    p(id) {
        const s = cmul(this.vacross(id), cconj(this.i(id)));
        return s.re;
    }
}
/** Impedance of a load from its rated active power, voltage and power factor. */
export function loadImpedance(watts, volts, cosPhi) {
    if (watts <= 0 || volts <= 0)
        return { r: 1e9, x: 0 };
    const pf = Math.min(1, Math.max(0.05, cosPhi));
    const s = watts / pf; // apparent power
    const zmag = (volts * volts) / s;
    const r = zmag * pf;
    const x = zmag * Math.sqrt(Math.max(0, 1 - pf * pf));
    return { r, x };
}
export { cabs, cadd, csub, cmul, cdiv, cscale, polar, C };
