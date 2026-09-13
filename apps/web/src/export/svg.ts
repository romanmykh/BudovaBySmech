/**
 * Export helpers. The drawing is SVG on screen, but it uses CSS custom
 * properties for colour, so the exported file has to carry resolved values.
 */

function cssVars(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const names = [
    'bg', 'bg-panel', 'bg-sunken', 'bg-hover', 'bg-active', 'border', 'border-strong',
    'text', 'text-dim', 'text-faint', 'accent', 'accent-text', 'grid', 'grid-strong',
    'canvas', 'ok', 'warn', 'fail', 'danger', 'live-l1', 'live-l2', 'live-l3', 'live-n', 'live-pe',
  ];
  const out: Record<string, string> = {};
  for (const n of names) out[`--${n}`] = style.getPropertyValue(`--${n}`).trim() || '#000';
  return out;
}

function resolve(value: string, vars: Record<string, string>): string {
  return value.replace(/var\((--[a-z0-9-]+)\)/gi, (_, name: string) => vars[name] ?? '#000');
}

const COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'color'];

/** A standalone SVG string with every CSS variable resolved. */
export function serializeSvg(source: SVGSVGElement, background?: string): string {
  const vars = cssVars();
  const clone = source.cloneNode(true) as SVGSVGElement;

  const bbox = source.getBBox ? source.getBBox() : null;
  const width = Number(source.getAttribute('width')) || source.clientWidth || bbox?.width || 1000;
  const height = Number(source.getAttribute('height')) || source.clientHeight || bbox?.height || 700;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(Math.ceil(width)));
  clone.setAttribute('height', String(Math.ceil(height)));
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`);

  clone.querySelectorAll('*').forEach((el) => {
    for (const attr of COLOR_ATTRS) {
      const v = el.getAttribute(attr);
      if (v && v.includes('var(')) el.setAttribute(attr, resolve(v, vars));
    }
    const style = el.getAttribute('style');
    if (style && style.includes('var(')) el.setAttribute('style', resolve(style, vars));
    // The flow animation has no meaning in a static export.
    el.classList?.remove('flowing');
  });

  const bg = background ?? vars['--canvas'];
  const rect = `<rect width="100%" height="100%" fill="${bg}"/>`;
  const inner = clone.innerHTML;
  clone.innerHTML = rect + inner;

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

export function download(name: string, data: BlobPart, mime: string): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportSvg(el: SVGSVGElement, name: string): void {
  download(`${name}.svg`, serializeSvg(el), 'image/svg+xml');
}

/** Rasterise the SVG through an offscreen canvas. */
export async function svgToPng(el: SVGSVGElement, scale = 2): Promise<Blob> {
  const svg = serializeSvg(el, '#ffffff');
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not rasterise the drawing'));
      img.src = url;
    });
    const w = (Number(el.getAttribute('width')) || el.clientWidth || 1000) * scale;
    const h = (Number(el.getAttribute('height')) || el.clientHeight || 700) * scale;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w);
    canvas.height = Math.ceil(h);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportPng(el: SVGSVGElement, name: string): Promise<void> {
  const blob = await svgToPng(el);
  download(`${name}.png`, blob, 'image/png');
}
