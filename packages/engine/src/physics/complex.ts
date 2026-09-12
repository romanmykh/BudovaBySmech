/** Minimal complex arithmetic for 50 Hz phasor analysis. */
export interface Cx { re: number; im: number }

export const C = (re: number, im = 0): Cx => ({ re, im });
export const cadd = (a: Cx, b: Cx): Cx => ({ re: a.re + b.re, im: a.im + b.im });
export const csub = (a: Cx, b: Cx): Cx => ({ re: a.re - b.re, im: a.im - b.im });
export const cmul = (a: Cx, b: Cx): Cx => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cscale = (a: Cx, k: number): Cx => ({ re: a.re * k, im: a.im * k });
export function cdiv(a: Cx, b: Cx): Cx {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) return { re: 0, im: 0 };
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
export const cabs = (a: Cx): number => Math.hypot(a.re, a.im);
export const carg = (a: Cx): number => Math.atan2(a.im, a.re);
export const cconj = (a: Cx): Cx => ({ re: a.re, im: -a.im });
export const cneg = (a: Cx): Cx => ({ re: -a.re, im: -a.im });
/** Phasor from magnitude and phase in degrees. */
export const polar = (mag: number, deg: number): Cx => {
  const r = (deg * Math.PI) / 180;
  return { re: mag * Math.cos(r), im: mag * Math.sin(r) };
};
export const cinv = (a: Cx): Cx => cdiv(C(1), a);
export const ZERO: Cx = { re: 0, im: 0 };
