import { useEffect, useRef, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useSim } from '../store/sim.js';
import { useProject } from '../store/project.js';

const LEVEL_COLOR: Record<string, string> = {
  info: 'var(--text-dim)',
  warn: 'var(--warn)',
  danger: 'var(--fail)',
  trip: 'var(--accent)',
};

export function LogPanel(): JSX.Element {
  const { t } = useTranslation();
  const log = useSim((s) => s.log);
  const clearLog = useSim((s) => s.clearLog);
  const select = useProject((s) => s.select);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [log.length]);

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="flex items-center justify-between border-b px-2.5 py-1.5" style={{ borderColor: 'var(--border)' }}>
        <span className="sect-title">{t('log.title')}</span>
        <button className="btn btn-sm" onClick={clearLog}>
          {t('action.clear')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        {!log.length && <div className="dim p-2 text-center">{t('log.empty')}</div>}
        <ul className="flex flex-col gap-0.5">
          {log.map((e, i) => (
            <li
              key={`${e.t}-${i}`}
              className="cursor-pointer rounded px-1.5 py-1 hover:bg-[var(--bg-hover)]"
              onClick={() => e.comp && select([e.comp])}
            >
              <div className="flex gap-2">
                <span className="faint shrink-0 mono">{e.t.toFixed(2)} s</span>
                <span style={{ color: LEVEL_COLOR[e.level] ?? 'var(--text)' }}>
                  {t(e.key, { ...(e.vars ?? {}), defaultValue: e.key })}
                </span>
              </div>
              {e.ref && (
                <div className="faint pl-[52px] text-[10px]">
                  {e.ref}
                  {e.refToVerify ? ` · ${t('report.toVerify')}` : ''}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div ref={endRef} />
      </div>
    </div>
  );
}
