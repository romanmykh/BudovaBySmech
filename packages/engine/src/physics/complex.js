export const C = (re, im = 0) => ({ re, im });
export const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
export const csub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
export const cmul = (a, b) => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
});
export const cscale = (a, k) => ({ re: a.re * k, im: a.im * k });
export function cdiv(a, b) {
    const d = b.re * b.re + b.im * b.im;
    if (d === 0)
        return { re: 0, im: 0 };
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
export const cabs = (a) => Math.hypot(a.re, a.im);
export const carg = (a) => Math.atan2(a.im, a.re);
export const cconj = (a) => ({ re: a.re, im: -a.im });
export const cneg = (a) => ({ re: -a.re, im: -a.im });
/** Phasor from magnitude and phase in degrees. */
export const polar = (mag, deg) => {
    const r = (deg * Math.PI) / 180;
    return { re: mag * Math.cos(r), im: mag * Math.sin(r) };
};
export const cinv = (a) => cdiv(C(1), a);
export const ZERO = { re: 0, im: 0 };
