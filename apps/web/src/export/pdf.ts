import { jsPDF } from 'jspdf';
import type { Project, RuleReport } from '@budova/engine';
import { svgToPng } from './svg.js';

type TFn = (key: string, options?: any) => string;

/** The schematic or the panel layout as a landscape A4 PDF. */
export async function exportDrawingPdf(el: SVGSVGElement, name: string): Promise<void> {
  const blob = await svgToPng(el, 2);
  const dataUrl = await blobToDataUrl(blob);
  const img = await loadImage(dataUrl);
  const landscape = img.width >= img.height;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 10;
  const scale = Math.min((pw - margin * 2) / img.width, (ph - margin * 2 - 8) / img.height);
  doc.setFontSize(10);
  doc.text(name, margin, margin);
  doc.addImage(dataUrl, 'PNG', margin, margin + 4, img.width * scale, img.height * scale);
  doc.save(`${name}.pdf`);
}

/** The design rule check as a printable report. */
export function exportReportPdf(project: Project, report: RuleReport, t: TFn): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const line = (text: string, size = 9, style: 'normal' | 'bold' = 'normal', indent = 0) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    const lines = doc.splitTextToSize(text, pw - margin * 2 - indent);
    for (const l of lines) {
      if (y > ph - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(l, margin + indent, y);
      y += size * 0.42 + 1.4;
    }
  };

  line(t('report.title'), 15, 'bold');
  line(`${t('report.project')}: ${project.name}`, 10);
  line(`${t('report.generatedAt')}: ${new Date(report.generatedAt).toLocaleString()}`, 9);
  line(t('report.summary', report.summary), 10, 'bold');
  y += 2;

  const order: Array<'fail' | 'warn' | 'pass' | 'na'> = ['fail', 'warn', 'pass', 'na'];
  for (const status of order) {
    const items = report.findings.filter((f) => f.status === status);
    if (!items.length) continue;
    y += 3;
    line(`${t(`report.${status}`)} (${items.length})`, 11, 'bold');
    for (const f of items) {
      const vars = { ...(f.vars ?? {}) } as Record<string, string | number>;
      if (typeof vars.kind === 'string') vars.kind = t(`circuitKind.${vars.kind}`, { defaultValue: vars.kind });
      line(`• ${t(`rule.${f.rule}.title`, { defaultValue: f.rule })}`, 9, 'bold', 2);
      line(t(f.key, { ...vars, defaultValue: f.key }), 9, 'normal', 6);
      if (f.ref) {
        line(`${t('report.reference')}: ${f.ref}${f.refToVerify ? ` (${t('report.toVerify')})` : ''}`, 8, 'normal', 6);
      }
    }
  }

  y += 4;
  line(t('report.toVerifyHint'), 8);
  doc.save(`${project.name || 'revize'}.pdf`);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('read failed'));
    fr.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image failed'));
    img.src = src;
  });
}
