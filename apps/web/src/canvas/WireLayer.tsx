import { memo, type JSX } from 'react';
import { roleColor, type Project, type Wire } from '@budova/engine';
import { routeWire, pathOf, terminalPos, polylineMid } from './geometry.js';

export interface WireLayerProps {
  project: Project;
  wireI: Record<string, number>;
  selected: string[];
  highlighted: string[];
  live: boolean;
  showLabels: boolean;
  /** Current read-outs are only legible above a certain zoom. */
  showCurrents: boolean;
  onSelect(e: React.PointerEvent, id: string): void;
  onAddBend(id: string, x: number, y: number): void;
  onBendDown(e: React.PointerEvent, id: string, index: number): void;
  onBendRemove(id: string, index: number): void;
  /** Canvas coordinates of a pointer event, for placing a new bend point. */
  toWorld(e: React.MouseEvent): { x: number; y: number };
}

/** Stroke width from the conductor cross-section, so 1,5 and 10 mm² look different. */
function widthFor(csa: number): number {
  return Math.min(6, 1.4 + Math.log2(Math.max(0.75, csa)) * 0.7);
}

function WireLayerImpl(p: WireLayerProps): JSX.Element {
  const byId = new Map(p.project.components.map((c) => [c.id, c]));
  const sel = new Set(p.selected);
  const hi = new Set(p.highlighted);

  return (
    <g>
      {p.project.wires.map((w: Wire) => {
        const a = byId.get(w.from.comp);
        const b = byId.get(w.to.comp);
        if (!a || !b) return null;
        const ta = terminalPos(a, w.from.terminal);
        const tb = terminalPos(b, w.to.terminal);
        if (!ta || !tb) return null;
        const pts = routeWire(ta, tb, w.points ?? []);
        const d = pathOf(pts);
        const color = roleColor(w);
        const current = p.wireI[w.id] ?? 0;
        const flowing = p.live && current > 0.02;
        // Animation speed follows the magnitude of the current.
        const dur = flowing ? Math.max(0.12, 1.6 / Math.min(40, Math.max(0.3, current))) : 0;
        const isSel = sel.has(w.id);
        const isHi = hi.has(w.id);
        const mid = polylineMid(pts);

        return (
          <g key={w.id} onPointerDown={(e) => p.onSelect(e, w.id)}>
            {/* generous hit area; a double-click drops a bend point on the run */}
            <path
              d={d}
              stroke="transparent"
              strokeWidth={10}
              fill="none"
              className="cursor-pointer"
              onDoubleClick={(e) => {
                e.stopPropagation();
                const pt = p.toWorld(e);
                p.onAddBend(w.id, pt.x, pt.y);
              }}
            />
            {(isSel || isHi) && (
              <path
                d={d}
                stroke={isHi ? 'var(--warn)' : 'var(--accent)'}
                strokeWidth={widthFor(w.csa) + 6}
                strokeOpacity={0.3}
                fill="none"
                strokeLinejoin="round"
              />
            )}
            <path
              d={d}
              stroke={color}
              strokeWidth={widthFor(w.csa)}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* the green-yellow of a protective conductor, drawn as a stripe */}
            {(w.role === 'PE' || w.role === 'PEN') && !w.color && (
              <path
                d={d}
                stroke="#e8d23a"
                strokeWidth={widthFor(w.csa)}
                strokeDasharray="4 6"
                fill="none"
                strokeLinejoin="round"
              />
            )}
            {flowing && (
              <path
                d={d}
                stroke="#ffffff"
                strokeOpacity={0.85}
                strokeWidth={Math.max(1, widthFor(w.csa) - 1.2)}
                fill="none"
                className="flowing"
                style={{ ['--flow-dur' as any]: `${dur}s` }}
                strokeLinecap="round"
              />
            )}
            {p.showLabels && (
              <text
                x={mid.x}
                y={mid.y - 4}
                fontSize={9}
                textAnchor="middle"
                fill="var(--text-faint)"
                pointerEvents="none"
              >
                {`${w.csa} mm² · ${w.length} m`}
              </text>
            )}
            {p.showCurrents && current > 0.02 && (
              <text
                x={mid.x}
                y={mid.y + 12}
                fontSize={10}
                textAnchor="middle"
                fill={color}
                fontWeight={600}
                pointerEvents="none"
              >
                {current >= 1 ? `${current.toFixed(1)} A` : `${(current * 1000).toFixed(0)} mA`}
              </text>
            )}
            {(w.points ?? []).map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={isSel ? 4.5 : 3}
                fill={isSel ? 'var(--accent)' : color}
                stroke="var(--bg-panel)"
                strokeWidth={0.8}
                className="cursor-move"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  p.onBendDown(e, w.id, i);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  p.onBendRemove(w.id, i);
                }}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

export const WireLayer = memo(WireLayerImpl);
