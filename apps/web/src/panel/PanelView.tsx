import { useMemo, useRef, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getDef, effectiveProps, moduleCount, type ComponentInstance, type Enclosure,
} from '@budova/engine';
import { useProject, rowUsage } from '../store/project.js';
import { useSim } from '../store/sim.js';
import { useUi } from '../store/ui.js';
import { ratingText } from '../canvas/ComponentNode.js';

/** On-screen size of one 17,5 mm DIN module. */
const MOD = 26;
const ROW_H = 84;
const PAD = 18;
const HEADER = 30;

export function PanelView(): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const selection = useProject((s) => s.selection);
  const store = useProject;
  const ui = useUi();
  const results = useSim((s) => s.results);
  const operate = useSim((s) => s.operate);
  const running = useSim((s) => s.running);
  /*
   * The id of the device being dragged is kept in a ref rather than in state:
   * dragstart and drop can arrive in the same tick, and a state update would
   * not have landed by then.
   */
  const dragged = useRef<string | null>(null);

  const modular = useMemo(
    () => project.components.filter((c) => moduleCount(c.type, c.props) > 0),
    [project.components],
  );
  const enclosureIds = new Set(project.enclosures.map((e) => e.id));
  const unplaced = modular.filter((c) => !c.panel || !enclosureIds.has(c.panel.enclosureId));

  const addEnclosure = () =>
    store.getState().addEnclosure({
      name: t('panel.enclosure'),
      rows: 3,
      modulesPerRow: 12,
      mount: 'flush',
      ip: 'IP40',
      x: 0,
      y: 0,
      door: true,
    });

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--canvas)' }}>
        {!project.enclosures.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="dim">{t('panel.noEnclosure')}</div>
            <button className="btn" onClick={addEnclosure}>
              {t('panel.addEnclosure')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {project.enclosures.map((e) => (
              <EnclosureSvg
                key={e.id}
                enclosure={e}
                components={modular.filter((c) => c.panel?.enclosureId === e.id)}
                selection={selection}
                results={results}
                running={running}
                onSelect={(id) => store.getState().select([id])}
                onOperate={(id) => operate(id, 'toggle')}
                onDropDevice={(row, slot) => {
                  const id = dragged.current;
                  if (!id) return;
                  store.getState().placeInPanel(id, e.id, row, slot);
                  dragged.current = null;
                }}
                onRemove={(id) => store.getState().removeFromPanel(id)}
              />
            ))}
            <button className="btn self-start no-print" onClick={addEnclosure}>
              {t('panel.addEnclosure')}
            </button>
          </div>
        )}
      </div>

      <div
        className="flex w-72 shrink-0 flex-col overflow-y-auto border-l no-print"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
      >
        <div className="border-b p-2.5" style={{ borderColor: 'var(--border)' }}>
          <div className="sect-title mb-1">{t('panel.unplaced')}</div>
          <div className="faint mb-2 text-[11px]">{t('panel.unplacedHint')}</div>
          {!unplaced.length && <div className="dim text-xs">—</div>}
          <ul className="flex flex-col gap-1">
            {unplaced.map((c) => (
              <li
                key={c.id}
                draggable
                onDragStart={() => {
                  dragged.current = c.id;
                }}
                onDragEnd={() => {
                  dragged.current = null;
                }}
                className="flex cursor-grab items-center gap-2 rounded px-1.5 py-1 text-xs"
                style={{ background: 'var(--bg-sunken)' }}
              >
                <b>{c.label ?? '—'}</b>
                <span className="dim truncate">{t(`comp.${c.type}`)}</span>
                <span className="faint ml-auto mono">{moduleCount(c.type, c.props)}</span>
              </li>
            ))}
          </ul>
        </div>

        <EnclosureSettings />
        <LabelSheet />
      </div>
    </div>
  );
}

function EnclosureSvg({
  enclosure,
  components,
  selection,
  results,
  running,
  onSelect,
  onOperate,
  onDropDevice,
  onRemove,
}: {
  enclosure: Enclosure;
  components: ComponentInstance[];
  selection: string[];
  results: any;
  running: boolean;
  onSelect(id: string): void;
  onOperate(id: string): void;
  onDropDevice(row: number, slot: number): void;
  onRemove(id: string): void;
}): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const width = enclosure.modulesPerRow * MOD + PAD * 2;
  const height = enclosure.rows * ROW_H + PAD * 2 + HEADER + 34;
  const busbars = project.busbars.filter((b) => b.enclosureId === enclosure.id);
  const totalUsed = components.reduce((n, c) => n + moduleCount(c.type, c.props), 0);
  const capacity = enclosure.rows * enclosure.modulesPerRow;

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-semibold">{enclosure.name}</span>
        <span className="faint text-[11px]">
          {enclosure.rows}×{enclosure.modulesPerRow} · {t(`opt.mount.${enclosure.mount}`)} · {enclosure.ip}
        </span>
        <span
          className="ml-auto text-[11px] mono"
          style={{ color: totalUsed > capacity ? 'var(--fail)' : 'var(--text-dim)' }}
        >
          {t('panel.modules', { used: totalUsed, total: capacity })}
        </span>
      </div>
      {totalUsed > capacity && (
        <div className="mb-1 text-xs" style={{ color: 'var(--fail)' }}>
          {t('panel.full')}
        </div>
      )}
      <svg width={width} height={height} id={`enclosure-${enclosure.id}`} style={{ maxWidth: '100%' }}>
        <rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          rx={6}
          fill="var(--bg-panel)"
          stroke="var(--border-strong)"
          strokeWidth={2}
        />
        <text x={PAD} y={20} fontSize={12} fill="var(--text-dim)">
          {enclosure.name}
        </text>

        {Array.from({ length: enclosure.rows }, (_, r) => {
          const row = r + 1;
          const y = HEADER + PAD + r * ROW_H;
          const used = rowUsage(project, enclosure.id, row);
          return (
            <g key={row}>
              {/* DIN rail */}
              <rect x={PAD} y={y + 46} width={enclosure.modulesPerRow * MOD} height={9} fill="var(--bg-sunken)" stroke="var(--border)" />
              <text x={PAD - 6} y={y + 30} fontSize={10} textAnchor="end" fill="var(--text-faint)">
                {row}
              </text>
              {/* empty slots as drop targets */}
              {Array.from({ length: enclosure.modulesPerRow }, (_, s) => (
                <rect
                  key={s}
                  x={PAD + s * MOD}
                  y={y}
                  width={MOD}
                  height={46}
                  fill="transparent"
                  stroke="var(--border)"
                  strokeDasharray="2 3"
                  strokeWidth={0.5}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropDevice(row, s)}
                />
              ))}
              {used > enclosure.modulesPerRow && (
                <text x={PAD + enclosure.modulesPerRow * MOD - 4} y={y + 12} fontSize={10} textAnchor="end" fill="var(--fail)">
                  {t('panel.full')}
                </text>
              )}
              {/* comb busbars for this row */}
              {busbars
                .filter((b) => b.row === row)
                .map((b) => (
                  <g key={b.id}>
                    <rect
                      x={PAD + b.slot * MOD}
                      y={y - 8}
                      width={b.modules * MOD}
                      height={6}
                      fill="var(--live-l1)"
                      fillOpacity={0.55}
                    />
                    <text x={PAD + b.slot * MOD + 2} y={y - 10} fontSize={8} fill="var(--text-faint)">
                      {b.kind}
                    </text>
                  </g>
                ))}
              {/* devices */}
              {components
                .filter((c) => c.panel?.row === row)
                .map((c) => (
                  <DeviceModule
                    key={c.id}
                    comp={c}
                    x={PAD + (c.panel?.slot ?? 0) * MOD}
                    y={y}
                    selected={selection.includes(c.id)}
                    state={results.state[c.id] ?? {}}
                    running={running}
                    onSelect={() => onSelect(c.id)}
                    onOperate={() => onOperate(c.id)}
                    onRemove={() => onRemove(c.id)}
                  />
                ))}
            </g>
          );
        })}

        {/* N and PE terminal blocks along the bottom */}
        <g>
          <rect x={PAD} y={height - PAD - 26} width={(enclosure.modulesPerRow * MOD) / 2 - 4} height={11} fill="var(--live-n)" fillOpacity={0.3} />
          <text x={PAD + 4} y={height - PAD - 17} fontSize={9} fill="var(--text-dim)">
            N
          </text>
          <rect
            x={PAD + (enclosure.modulesPerRow * MOD) / 2 + 4}
            y={height - PAD - 26}
            width={(enclosure.modulesPerRow * MOD) / 2 - 4}
            height={11}
            fill="var(--live-pe)"
            fillOpacity={0.3}
          />
          <text x={PAD + (enclosure.modulesPerRow * MOD) / 2 + 8} y={height - PAD - 17} fontSize={9} fill="var(--text-dim)">
            PE
          </text>
          <text x={width - PAD} y={height - PAD - 2} fontSize={9} textAnchor="end" fill="var(--text-faint)">
            {t('panel.moduleWidth')}
          </text>
        </g>
      </svg>
    </div>
  );
}

function DeviceModule({
  comp,
  x,
  y,
  selected,
  state,
  running,
  onSelect,
  onOperate,
  onRemove,
}: {
  comp: ComponentInstance;
  x: number;
  y: number;
  selected: boolean;
  state: any;
  running: boolean;
  onSelect(): void;
  onOperate(): void;
  onRemove(): void;
}): JSX.Element {
  const { t } = useTranslation();
  const n = moduleCount(comp.type, comp.props);
  const w = n * MOD;
  const props = effectiveProps(comp.type, comp.props);
  const def = getDef(comp.type);
  const tripped = !!state.tripped || !!state.blown;
  const closed = state.closed !== false && !tripped;
  const interactive = def?.interactive === 'toggle';

  return (
    <g
      onClick={(e) => {
        if (running && interactive && !e.shiftKey) onOperate();
        else onSelect();
      }}
      onDoubleClick={onRemove}
      className="cursor-pointer"
    >
      <rect
        x={x + 1}
        y={y + 1}
        width={w - 2}
        height={44}
        rx={2}
        fill={tripped ? 'var(--fail)' : 'var(--bg-sunken)'}
        fillOpacity={tripped ? 0.18 : 1}
        stroke={selected ? 'var(--accent)' : tripped ? 'var(--fail)' : 'var(--border-strong)'}
        strokeWidth={selected ? 2 : 1}
      />
      {/* operating lever */}
      {interactive && (
        <rect
          x={x + w / 2 - 4}
          y={closed ? y + 6 : y + 18}
          width={8}
          height={12}
          rx={1.5}
          fill={closed ? 'var(--ok)' : 'var(--text-faint)'}
        />
      )}
      <text x={x + w / 2} y={y + 38} fontSize={9} textAnchor="middle" fill="var(--text)">
        {comp.label ?? ''}
      </text>
      <text
        x={x + w / 2}
        y={y + 60}
        fontSize={fitFontSize(panelRating(comp.type, props), w - 2)}
        textAnchor="middle"
        fill="var(--text-dim)"
      >
        {panelRating(comp.type, props)}
      </text>
      <title>{`${comp.label ?? ''} ${t(`comp.${comp.type}`)}`}</title>
    </g>
  );
}

/** Short rating for the narrow face of a modular device. */
function panelRating(type: string, props: any): string {
  const bits: string[] = [];
  if (props.inA !== undefined) bits.push(`${props.curve ?? ''}${props.inA}`);
  if (props.idn !== undefined) bits.push(`${props.idn}mA${props.rcdType ?? ''}`);
  if (props.spdType) bits.push(String(props.spdType));
  if (props.setA !== undefined) bits.push(`${props.setA}A`);
  return bits.join(' ');
}

/** Shrink the label rather than let it run into the neighbouring device. */
function fitFontSize(text: string, width: number): number {
  if (!text) return 8.5;
  const estimated = text.length * 4.6;
  if (estimated <= width) return 8.5;
  return Math.max(5.5, (8.5 * width) / estimated);
}

function EnclosureSettings(): JSX.Element | null {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const commit = useProject((s) => s.commit);
  const [idx, setIdx] = useState(0);
  const e = project.enclosures[idx];
  if (!e) return null;
  const patch = (p: Partial<Enclosure>) =>
    commit((proj) => {
      const target = proj.enclosures.find((x) => x.id === e.id);
      if (target) Object.assign(target, p);
    });

  return (
    <div className="border-b p-2.5 text-xs" style={{ borderColor: 'var(--border)' }}>
      <div className="sect-title mb-1">{t('panel.enclosure')}</div>
      {project.enclosures.length > 1 && (
        <select className="mb-1.5" value={idx} onChange={(ev) => setIdx(Number(ev.target.value))}>
          {project.enclosures.map((x, i) => (
            <option key={x.id} value={i}>
              {x.name}
            </option>
          ))}
        </select>
      )}
      <label className="mb-1.5 block">
        <span className="dim text-[11px]">{t('project.name')}</span>
        <input type="text" value={e.name} onChange={(ev) => patch({ name: ev.target.value })} />
      </label>
      <label className="mb-1.5 block">
        <span className="dim text-[11px]">{t('prop.rows')}</span>
        <input type="number" min={1} max={6} value={e.rows} onChange={(ev) => patch({ rows: Number(ev.target.value) })} />
      </label>
      <label className="mb-1.5 block">
        <span className="dim text-[11px]">{t('prop.modulesPerRow')}</span>
        <select value={e.modulesPerRow} onChange={(ev) => patch({ modulesPerRow: Number(ev.target.value) })}>
          {[12, 14, 18, 24].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-1.5 block">
        <span className="dim text-[11px]">{t('prop.mount')}</span>
        <select value={e.mount} onChange={(ev) => patch({ mount: ev.target.value as 'flush' | 'surface' })}>
          <option value="flush">{t('opt.mount.flush')}</option>
          <option value="surface">{t('opt.mount.surface')}</option>
        </select>
      </label>
      <label className="mb-1.5 block">
        <span className="dim text-[11px]">{t('prop.ip')}</span>
        <select value={e.ip} onChange={(ev) => patch({ ip: ev.target.value })}>
          {['IP20', 'IP30', 'IP40', 'IP44', 'IP54', 'IP65'].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </label>
      <button
        className="btn btn-sm"
        onClick={() =>
          commit((proj) => {
            proj.busbars.push({
              id: `b${proj.busbars.length + 1}`,
              enclosureId: e.id,
              row: 1,
              slot: 0,
              modules: Math.min(12, e.modulesPerRow),
              kind: '1P',
              phase: 'L1',
              inA: 63,
            });
          })
        }
      >
        {t('panel.addBusbar')}
      </button>
    </div>
  );
}

/** Printable circuit schedule for the inside of the door. */
function LabelSheet(): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const rows = useMemo(() => {
    return project.components
      .filter((c) => {
        const d = getDef(c.type);
        return d?.flags?.overcurrent || d?.flags?.rcd;
      })
      .map((c) => {
        const circuit = project.circuits.find((x) => x.id === c.circuit);
        const wire = project.wires.find((w) => w.from.comp === c.id && w.role !== 'PE' && w.role !== 'N');
        return {
          id: c.id,
          label: c.label ?? '',
          circuit: circuit?.name ?? '—',
          rating: ratingText(c.type, effectiveProps(c.type, c.props)),
          cable: wire ? `${wire.csa} mm² · ${wire.length} m` : '—',
        };
      });
  }, [project]);

  return (
    <div className="p-2.5 text-xs">
      <div className="sect-title mb-1">{t('panel.labelSheet')}</div>
      <div className="faint mb-2 text-[11px]">{t('panel.labelSheetHint')}</div>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="dim">
            {[
              t('panel.deviceColumn'),
              t('panel.circuitColumn'),
              t('panel.ratingColumn'),
              t('panel.cableColumn'),
            ].map((h) => (
              <th key={h} className="border-b pb-1 pr-2 text-left font-medium" style={{ borderColor: 'var(--border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-0.5 pr-2 font-semibold">{r.label}</td>
              <td className="py-0.5 pr-2">{r.circuit}</td>
              <td className="py-0.5 pr-2 mono whitespace-nowrap">{r.rating}</td>
              <td className="py-0.5 mono whitespace-nowrap">{r.cable}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <button className="btn btn-sm mt-2" onClick={() => window.print()}>
        ⎙ {t('action.exportLabels')}
      </button>
    </div>
  );
}
