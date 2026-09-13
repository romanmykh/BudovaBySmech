import { cadd, cdiv, cmul, csub, cabs } from './complex.js';
/**
 * Dense complex linear system solver, Gaussian elimination with partial pivoting.
 * The matrices produced by modified nodal analysis of a domestic installation are
 * small (tens to a few hundred unknowns), so a dense solve is the right trade-off.
 *
 * Storage is row-major: A[i * n + j].
 */
export function solveComplex(A, b, n) {
    // Work on copies.
    const a = A.slice();
    const x = b.slice();
    for (let k = 0; k < n; k++) {
        // Partial pivoting on magnitude.
        let piv = k;
        let best = cabs(a[k * n + k]);
        for (let i = k + 1; i < n; i++) {
            const m = cabs(a[i * n + k]);
            if (m > best) {
                best = m;
                piv = i;
            }
        }
        if (best < 1e-300) {
            // Structurally singular: leave this unknown at zero rather than producing NaN.
            continue;
        }
        if (piv !== k) {
            for (let j = 0; j < n; j++) {
                const t = a[k * n + j];
                a[k * n + j] = a[piv * n + j];
                a[piv * n + j] = t;
            }
            const t = x[k];
            x[k] = x[piv];
            x[piv] = t;
        }
        const akk = a[k * n + k];
        for (let i = k + 1; i < n; i++) {
            const aik = a[i * n + k];
            if (aik.re === 0 && aik.im === 0)
                continue;
            const f = cdiv(aik, akk);
            a[i * n + k] = { re: 0, im: 0 };
            for (let j = k + 1; j < n; j++) {
                a[i * n + j] = csub(a[i * n + j], cmul(f, a[k * n + j]));
            }
            x[i] = csub(x[i], cmul(f, x[k]));
        }
    }
    // Back substitution.
    const out = new Array(n).fill(null).map(() => ({ re: 0, im: 0 }));
    for (let i = n - 1; i >= 0; i--) {
        let s = x[i];
        for (let j = i + 1; j < n; j++)
            s = csub(s, cmul(a[i * n + j], out[j]));
        const aii = a[i * n + i];
        if (cabs(aii) < 1e-300) {
            out[i] = { re: 0, im: 0 };
        }
        else {
            out[i] = cdiv(s, aii);
        }
    }
    for (let i = 0; i < n; i++) {
        if (!Number.isFinite(out[i].re) || !Number.isFinite(out[i].im))
            out[i] = { re: 0, im: 0 };
    }
    return out;
}
/** Sparse-ish accumulating builder for the MNA system. */
export class MatrixBuilder {
    n;
    A;
    b;
    constructor(n) {
        this.n = n;
        this.A = new Array(n * n).fill(null).map(() => ({ re: 0, im: 0 }));
        this.b = new Array(n).fill(null).map(() => ({ re: 0, im: 0 }));
    }
    add(i, j, v) {
        if (i < 0 || j < 0)
            return;
        const k = i * this.n + j;
        this.A[k] = cadd(this.A[k], v);
    }
    addB(i, v) {
        if (i < 0)
            return;
        this.b[i] = cadd(this.b[i], v);
    }
    solve() {
        return solveComplex(this.A, this.b, this.n);
    }
}
