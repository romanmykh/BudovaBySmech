import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  terminalsOf, measureVoltage, measureClamp, measureInsulation, measureLoop,
  testRcd, measureRotation, testSocket, getDef,
} from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';

type Tool = 'multimeter' | 'clamp' | 'insulation' | 'loop' | 'rcd' | 'rotation' | 'socket';

interface Probe {
  comp: string;
  terminal: string;
}

export function InstrumentPanel(): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const sim = useSim((s) => s.simulator());
  const tick = useSim((s) => s.tick);
  const [tool, setTool] = useState<Tool>('multimeter');
  const [a, setA] = useState<Probe>({ comp: '', terminal: '' });
  const [b, setB] = useState<Probe>({ comp: '', terminal: '' });
  const [wireId, setWireId] = useState('');
  const [socketId, setSocketId] = useState('');
  const [multiplier, setMultiplier] = useState<0.5 | 1 | 2 | 5>(1);
  const [testV, setTestV] = useState(500);
  const [result, setResult] = useState<JSX.Element | null>(null);

  const sockets = useMemo(
    () => project.components.filter((c) => getDef(c.type)?.flags?.socket),
    [project.components],
  );

  const run = () => {
    try {
      switch (tool) {
        case 'multimeter': {
          if (!a.comp || !b.comp) return;
          const v = measureVoltage(sim, a, b);
          setResult(<Value label={t('inst.reading')} value={`${v.toFixed(2)} V`} />);
          break;
        }
        case 'clamp': {
          const i = measureClamp(sim, wireId);
          setResult(<Value label={t('inst.reading')} value={i >= 1 ? `${i.toFixed(3)} A` : `${(i * 1000).toFixed(1)} mA`} />);
          break;
        }
        case 'insulation': {
          if (!a.comp || !b.comp) return;
          const r = measureInsulation(sim, a, b, testV);
          setResult(
            <>
              <Value label={t('inst.insulation')} value={r.megohms > 999 ? '> 999 MΩ' : `${r.megohms.toFixed(1)} MΩ`} />
              <Verdict ok={r.pass} />
              <div className="faint mt-1">{t('inst.limit')}: {(r.limit / 1e6).toFixed(0)} MΩ @ {r.testVoltage} V</div>
            </>,
          );
          break;
        }
        case 'loop': {
          if (!a.comp || !b.comp) return;
          const r = measureLoop(sim, a, b, 'L-PE');
          setResult(
            <>
              <Value label={t('inst.zs')} value={Number.isFinite(r.zs) ? `${r.zs.toFixed(3)} Ω` : '∞'} />
              <Value label={t('inst.ipf')} value={`${r.ipf.toFixed(0)} A`} />
            </>,
          );
          break;
        }
        case 'rcd': {
          if (!a.comp) return;
          const r = testRcd(sim, a, multiplier);
          if (!r.found) {
            setResult(<div style={{ color: 'var(--fail)' }}>{t('inst.noRcd')}</div>);
            break;
          }
          setResult(
            <>
              <Value label={t('prop.idn')} value={`${Math.round((r.idn ?? 0) * 1000)} mA ${r.type}`} />
              <Value
                label={t('inst.tripTime')}
                value={r.tripMs === null ? '—' : `${r.tripMs} ms`}
              />
              {r.limitMs !== null && <div className="faint">{t('inst.limit')}: {r.limitMs} ms</div>}
              {r.tripCurrentMa && <Value label={t('inst.tripCurrent')} value={`${r.tripCurrentMa} mA`} />}
              {r.note && <div className="dim mt-1">{t(`inst.${r.note}`, { defaultValue: r.note })}</div>}
              <Verdict ok={r.pass} />
            </>,
          );
          break;
        }
        case 'rotation': {
          const supply = project.components.find((c) => c.type === 'supply');
          if (!supply) return;
          const r = measureRotation(
            sim,
            { comp: supply.id, terminal: 'L1' },
            { comp: supply.id, terminal: 'L2' },
            { comp: supply.id, terminal: 'L3' },
          );
          setResult(
            <>
              <Value
                label={t('inst.rotation')}
                value={r.rotation === 'incomplete' ? t('inst.rotation.incomplete') : r.rotation}
              />
              <div className="faint mono mt-1">
                {(['L1', 'L2', 'L3'] as const).map((k) => `${k} ${r.voltages[k].toFixed(0)} V`).join(' · ')}
              </div>
            </>,
          );
          break;
        }
        case 'socket': {
          if (!socketId) return;
          const r = testSocket(sim, socketId);
          setResult(
            <>
              <Value label="U L-N" value={`${r.uLN.toFixed(1)} V`} />
              <Value label="U L-PE" value={`${r.uLPE.toFixed(1)} V`} />
              <Value label="U N-PE" value={`${r.uNPE.toFixed(1)} V`} />
              {r.correct ? (
                <div className="mt-1" style={{ color: 'var(--ok)' }}>{t('inst.socketOk')}</div>
              ) : (
                <ul className="mt-1">
                  {r.faults.map((f) => (
                    <li key={f} style={{ color: 'var(--fail)' }}>
                      {t(`inst.socket.${f}`, { defaultValue: f })}
                    </li>
                  ))}
                </ul>
              )}
            </>,
          );
          break;
        }
      }
    } catch (err) {
      setResult(<div style={{ color: 'var(--fail)' }}>{String((err as Error).message)}</div>);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-2.5 text-xs" key={tick}>
      <div className="sect-title mb-2">{t('inst.title')}</div>

      <select className="mb-2" value={tool} onChange={(e) => { setTool(e.target.value as Tool); setResult(null); }}>
        <option value="multimeter">{t('comp.multimeter')}</option>
        <option value="clamp">{t('comp.clampMeter')}</option>
        <option value="insulation">{t('comp.insulationTester')}</option>
        <option value="loop">{t('comp.loopTester')}</option>
        <option value="rcd">{t('comp.rcdTester')}</option>
        <option value="rotation">{t('comp.phaseTester')}</option>
        <option value="socket">{t('comp.socketTester')}</option>
      </select>

      {(tool === 'multimeter' || tool === 'insulation' || tool === 'loop' || tool === 'rcd') && (
        <ProbePicker label={t('inst.probeA')} value={a} onChange={setA} />
      )}
      {(tool === 'multimeter' || tool === 'insulation' || tool === 'loop') && (
        <ProbePicker label={t('inst.probeB')} value={b} onChange={setB} />
      )}

      {tool === 'clamp' && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('prop.wireId')}</span>
          <select value={wireId} onChange={(e) => setWireId(e.target.value)}>
            <option value="">—</option>
            {project.wires.map((w) => {
              const from = project.components.find((c) => c.id === w.from.comp);
              const to = project.components.find((c) => c.id === w.to.comp);
              return (
                <option key={w.id} value={w.id}>
                  {`${w.role} ${w.csa} — ${from?.label ?? from?.type ?? '?'} → ${to?.label ?? to?.type ?? '?'}`}
                </option>
              );
            })}
          </select>
        </label>
      )}

      {tool === 'socket' && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('comp.socket16')}</span>
          <select value={socketId} onChange={(e) => setSocketId(e.target.value)}>
            <option value="">—</option>
            {sockets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label ?? s.id}
              </option>
            ))}
          </select>
        </label>
      )}

      {tool === 'insulation' && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('prop.testV')}</span>
          <select value={testV} onChange={(e) => setTestV(Number(e.target.value))}>
            {[250, 500, 1000].map((v) => (
              <option key={v} value={v}>
                {v} V
              </option>
            ))}
          </select>
        </label>
      )}

      {tool === 'rcd' && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('prop.multiplier')}</span>
          <select value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value) as 0.5 | 1 | 2 | 5)}>
            {[0.5, 1, 2, 5].map((m) => (
              <option key={m} value={m}>
                {m}× IΔn
              </option>
            ))}
          </select>
        </label>
      )}

      <button className="btn mt-1" onClick={run}>
        {t('inst.measure')}
      </button>

      {result && (
        <div className="mt-3 rounded p-2" style={{ background: 'var(--bg-sunken)' }}>
          {result}
        </div>
      )}
    </div>
  );
}

function ProbePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Probe;
  onChange(p: Probe): void;
}): JSX.Element {
  const project = useProject((s) => s.project);
  const comp = project.components.find((c) => c.id === value.comp);
  const terms = comp ? terminalsOf(comp.type, comp.props) : [];
  return (
    <div className="mb-1.5">
      <span className="dim text-[11px]">{label}</span>
      <div className="flex gap-1">
        <select value={value.comp} onChange={(e) => onChange({ comp: e.target.value, terminal: '' })}>
          <option value="">—</option>
          {project.components.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label ?? c.id}
            </option>
          ))}
        </select>
        <select value={value.terminal} onChange={(e) => onChange({ ...value, terminal: e.target.value })}>
          <option value="">—</option>
          {terms.map((x) => (
            <option key={x.id} value={x.id}>
              {x.mark ?? x.id}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Value({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="dim">{label}</span>
      <span className="mono text-sm font-semibold">{value}</span>
    </div>
  );
}

function Verdict({ ok }: { ok: boolean }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="mt-1 font-semibold" style={{ color: ok ? 'var(--ok)' : 'var(--fail)' }}>
      {ok ? t('report.pass') : t('report.fail')}
    </div>
  );
}
