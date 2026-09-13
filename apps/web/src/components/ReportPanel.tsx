import { useEffect, useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { FindingStatus, RuleFinding } from '@budova/engine';
import { useSim } from '../store/sim.js';
import { useUi } from '../store/ui.js';
import { useProject } from '../store/project.js';
import { exportReportPdf } from '../export/pdf.js';

const STATUS_COLOR: Record<FindingStatus, string> = {
  pass: 'var(--ok)',
  warn: 'var(--warn)',
  fail: 'var(--fail)',
  na: 'var(--text-faint)',
};

export function ReportPanel(): JSX.Element {
  const { t } = useTranslation();
  const report = useSim((s) => s.report);
  const runCheck = useSim((s) => s.runCheck);
  const project = useProject((s) => s.project);
  const ui = useUi();
  const [filter, setFilter] = useState<FindingStatus | 'all'>('all');

  useEffect(() => {
    if (!report) runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findings = useMemo(
    () => (report ? report.findings.filter((f) => filter === 'all' || f.status === filter) : []),
    [report, filter],
  );

  const standards = useMemo(() => {
    const set = new Set<string>();
    for (const f of report?.findings ?? []) if (f.ref) set.add(f.ref.split(',')[0]);
    return [...set].sort();
  }, [report]);

  if (!report) {
    return (
      <div className="flex h-full items-center justify-center">
        <button className="btn" onClick={() => runCheck()}>
          {t('report.run')}
        </button>
      </div>
    );
  }

  const failed = report.summary.fail > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div
        className="flex flex-wrap items-center gap-2 border-b px-3 py-2 no-print"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
      >
        <div>
          <div className="font-semibold">{t('report.title')}</div>
          <div className="faint text-[11px]">{t('report.subtitle')}</div>
        </div>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 md:ml-2">
          {(['all', 'fail', 'warn', 'pass', 'na'] as const).map((s) => (
            <button key={s} className="btn btn-sm" data-on={filter === s} onClick={() => setFilter(s)}>
              {s === 'all' ? t('report.all') : t(`report.${s}`)}
              {s !== 'all' && <span className="faint ml-1">{report.summary[s]}</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-1 md:ml-auto">
          <button className="btn btn-sm" onClick={() => runCheck()}>
            {t('action.check')}
          </button>
          <button className="btn btn-sm" onClick={() => exportReportPdf(project, report, t)}>
            {t('action.exportPdf')}
          </button>
          <button className="btn btn-sm" onClick={() => window.print()}>
            ⎙
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-4xl">
          <div
            className="mb-3 rounded p-3"
            style={{
              background: 'var(--bg-panel)',
              border: `1px solid ${failed ? 'var(--fail)' : 'var(--ok)'}`,
            }}
          >
            <div className="text-sm font-semibold" style={{ color: failed ? 'var(--fail)' : 'var(--ok)' }}>
              {failed ? t('report.overallFail') : t('report.overallPass')}
            </div>
            <div className="dim mt-1 text-xs">
              {t('report.summary', report.summary)}
            </div>
            <div className="faint mt-1 text-[11px]">
              {t('report.project')}: {report.projectName} · {t('report.generatedAt')}:{' '}
              {new Date(report.generatedAt).toLocaleString()}
            </div>
          </div>

          <ul className="flex flex-col gap-1.5">
            {findings.map((f, i) => (
              <FindingRow key={`${f.rule}-${i}`} f={f} onShow={() => ui.setHighlight(f.components ?? [], f.wires ?? [])} />
            ))}
          </ul>

          {standards.length > 0 && (
            <div className="mt-5 rounded p-3 text-xs" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
              <div className="sect-title mb-1">{t('report.standards')}</div>
              <ul className="dim flex flex-col gap-0.5">
                {standards.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <div className="faint mt-2 text-[11px]">{t('report.toVerifyHint')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FindingRow({ f, onShow }: { f: RuleFinding; onShow(): void }): JSX.Element {
  const { t } = useTranslation();
  const ui = useUi();
  const vars = { ...(f.vars ?? {}) } as Record<string, string | number>;
  // Appliance and circuit-kind variables carry keys, not display text.
  if (typeof vars.appliance === 'string') vars.appliance = t(`comp.${applianceType(vars.appliance)}`);
  if (typeof vars.kind === 'string') vars.kind = t(`circuitKind.${vars.kind}`, { defaultValue: vars.kind });

  return (
    <li
      className="rounded p-2"
      style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
          style={{ background: STATUS_COLOR[f.status], color: '#fff' }}
        >
          {t(`report.${f.status}`)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold">{t(`rule.${f.rule}.title`, { defaultValue: f.rule })}</div>
          <div className="mt-0.5 text-xs">{t(f.key, { ...vars, defaultValue: f.key })}</div>
          {f.ref && (
            <div className="faint mt-1 text-[11px]">
              {t('report.reference')}: {f.ref}
              {f.refToVerify && <span style={{ color: 'var(--warn)' }}> · {t('report.toVerify')}</span>}
            </div>
          )}
        </div>
        {(f.components?.length || f.wires?.length) && (
          <button
            className="btn btn-sm no-print"
            onClick={() => {
              onShow();
              ui.set('view', 'schematic');
            }}
          >
            {t('report.showOn')}
          </button>
        )}
      </div>
    </li>
  );
}

function applianceType(key: string): string {
  const map: Record<string, string> = {
    cooker: 'cooker3f',
    boiler: 'boiler',
    washingMachine: 'washingMachine',
    dishwasher: 'dishwasher',
    evse: 'evse',
  };
  return map[key] ?? key;
}
