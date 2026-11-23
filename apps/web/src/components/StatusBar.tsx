import { useMemo, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { getDef, effectiveProps } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';

export function StatusBar(): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const results = useSim((s) => s.results);
  const running = useSim((s) => s.running);

  const installed = useMemo(
    () =>
      project.components.reduce((sum, c) => {
        const def = getDef(c.type);
        if (!def?.flags?.load) return sum;
        const p = effectiveProps(c.type, c.props);
        const w = c.type === 'evse' ? Number(p.powerKw) * 1000 : Number(p.watts);
        return sum + (Number.isFinite(w) ? w : 0);
      }, 0),
    [project.components],
  );

  const i = results.phaseI;
  const maxI = Math.max(i.L1, i.L2, i.L3);
  const minI = Math.min(i.L1, i.L2, i.L3);
  const imbalance = maxI > 0.05 ? ((maxI - minI) / maxI) * 100 : 0;
  const trippedCount = Object.values(results.state).filter((s: any) => s?.tripped || s?.blown).length;

  return (
    <div
      className="flex shrink-0 items-center gap-x-4 gap-y-0.5 overflow-x-auto border-t px-2 py-1 text-[11px] whitespace-nowrap no-print mono md:flex-wrap md:whitespace-normal"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      <span className="flex items-center gap-1">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: running ? 'var(--ok)' : 'var(--text-faint)' }}
        />
        {running ? t('status.running') : t('status.stopped')}
      </span>
      <span className="dim">
        {t('status.simTime')} <b className="text-[var(--text)]">{formatTime(results.t)}</b>
      </span>
      <span className="dim hidden sm:inline">
        {t('status.perPhase')}{' '}
        <b className="text-[var(--live-l1)]">{i.L1.toFixed(1)}</b>/
        <b className="text-[var(--live-l2)]">{i.L2.toFixed(1)}</b>/
        <b className="text-[var(--live-l3)]">{i.L3.toFixed(1)}</b> A
      </span>
      <span className="dim hidden md:inline">
        {t('status.imbalance')} <b className="text-[var(--text)]">{imbalance.toFixed(0)} %</b>
      </span>
      <span className="dim">
        {t('status.simultaneous')} <b className="text-[var(--text)]">{(results.totalP / 1000).toFixed(2)} kW</b>
      </span>
      <span className="dim hidden md:inline">
        {t('status.installed')} <b className="text-[var(--text)]">{(installed / 1000).toFixed(2)} kW</b>
      </span>
      {results.maxTouchVoltage > 25 && (
        <span style={{ color: 'var(--fail)' }}>
          {t('status.touchVoltage')} <b>{results.maxTouchVoltage.toFixed(0)} V</b>
        </span>
      )}
      {results.bodyCurrent > 0.0005 && (
        <span style={{ color: 'var(--fail)' }}>
          {t('status.bodyCurrent')} <b>{(results.bodyCurrent * 1000).toFixed(1)} mA</b>
        </span>
      )}
      {trippedCount > 0 && (
        <span style={{ color: 'var(--warn)' }}>{t('status.tripped', { count: trippedCount })}</span>
      )}
    </div>
  );
}

function formatTime(s: number): string {
  if (s < 60) return `${s.toFixed(2)} s`;
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
