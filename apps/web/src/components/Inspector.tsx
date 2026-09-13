import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getDef, effectiveProps, CSA_VALUES, type PropSpec, type ComponentInstance, type Wire,
  type ConductorRole,
} from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';
import { terminalPositions } from '../canvas/geometry.js';

const ROLES: ConductorRole[] = ['L1', 'L2', 'L3', 'N', 'PE', 'PEN', 'CTRL', 'ELV+', 'ELV-'];
const METHODS = ['A1', 'A2', 'B1', 'B2', 'C', 'E'];

export function Inspector(): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const selection = useProject((s) => s.selection);
  const selectedWires = useProject((s) => s.selectedWires);

  if (selectedWires.length === 1) {
    const wire = project.wires.find((w) => w.id === selectedWires[0]);
    if (wire) return <WireInspector wire={wire} />;
  }
  if (selection.length === 1) {
    const comp = project.components.find((c) => c.id === selection[0]);
    if (comp) return <ComponentInspector comp={comp} />;
  }
  if (selection.length > 1) {
    return (
      <div className="p-3 text-xs">
        <div className="sect-title mb-2">{t('inspector.title')}</div>
        <div className="dim">{t('inspector.multiple', { count: selection.length })}</div>
      </div>
    );
  }
  return (
    <div className="p-3 text-xs">
      <div className="sect-title mb-2">{t('inspector.title')}</div>
      <div className="dim">{t('inspector.nothing')}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="mb-1.5 grid grid-cols-[1fr_1.15fr] items-center gap-2">
      <span className="dim truncate text-[11px]" title={label}>
        {label}
      </span>
      {children}
    </label>
  );
}

function ComponentInspector({ comp }: { comp: ComponentInstance }): JSX.Element {
  const { t } = useTranslation();
  const def = getDef(comp.type);
  const props = effectiveProps(comp.type, comp.props);
  const setProps = useProject((s) => s.setProps);
  const setComponent = useProject((s) => s.setComponent);
  const project = useProject((s) => s.project);
  const results = useSim((s) => s.results);
  const operate = useSim((s) => s.operate);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const meas = results.meas[comp.id] ?? {};
  const state = results.state[comp.id] ?? {};
  const visible = (def?.props ?? []).filter((p) => !p.when || p.when(props));
  const basic = visible.filter((p) => !p.advanced);
  const advanced = visible.filter((p) => p.advanced);
  const terminals = terminalPositions(comp);
  const connected = new Set(
    project.wires.flatMap((w) => [
      w.from.comp === comp.id ? w.from.terminal : '',
      w.to.comp === comp.id ? w.to.terminal : '',
    ]),
  );

  const renderProp = (spec: PropSpec) => {
    const value = props[spec.key];
    const label = t(spec.i18n ?? `prop.${spec.key}`);
    const onChange = (v: unknown) => setProps(comp.id, { [spec.key]: v });
    if (spec.type === 'bool') {
      return (
        <Row key={spec.key} label={label}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        </Row>
      );
    }
    if (spec.type === 'select') {
      return (
        <Row key={spec.key} label={label}>
          <select value={String(value)} onChange={(e) => {
            const raw = e.target.value;
            const opt = spec.options?.find((o) => String(o.value) === raw);
            onChange(opt ? opt.value : raw);
          }}>
            {(spec.options ?? []).map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {optionLabel(t, spec.key, o.value, spec.unit)}
              </option>
            ))}
          </select>
        </Row>
      );
    }
    if (spec.type === 'number') {
      return (
        <Row key={spec.key} label={spec.unit ? `${label} [${t(unitKey(spec.unit))}]` : label}>
          <input
            type="number"
            value={Number(value ?? 0)}
            min={spec.min}
            max={spec.max}
            step={spec.step ?? 1}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </Row>
      );
    }
    return (
      <Row key={spec.key} label={label}>
        <input type="text" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      </Row>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-2.5 text-xs">
      <div className="sect-title mb-1">{t('inspector.component')}</div>
      <div className="mb-2 font-medium">{t(`comp.${comp.type}`)}</div>

      <Row label={t('prop.label')}>
        <input
          type="text"
          value={comp.label ?? ''}
          onChange={(e) => setComponent(comp.id, { label: e.target.value })}
        />
      </Row>
      <Row label={t('prop.circuit')}>
        <select value={comp.circuit ?? ''} onChange={(e) => setComponent(comp.id, { circuit: e.target.value || undefined })}>
          <option value="">—</option>
          {project.circuits.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Row>
      <Row label={t('prop.location')}>
        <input
          type="text"
          value={comp.location ?? ''}
          onChange={(e) => setComponent(comp.id, { location: e.target.value })}
        />
      </Row>

      {basic.length > 0 && <div className="sect-title mb-1 mt-3">{t('inspector.title')}</div>}
      {basic.map(renderProp)}

      {advanced.length > 0 && (
        <>
          <button className="btn btn-sm mt-2 self-start" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? '▾' : '▸'} {t('prop.advanced')}
          </button>
          {showAdvanced && <div className="mt-2">{advanced.map(renderProp)}</div>}
        </>
      )}

      {/* device state and manual operation */}
      {(state.closed !== undefined || state.tripped !== undefined || state.blown !== undefined) && (
        <>
          <div className="sect-title mb-1 mt-3">{t('inspector.state')}</div>
          <div className="mb-2 flex flex-wrap gap-1">
            <span
              className="rounded px-1.5 py-0.5"
              style={{
                background: state.tripped || state.blown ? 'var(--fail)' : state.closed ? 'var(--ok)' : 'var(--bg-sunken)',
                color: state.tripped || state.blown || state.closed ? '#fff' : 'var(--text-dim)',
              }}
            >
              {state.blown
                ? t('inspector.state.blown')
                : state.tripped
                  ? t('inspector.state.tripped')
                  : state.closed
                    ? t('inspector.state.closed')
                    : t('inspector.state.open')}
            </span>
            {state.degraded && (
              <span className="rounded px-1.5 py-0.5" style={{ background: 'var(--fail)', color: '#fff' }}>
                {t('inspector.state.degraded')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <button className="btn btn-sm" onClick={() => operate(comp.id, 'close')}>
              {t('inspector.state.closed')}
            </button>
            <button className="btn btn-sm" onClick={() => operate(comp.id, 'open')}>
              {t('inspector.state.open')}
            </button>
            <button className="btn btn-sm" onClick={() => operate(comp.id, 'reset')}>
              {t('action.reconnect')}
            </button>
          </div>
          {typeof meas.thermalLoad === 'number' && meas.thermalLoad > 0.001 && (
            <div className="mt-2">
              <div className="dim mb-0.5 text-[11px]">{t('inspector.thermalLoad')}</div>
              <div className="h-1.5 w-full rounded" style={{ background: 'var(--bg-sunken)' }}>
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.min(100, meas.thermalLoad * 100)}%`,
                    background: meas.thermalLoad > 0.8 ? 'var(--fail)' : 'var(--warn)',
                  }}
                />
              </div>
              {typeof meas.tripIn === 'number' && Number.isFinite(meas.tripIn) && (
                <div className="faint mt-0.5 text-[11px] mono">
                  {t('inspector.tripIn')}: {formatSeconds(meas.tripIn)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {Object.keys(meas).length > 0 && (
        <>
          <div className="sect-title mb-1 mt-3">{t('inspector.measurements')}</div>
          <table className="w-full mono text-[11px]">
            <tbody>
              {Object.entries(meas)
                .filter(([k]) => !['thermalLoad', 'tripIn', 'closed', 'brightness', 'classII'].includes(k))
                .map(([k, v]) => (
                  <tr key={k}>
                    <td className="dim pr-2">{k}</td>
                    <td className="text-right">{formatMeas(k, v)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      <div className="sect-title mb-1 mt-3">{t('inspector.terminals')}</div>
      <table className="w-full text-[11px]">
        <tbody>
          {terminals.map((tp) => (
            <tr key={tp.id}>
              <td className="mono dim pr-2">{tp.def.mark ?? tp.id}</td>
              <td className="mono">{(results.nodeV[`${comp.id}:${tp.id}`] ?? 0).toFixed(1)} V</td>
              <td className="faint text-right">
                {connected.has(tp.id) ? t('inspector.connected') : t('inspector.free')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WireInspector({ wire }: { wire: Wire }): JSX.Element {
  const { t } = useTranslation();
  const setWire = useProject((s) => s.setWire);
  const project = useProject((s) => s.project);
  const results = useSim((s) => s.results);
  const current = results.wireI[wire.id] ?? 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-2.5 text-xs">
      <div className="sect-title mb-2">{t('inspector.wire')}</div>
      <Row label={t('prop.role')}>
        <select value={wire.role} onChange={(e) => setWire(wire.id, { role: e.target.value as ConductorRole })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`role.${r}`)}
            </option>
          ))}
        </select>
      </Row>
      <Row label={`${t('prop.csa')} [${t('unit.mm2')}]`}>
        <select value={wire.csa} onChange={(e) => setWire(wire.id, { csa: Number(e.target.value) })}>
          {CSA_VALUES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Row>
      <Row label={`${t('prop.length')} [${t('unit.m')}]`}>
        <input
          type="number"
          min={0}
          step={0.5}
          value={wire.length}
          onChange={(e) => setWire(wire.id, { length: Number(e.target.value) })}
        />
      </Row>
      <Row label={t('prop.material')}>
        <select value={wire.material} onChange={(e) => setWire(wire.id, { material: e.target.value as 'Cu' | 'Al' })}>
          <option value="Cu">{t('opt.material.Cu')}</option>
          <option value="Al">{t('opt.material.Al')}</option>
        </select>
      </Row>
      <Row label={t('prop.installMethod')}>
        <select
          value={wire.installMethod ?? project.settings.defaultInstallMethod}
          onChange={(e) => setWire(wire.id, { installMethod: e.target.value as any })}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Row>
      <Row label={t('prop.loadedConductors')}>
        <select
          value={wire.loadedConductors ?? 2}
          onChange={(e) => setWire(wire.id, { loadedConductors: Number(e.target.value) as 2 | 3 })}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </Row>
      <Row label={t('prop.circuit')}>
        <select value={wire.circuit ?? ''} onChange={(e) => setWire(wire.id, { circuit: e.target.value || undefined })}>
          <option value="">—</option>
          {project.circuits.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Row>
      <Row label={t('prop.color')}>
        <div className="flex items-center gap-1">
          <input
            type="color"
            className="h-6 w-10 rounded border"
            value={wire.color ?? '#888888'}
            onChange={(e) => setWire(wire.id, { color: e.target.value })}
          />
          <button className="btn btn-sm" onClick={() => setWire(wire.id, { color: null })}>
            {t('action.reset')}
          </button>
        </div>
      </Row>

      <div className="sect-title mb-1 mt-3">{t('inspector.measurements')}</div>
      <table className="w-full mono text-[11px]">
        <tbody>
          <tr>
            <td className="dim">I</td>
            <td className="text-right">
              {current >= 1 ? `${current.toFixed(2)} A` : `${(current * 1000).toFixed(1)} mA`}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function unitKey(unit: string): string {
  const map: Record<string, string> = {
    A: 'unit.A', V: 'unit.V', W: 'unit.W', kW: 'unit.kW', VA: 'unit.VA', mA: 'unit.mA',
    'Ω': 'unit.ohm', m: 'unit.m', 'mm²': 'unit.mm2', s: 'unit.s', Hz: 'unit.Hz',
    '%': 'unit.percent', '°C': 'unit.degC', lx: 'unit.lx',
  };
  return map[unit] ?? 'unit.A';
}

function optionLabel(t: (k: string) => string, key: string, value: unknown, unit?: string): string {
  const specific = `opt.${key}.${String(value)}`;
  const translated = t(specific);
  if (translated !== specific) return translated;
  return unit ? `${value} ${t(unitKey(unit))}` : String(value);
}

export function formatSeconds(s: number): string {
  if (!Number.isFinite(s)) return '—';
  if (s < 1) return `${Math.round(s * 1000)} ms`;
  if (s < 90) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${Math.round(s - m * 60)} s`;
}

function formatMeas(key: string, v: number): string {
  if (key.startsWith('U')) return `${v.toFixed(1)} V`;
  if (key.startsWith('I')) return v >= 1 ? `${v.toFixed(2)} A` : `${(v * 1000).toFixed(1)} mA`;
  if (key === 'P') return v >= 1000 ? `${(v / 1000).toFixed(2)} kW` : `${v.toFixed(0)} W`;
  if (key === 'E') return `${(v / 1000).toFixed(3)} kWh`;
  if (key === 'Idelta' || key === 'IdeltaDC') return `${(v * 1000).toFixed(1)} mA`;
  if (key === 'remaining' || key === 'timer') return formatSeconds(v);
  return v.toFixed(2);
}
