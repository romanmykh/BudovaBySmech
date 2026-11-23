import { memo, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { getDef, effectiveProps, sizeOf, type ComponentInstance } from '@budova/engine';
import { renderSymbol } from './symbols.js';
import { terminalPositions, boxOf } from './geometry.js';

/** Matrix that maps the symbol's own coordinates into the rotated footprint. */
export function symbolTransform(w: number, h: number, rot: number, mirror: boolean): string {
  const r = ((rot % 360) + 360) % 360;
  const rotM =
    r === 90 ? `matrix(0 1 -1 0 ${h} 0)`
    : r === 180 ? `matrix(-1 0 0 -1 ${w} ${h})`
    : r === 270 ? `matrix(0 -1 1 0 0 ${w})`
    : '';
  const mirM = mirror ? `matrix(-1 0 0 1 ${w} 0)` : '';
  return [rotM, mirM].filter(Boolean).join(' ');
}

export interface NodeProps {
  comp: ComponentInstance;
  selected: boolean;
  highlighted: boolean;
  live: boolean;
  state: Record<string, any>;
  meas: Record<string, number>;
  nodeV: Record<string, number>;
  /** Terminal the user is currently wiring from. */
  pendingTerminal: string | null;
  compatibleTerminals: Set<string> | null;
  showTerminals: boolean;
  /** Touch input: terminals need a finger-sized hit area. */
  touch?: boolean;
  onPointerDownBody(e: React.PointerEvent, id: string): void;
  onTerminalClick(e: React.PointerEvent, compId: string, terminalId: string): void;
  onActivate(id: string, e: React.MouseEvent): void;
}

/** Colour a terminal by the potential it actually sits at. */
function potentialColor(v: number): string {
  if (v > 400) return 'var(--fail)';
  if (v > 150) return 'var(--live-l1)';
  if (v > 50) return 'var(--warn)';
  if (v > 10) return 'var(--live-n)';
  return 'var(--text-faint)';
}

function ComponentNodeImpl(p: NodeProps): JSX.Element {
  const { t } = useTranslation();
  const { comp } = p;
  const def = getDef(comp.type);
  const props = effectiveProps(comp.type, comp.props);
  const base = sizeOf(comp.type, comp.props);
  const box = boxOf(comp);
  const terms = terminalPositions(comp);
  const tripped = !!p.state?.tripped || !!p.state?.blown;
  const rating = ratingText(comp.type, props);

  return (
    <g
      data-comp={comp.id}
      className="cursor-move"
      onPointerDown={(e) => p.onPointerDownBody(e, comp.id)}
      onDoubleClick={(e) => p.onActivate(comp.id, e)}
    >
      {/* selection / highlight frame */}
      {(p.selected || p.highlighted) && (
        <rect
          x={box.x - 5}
          y={box.y - 5}
          width={box.w + 10}
          height={box.h + 10}
          rx={4}
          fill={p.highlighted ? 'var(--warn)' : 'var(--accent)'}
          fillOpacity={0.1}
          stroke={p.highlighted ? 'var(--warn)' : 'var(--accent)'}
          strokeWidth={1.5}
          strokeDasharray={p.highlighted ? '5 3' : undefined}
        />
      )}

      {/* body */}
      <g
        transform={`translate(${comp.x} ${comp.y}) ${symbolTransform(base.w, base.h, comp.rot ?? 0, !!comp.mirror)}`}
        stroke={tripped ? 'var(--fail)' : 'var(--text)'}
        fill="none"
        pointerEvents="all"
      >
        <rect x={0} y={0} width={base.w} height={base.h} fill="transparent" stroke="none" />
        {renderSymbol(def?.symbol ?? 'generic', {
          w: base.w,
          h: base.h,
          props,
          state: p.state ?? {},
          meas: p.meas ?? {},
          live: p.live,
        }, comp.type)}
      </g>

      {/* terminals */}
      {p.showTerminals &&
        terms.map((tp) => {
          const v = p.nodeV[`${comp.id}:${tp.id}`] ?? 0;
          const pending = p.pendingTerminal === tp.id;
          const compatible = p.compatibleTerminals?.has(`${comp.id}:${tp.id}`);
          return (
            <g
              key={tp.id}
              data-terminal={tp.id}
              onPointerDown={(e) => p.onTerminalClick(e, comp.id, tp.id)}
            >
              <title>{tp.def.mark ?? tp.id}</title>
              <circle
                cx={tp.x}
                cy={tp.y}
                r={p.touch ? 14 : 7}
                fill="transparent"
                className="cursor-crosshair"
              />
              <circle
                cx={tp.x}
                cy={tp.y}
                r={(pending ? 4.5 : compatible ? 4 : 2.6) * (p.touch ? 1.5 : 1)}
                fill={pending ? 'var(--accent)' : compatible ? 'var(--ok)' : potentialColor(v)}
                stroke={compatible || pending ? 'var(--bg-panel)' : 'none'}
                strokeWidth={1}
              />
            </g>
          );
        })}

      {/* label and rating */}
      {comp.label && (
        <text
          x={box.x + box.w / 2}
          y={box.y - 9}
          fontSize={11}
          textAnchor="middle"
          fill="var(--text)"
          fontWeight={600}
          pointerEvents="none"
          stroke="var(--canvas)"
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {comp.label}
        </text>
      )}
      {rating && (
        <text
          x={box.x + box.w / 2}
          y={box.y + box.h + 13}
          fontSize={10}
          textAnchor="middle"
          fill="var(--text-dim)"
          pointerEvents="none"
          stroke="var(--canvas)"
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {rating}
        </text>
      )}
      {tripped && (
        <text
          x={box.x + box.w - 2}
          y={box.y + 2}
          fontSize={10}
          textAnchor="end"
          fill="var(--fail)"
          fontWeight={700}
          pointerEvents="none"
        >
          {t(p.state?.blown ? 'inspector.state.blown' : 'inspector.state.tripped')}
        </text>
      )}
    </g>
  );
}

/** One-line summary of the electrical rating, drawn under the symbol. */
export function ratingText(type: string, props: any): string {
  const bits: string[] = [];
  if (props.inA !== undefined && type !== 'socket16' && type !== 'socketUsb') {
    bits.push(`${props.curve ?? ''}${props.inA} A`);
  }
  if (props.idn !== undefined) bits.push(`${props.idn} mA ${props.rcdType ?? ''}`.trim());
  if (props.watts !== undefined && Number(props.watts) > 0) {
    const w = Number(props.watts);
    bits.push(w >= 1000 ? `${(w / 1000).toFixed(w % 1000 ? 1 : 0)} kW` : `${w} W`);
  }
  if (type === 'evse') bits.push(`${props.powerKw} kW`);
  if (props.setA !== undefined) bits.push(`${props.setA} A`);
  return bits.join(' · ');
}

export const ComponentNode = memo(ComponentNodeImpl);
