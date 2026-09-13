import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { terminalsOf, uid, type FaultKind } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';

const KINDS: FaultKind[] = [
  'shortLN', 'shortLPE', 'shortLL', 'earthFault', 'touch', 'insulation',
  'lossPE', 'lossPhase', 'surge', 'cableDamage', 'arc', 'dcResidual',
];

export function FaultPanel(): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const selection = useProject((s) => s.selection);
  const faults = useSim((s) => s.faults);
  const sim = useSim();

  const [kind, setKind] = useState<FaultKind>('shortLN');
  const [target, setTarget] = useState<string>('');
  const [terminal, setTerminal] = useState<string>('');
  const [terminal2, setTerminal2] = useState<string>('');
  const [resistance, setResistance] = useState(0.01);
  const [bodyR, setBodyR] = useState(1000);
  const [standR, setStandR] = useState(1000);
  const [surgeV, setSurgeV] = useState(4000);
  const [arcA, setArcA] = useState(5);
  const [dcMa, setDcMa] = useState(10);
  const [wire, setWire] = useState('');

  const effectiveTarget = target || selection[0] || project.components[0]?.id || '';
  const targetComp = project.components.find((c) => c.id === effectiveTarget);
  const terminals = useMemo(
    () => (targetComp ? terminalsOf(targetComp.type, targetComp.props) : []),
    [targetComp],
  );

  const needsTerminal = ['shortLN', 'shortLPE', 'shortLL', 'earthFault', 'touch', 'insulation', 'lossPhase'].includes(kind);
  const needsSecond = ['shortLN', 'shortLPE', 'shortLL'].includes(kind);
  const needsWire = kind === 'cableDamage' || kind === 'lossPE';

  const add = () => {
    if (!effectiveTarget) return;
    sim.addFault({
      id: uid('f'),
      kind,
      target: effectiveTarget,
      terminal: needsTerminal ? terminal || undefined : undefined,
      terminal2: needsSecond ? terminal2 || undefined : undefined,
      resistance: ['shortLN', 'shortLPE', 'shortLL', 'earthFault', 'insulation'].includes(kind)
        ? resistance
        : kind === 'cableDamage' || kind === 'lossPE'
          ? 1e9
          : undefined,
      bodyResistance: kind === 'touch' ? bodyR : undefined,
      standingResistance: kind === 'touch' ? standR : undefined,
      surgeV: kind === 'surge' ? surgeV : undefined,
      arcCurrent: kind === 'arc' ? arcA : undefined,
      dcResidual: kind === 'dcResidual' ? dcMa / 1000 : undefined,
      wire: needsWire ? wire || undefined : undefined,
      enabled: true,
    });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-2.5 text-xs">
      <div className="sect-title mb-2">{t('fault.title')}</div>

      <label className="mb-1.5 block">
        <span className="dim text-[11px]">{t('prop.kind')}</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as FaultKind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`fault.kind.${k}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-1.5 block">
        <span className="dim text-[11px]">{t('fault.target')}</span>
        <select value={effectiveTarget} onChange={(e) => setTarget(e.target.value)}>
          {project.components.map((c) => (
            <option key={c.id} value={c.id}>
              {(c.label ? `${c.label} — ` : '') + t(`comp.${c.type}`)}
            </option>
          ))}
        </select>
      </label>

      {needsTerminal && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('fault.terminal')}</span>
          <select value={terminal} onChange={(e) => setTerminal(e.target.value)}>
            <option value="">—</option>
            {kind === 'touch' && <option value="::case">{t('prop.classI')}</option>}
            {terminals.map((x) => (
              <option key={x.id} value={x.id}>
                {x.mark ?? x.id}
              </option>
            ))}
          </select>
        </label>
      )}

      {needsSecond && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('fault.terminal')} 2</span>
          <select value={terminal2} onChange={(e) => setTerminal2(e.target.value)}>
            <option value="">—</option>
            {terminals.map((x) => (
              <option key={x.id} value={x.id}>
                {x.mark ?? x.id}
              </option>
            ))}
          </select>
        </label>
      )}

      {needsWire && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('fault.wire')}</span>
          <select value={wire} onChange={(e) => setWire(e.target.value)}>
            <option value="">—</option>
            {project.wires
              .filter((w) => !effectiveTarget || w.from.comp === effectiveTarget || w.to.comp === effectiveTarget)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {`${w.role} ${w.csa} mm² · ${w.length} m`}
                </option>
              ))}
          </select>
        </label>
      )}

      {['shortLN', 'shortLPE', 'shortLL', 'earthFault', 'insulation'].includes(kind) && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('fault.resistance')} [{t('unit.ohm')}]</span>
          <input type="number" min={0.001} step={0.01} value={resistance} onChange={(e) => setResistance(Number(e.target.value))} />
        </label>
      )}

      {kind === 'touch' && (
        <>
          <label className="mb-1.5 block">
            <span className="dim text-[11px]">{t('fault.bodyResistance')} [{t('unit.ohm')}]</span>
            <input type="number" min={200} step={100} value={bodyR} onChange={(e) => setBodyR(Number(e.target.value))} />
          </label>
          <label className="mb-1.5 block">
            <span className="dim text-[11px]">{t('fault.standingResistance')} [{t('unit.ohm')}]</span>
            <input type="number" min={0} step={100} value={standR} onChange={(e) => setStandR(Number(e.target.value))} />
          </label>
        </>
      )}

      {kind === 'surge' && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('fault.surgeV')} [{t('unit.V')}]</span>
          <input type="number" min={500} step={500} value={surgeV} onChange={(e) => setSurgeV(Number(e.target.value))} />
        </label>
      )}
      {kind === 'arc' && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('fault.arcCurrent')} [{t('unit.A')}]</span>
          <input type="number" min={0.5} step={0.5} value={arcA} onChange={(e) => setArcA(Number(e.target.value))} />
        </label>
      )}
      {kind === 'dcResidual' && (
        <label className="mb-1.5 block">
          <span className="dim text-[11px]">{t('fault.dcResidual')} [{t('unit.mA')}]</span>
          <input type="number" min={1} step={1} value={dcMa} onChange={(e) => setDcMa(Number(e.target.value))} />
        </label>
      )}

      <button className="btn mt-1" onClick={add}>
        {t('fault.add')}
      </button>

      <div className="sect-title mb-1 mt-4">{t('fault.active')}</div>
      {!faults.length && <div className="dim">{t('fault.none')}</div>}
      <ul className="flex flex-col gap-1">
        {faults.map((f) => {
          const comp = project.components.find((c) => c.id === f.target);
          return (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded px-1.5 py-1"
              style={{ background: 'var(--bg-sunken)' }}
            >
              <span className="flex-1 truncate">
                <b>{t(`fault.kind.${f.kind}`)}</b>
                <span className="dim"> · {comp?.label || t(`comp.${comp?.type ?? 'genericLoad'}`)}</span>
              </span>
              <button className="btn btn-sm btn-danger" onClick={() => sim.removeFault(f.id)}>
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {faults.length > 0 && (
        <button className="btn btn-sm mt-2 self-start" onClick={() => sim.clearFaults()}>
          {t('action.clear')}
        </button>
      )}
    </div>
  );
}
