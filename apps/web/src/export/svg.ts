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

/** Padding around the drawing in an exported file. */
const EXPORT_PAD = 40;

/**
 * A standalone SVG string with every CSS variable resolved.
 *
 * When the source carries a content group (the pannable/zoomable layer of the
 * schematic), the export is framed on the whole drawing rather than on whatever
 * happens to be visible on screen, and the pan and zoom are discarded.
 */
export function serializeSvg(source: SVGSVGElement, background?: string): string {
  const vars = cssVars();
  const content = source.querySelector('#schematic-root') as SVGGElement | null;

  let clone: SVGSVGElement;
  let width: number;
  let height: number;

  if (content) {
    const bbox = content.getBBox();
    width = Math.ceil(bbox.width) + EXPORT_PAD * 2;
    height = Math.ceil(bbox.height) + EXPORT_PAD * 2;
    clone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    clone.setAttribute(
      'viewBox',
      `${Math.floor(bbox.x) - EXPORT_PAD} ${Math.floor(bbox.y) - EXPORT_PAD} ${width} ${height}`,
    );
    // Carry the definitions across, then the drawing itself without its
    // on-screen pan and zoom transform.
    const defs = source.querySelector('defs');
    if (defs) clone.appendChild(defs.cloneNode(true));
    const g = content.cloneNode(true) as SVGGElement;
    g.removeAttribute('transform');
    clone.appendChild(g);
  } else {
    clone = source.cloneNode(true) as SVGSVGElement;
    const bbox = source.getBBox ? source.getBBox() : null;
    width = Number(source.getAttribute('width')) || source.clientWidth || bbox?.width || 1000;
    height = Number(source.getAttribute('height')) || source.clientHeight || bbox?.height || 700;
    if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`);
  }

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(Math.ceil(width)));
  clone.setAttribute('height', String(Math.ceil(height)));
  clone.removeAttribute('class');
  clone.removeAttribute('style');

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
  const vb = (clone.getAttribute('viewBox') ?? '0 0 0 0').split(/\s+/).map(Number);
  const rect =
    `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${bg}"/>`;
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
  const dim = /width="(\d+)"\s+height="(\d+)"/.exec(svg);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not rasterise the drawing'));
      img.src = url;
    });
    const w = (dim ? Number(dim[1]) : el.clientWidth || 1000) * scale;
    const h = (dim ? Number(dim[2]) : el.clientHeight || 700) * scale;
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
