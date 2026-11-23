import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getDef, effectiveProps, terminalsOf, type ConductorRole, type Point,
} from '@budova/engine';
import { useProject } from '../store/project.js';
import { useSim } from '../store/sim.js';
import { useUi } from '../store/ui.js';
import { ComponentNode } from './ComponentNode.js';
import { WireLayer } from './WireLayer.js';
import {
  boxOf, contentBounds, snap, terminalPositions, terminalsCompatible, routeWire, pathOf,
  type Box,
} from './geometry.js';
import { Minimap } from './Minimap.js';
import { AUTO_ROLE, inferRole } from './autoRole.js';
import { setViewCenter, onFocusRequest } from './viewport.js';
import { useIsMobile, useIsTouch } from '../hooks/useMediaQuery.js';

interface Pending {
  comp: string;
  terminal: string;
}

interface Drag {
  kind: 'move' | 'select' | 'pan' | 'bend' | 'annotation';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  wireId?: string;
  bendIndex?: number;
  annotationId?: string;
  moved: boolean;
}

export function SchematicCanvas(): JSX.Element {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const project = useProject((s) => s.project);
  const selection = useProject((s) => s.selection);
  const selectedWires = useProject((s) => s.selectedWires);
  const selectedAnnotations = useProject((s) => s.selectedAnnotations);
  const store = useProject;
  const ui = useUi();
  const results = useSim((s) => s.results);
  const running = useSim((s) => s.running);
  const operate = useSim((s) => s.operate);

  const isTouch = useIsTouch();
  const isMobile = useIsMobile();
  const [view, setView] = useState({ x: 60, y: 40, zoom: 1 });
  /** Active touch points, for pinch to zoom. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const [marquee, setMarquee] = useState<Box | null>(null);
  const drag = useRef<Drag | null>(null);

  /* ---------------- coordinate helpers ---------------- */

  const toWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const r = svgRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return { x: (clientX - r.left - view.x) / view.zoom, y: (clientY - r.top - view.y) / view.zoom };
    },
    [view],
  );

  const fit = useCallback(() => {
    const boxes = project.components.map(boxOf);
    const b = contentBounds(boxes);
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const zoom = Math.min(3, Math.max(0.15, Math.min(r.width / b.w, r.height / b.h)));
    setView({ x: -b.x * zoom + (r.width - b.w * zoom) / 2, y: -b.y * zoom + (r.height - b.h * zoom) / 2, zoom });
  }, [project.components]);

  useEffect(() => {
    if (project.components.length && view.zoom === 1 && view.x === 60 && view.y === 40) fit();
    // Only on the first project that arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  useEffect(() => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    setViewCenter((r.width / 2 - view.x) / view.zoom, (r.height / 2 - view.y) / view.zoom);
  }, [view]);

  useEffect(() => {
    onFocusRequest((x, y) => {
      const r = svgRef.current?.getBoundingClientRect();
      if (!r) return;
      setView((v) => {
        const zoom = Math.max(v.zoom, isMobile ? 1 : 0.8);
        return { zoom, x: r.width / 2 - x * zoom, y: r.height / 2 - y * zoom };
      });
    });
    return () => onFocusRequest(null);
  }, [isMobile]);

  /* ---------------- wiring ---------------- */

  const compatible = useMemo(() => {
    if (!pending) return null;
    const from = project.components.find((c) => c.id === pending.comp);
    if (!from) return null;
    const fromDef = terminalsOf(from.type, from.props).find((x) => x.id === pending.terminal);
    if (!fromDef) return null;
    const set = new Set<string>();
    for (const c of project.components) {
      for (const term of terminalsOf(c.type, c.props)) {
        if (c.id === pending.comp && term.id === pending.terminal) continue;
        const ok = ui.drawRole === AUTO_ROLE
          ? term.role === fromDef.role || term.role === 'any' || fromDef.role === 'any' ||
            (term.role === 'ctrl' && fromDef.role !== 'PE' && fromDef.role !== 'earth') ||
            (fromDef.role === 'ctrl' && term.role !== 'PE' && term.role !== 'earth') ||
            (term.role === 'earth' && fromDef.role === 'PE') || (term.role === 'PE' && fromDef.role === 'earth')
          : terminalsCompatible(fromDef, term, ui.drawRole);
        if (ok) set.add(`${c.id}:${term.id}`);
      }
    }
    return set;
  }, [pending, project.components, ui.drawRole]);

  const completeWire = useCallback(
    (compId: string, terminalId: string) => {
      if (!pending) return;
      if (pending.comp === compId && pending.terminal === terminalId) {
        setPending(null);
        return;
      }
      const from = { comp: pending.comp, terminal: pending.terminal };
      const to = { comp: compId, terminal: terminalId };
      const role: ConductorRole =
        ui.drawRole === AUTO_ROLE
          ? inferRole(project.components, project.wires, from, to)
          : (ui.drawRole as ConductorRole);
      const id = store.getState().addWire({
        from,
        to,
        role,
        csa: ui.drawCsa,
        length: ui.drawLength,
        material: 'Cu',
        color: null,
        points: [],
        installMethod: project.settings.defaultInstallMethod,
      });
      if (!id) ui.showToast(t('canvas.alreadyConnected'), 'error');
      setPending(null);
    },
    [pending, store, ui, project.components, project.wires, project.settings.defaultInstallMethod, t],
  );

  const onTerminalClick = useCallback(
    (e: React.PointerEvent, compId: string, terminalId: string) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      if (pending) completeWire(compId, terminalId);
      else setPending({ comp: compId, terminal: terminalId });
    },
    [pending, completeWire],
  );

  /* ---------------- pointer handling ---------------- */

  const onPointerDownBody = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (e.button !== 0) return;
      // While placing a note, a click belongs to the canvas even when it lands
      // on top of a device.
      if (ui.mode === 'text') return;
      e.stopPropagation();
      // In live mode a click operates the device instead of selecting it.
      const comp = project.components.find((c) => c.id === id);
      const def = comp ? getDef(comp.type) : undefined;
      if (running && def?.interactive && def.interactive !== 'none' && !e.shiftKey && !e.altKey) {
        if (def.interactive === 'button') {
          operate(id, 'press');
          const up = () => {
            operate(id, 'release');
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointerup', up);
        } else if (def.interactive === 'plug') {
          operate(id, 'toggle');
        } else {
          operate(id, 'toggle');
        }
        return;
      }
      if (!selection.includes(id)) store.getState().toggleSelect(id, e.shiftKey);
      store.getState().beginGesture();
      drag.current = { kind: 'move', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [project.components, running, operate, selection, store, ui.mode],
  );

  const onSvgPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (pinch.current) return;
      // With a finger, dragging empty canvas pans: a rubber-band selection is a
      // mouse idiom and would make the drawing impossible to move.
      const isPan = e.button === 1 || ui.mode === 'pan' || e.altKey || (isTouch && e.pointerType !== 'mouse');
      if (isPan) {
        drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
        return;
      }
      if (e.button !== 0) return;
      if (pending) {
        setPending(null);
        return;
      }
      if (ui.mode === 'text') {
        const at = toWorld(e.clientX, e.clientY);
        store.getState().addAnnotation({
          kind: 'text',
          x: snap(at.x, ui.snap),
          y: snap(at.y, ui.snap),
          text: '',
          fontSize: 13,
          view: 'schematic',
        });
        ui.set('mode', 'select');
        return;
      }
      if (!e.shiftKey) store.getState().clearSelection();
      const w = toWorld(e.clientX, e.clientY);
      drag.current = { kind: 'select', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
      setMarquee({ x: w.x, y: w.y, w: 0, h: 0 });
    },
    [ui.mode, pending, store, toWorld],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pinch.current) return;
      const w = toWorld(e.clientX, e.clientY);
      setCursor(w);
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.lastX;
      const dy = e.clientY - d.lastY;
      if (Math.abs(e.clientX - d.startX) > 2 || Math.abs(e.clientY - d.startY) > 2) d.moved = true;
      d.lastX = e.clientX;
      d.lastY = e.clientY;

      if (d.kind === 'pan') {
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      } else if (d.kind === 'move') {
        store.getState().moveSelection(dx / view.zoom, dy / view.zoom, false);
      } else if (d.kind === 'select') {
        const start = toWorld(d.startX, d.startY);
        setMarquee({
          x: Math.min(start.x, w.x),
          y: Math.min(start.y, w.y),
          w: Math.abs(w.x - start.x),
          h: Math.abs(w.y - start.y),
        });
      } else if (d.kind === 'annotation' && d.annotationId) {
        store.getState().touch((p) => {
          const a = p.annotations.find((x) => x.id === d.annotationId);
          if (a) {
            a.x += dx / view.zoom;
            a.y += dy / view.zoom;
          }
        });
      } else if (d.kind === 'bend' && d.wireId !== undefined && d.bendIndex !== undefined) {
        const wire = project.wires.find((x) => x.id === d.wireId);
        if (wire) {
          store.getState().touch((p) => {
            const target = p.wires.find((x) => x.id === d.wireId);
            if (target?.points?.[d.bendIndex!]) {
              target.points[d.bendIndex!] = { x: snap(w.x, ui.snap), y: snap(w.y, ui.snap) };
            }
          });
        }
      }
    },
    [toWorld, view.zoom, store, project.wires, ui.snap],
  );

  const onPointerUp = useCallback((e?: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === 'move') {
      if (d.moved) {
        // Snap the whole selection to the grid once, at the end of the drag.
        store.getState().endGesture((p) => {
          const ids = new Set(store.getState().selection);
          for (const c of p.components) {
            if (ids.has(c.id)) {
              c.x = snap(c.x, ui.snap);
              c.y = snap(c.y, ui.snap);
            }
          }
        });
      } else {
        // A click that selected something is not a history entry.
        store.getState().cancelGesture();
      }
    }
    if (d.kind === 'bend' || d.kind === 'annotation') {
      if (d.moved) {
        store.getState().endGesture((p) => {
          if (d.kind !== 'annotation' || !d.annotationId) return;
          const a = p.annotations.find((x) => x.id === d.annotationId);
          if (a) {
            a.x = snap(a.x, ui.snap);
            a.y = snap(a.y, ui.snap);
          }
        });
      } else store.getState().cancelGesture();
    }
    if (d.kind === 'select' && marquee && (marquee.w > 4 || marquee.h > 4)) {
      const hits = project.components
        .filter((c) => {
          const b = boxOf(c);
          return (
            b.x < marquee.x + marquee.w && b.x + b.w > marquee.x &&
            b.y < marquee.y + marquee.h && b.y + b.h > marquee.y
          );
        })
        .map((c) => c.id);
      store.getState().select(hits);
    }
    setMarquee(null);
  }, [store, ui.snap, marquee, project.components]);

  /*
   * Two-finger gestures are tracked in the capture phase. A finger that lands on
   * a device or a conductor is stopped by that element's own handler and would
   * never reach the canvas, so bubble-phase bookkeeping misses it and a pinch
   * that starts on top of the drawing does nothing.
   */
  const onPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinch.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
        };
        // Abandon whatever one finger had started; two fingers mean navigation.
        if (drag.current && drag.current.kind !== 'select' && drag.current.kind !== 'pan') {
          store.getState().cancelGesture();
        }
        drag.current = null;
        setMarquee(null);
        setPending(null);
        e.stopPropagation();
      }
    },
    [store],
  );

  const onPointerMoveCapture = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size < 2 || !pinch.current) return;
    e.stopPropagation();
    const [a, b] = [...pointers.current.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const prev = pinch.current;
    pinch.current = { dist, cx, cy };
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || prev.dist <= 0) return;
    const factor = dist / prev.dist;
    const px = cx - r.left;
    const py = cy - r.top;
    const panX = cx - prev.cx;
    const panY = cy - prev.cy;
    setView((v) => {
      const zoom = Math.min(6, Math.max(0.1, v.zoom * factor));
      const k = zoom / v.zoom;
      return { zoom, x: px - (px - v.x) * k + panX, y: py - (py - v.y) * k + panY };
    });
  }, []);

  const onPointerUpCapture = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const r = svgRef.current?.getBoundingClientRect();
      if (!r) return;
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const factor = Math.exp(-e.deltaY * 0.0014);
      setView((v) => {
        const zoom = Math.min(6, Math.max(0.1, v.zoom * factor));
        const k = zoom / v.zoom;
        return { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      });
    },
    [],
  );

  /* ---------------- drag & drop from the library ---------------- */

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/x-budova-component');
      if (!type) return;
      const w = toWorld(e.clientX, e.clientY);
      store.getState().addComponent(type, snap(w.x - 30, ui.snap), snap(w.y - 30, ui.snap));
    },
    [toWorld, store, ui.snap],
  );

  /* ---------------- keyboard ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPending(null);
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        fit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fit]);

  /* ---------------- render ---------------- */

  const pendingPos = useMemo(() => {
    if (!pending) return null;
    const c = project.components.find((x) => x.id === pending.comp);
    if (!c) return null;
    return terminalPositions(c).find((x) => x.id === pending.terminal) ?? null;
  }, [pending, project.components]);

  const gridSize = 10 * view.zoom;
  const showGridDots = ui.showGrid && gridSize > 4;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: 'var(--canvas)' }}>
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        onPointerDownCapture={onPointerDownCapture}
        onPointerMoveCapture={onPointerMoveCapture}
        onPointerUpCapture={onPointerUpCapture}
        onPointerCancelCapture={onPointerUpCapture}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ cursor: ui.mode === 'pan' ? 'grab' : pending ? 'crosshair' : 'default' }}
      >
        <defs>
          <pattern
            id="grid-fine"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${view.x % gridSize} ${view.y % gridSize})`}
          >
            <circle cx={0.5} cy={0.5} r={0.6} fill="var(--grid-strong)" />
          </pattern>
          <pattern
            id="grid-coarse"
            width={gridSize * 10}
            height={gridSize * 10}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${view.x % (gridSize * 10)} ${view.y % (gridSize * 10)})`}
          >
            <rect width={gridSize * 10} height={gridSize * 10} fill="none" stroke="var(--grid)" strokeWidth={1} />
          </pattern>
        </defs>
        {showGridDots && <rect x={0} y={0} width="100%" height="100%" fill="url(#grid-fine)" />}
        {ui.showGrid && <rect x={0} y={0} width="100%" height="100%" fill="url(#grid-coarse)" />}

        <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`} id="schematic-root">
          {/* annotations behind everything */}
          {project.annotations
            .filter((a) => (a.view ?? 'schematic') === 'schematic')
            .map((a) => {
              const isSel = selectedAnnotations.includes(a.id);
              const onDown = (e: React.PointerEvent) => {
                e.stopPropagation();
                store.getState().select([], [], [a.id]);
                store.getState().beginGesture();
                drag.current = {
                  kind: 'annotation',
                  startX: e.clientX,
                  startY: e.clientY,
                  lastX: e.clientX,
                  lastY: e.clientY,
                  annotationId: a.id,
                  moved: false,
                };
              };
              return (
                <g key={a.id} onPointerDown={onDown} className="cursor-move">
                  {a.kind === 'rect' ? (
                    <rect
                      x={a.x}
                      y={a.y}
                      width={a.w ?? 100}
                      height={a.h ?? 60}
                      fill={a.color ?? 'var(--accent)'}
                      fillOpacity={0.06}
                      stroke={isSel ? 'var(--accent)' : a.color ?? 'var(--border-strong)'}
                      strokeDasharray="4 3"
                    />
                  ) : (
                    <>
                      {isSel && (
                        <rect
                          x={a.x - 4}
                          y={a.y - (a.fontSize ?? 13)}
                          width={Math.max(40, (a.text ?? '').length * (a.fontSize ?? 13) * 0.58) + 8}
                          height={(a.fontSize ?? 13) * 1.5}
                          fill="var(--accent)"
                          fillOpacity={0.1}
                          stroke="var(--accent)"
                          strokeDasharray="3 2"
                        />
                      )}
                      <text x={a.x} y={a.y} fontSize={a.fontSize ?? 13} fill={a.color ?? 'var(--text-dim)'}>
                        {a.text || t('canvas.notePlaceholder')}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

          <WireLayer
            project={project}
            wireI={results.wireI}
            selected={selectedWires}
            highlighted={ui.highlightWires}
            live={running}
            showLabels={view.zoom > 1.6 && !running}
            showCurrents={running && view.zoom > 0.95}
            onSelect={(e, id) => {
              if (ui.mode === 'text') return;
              e.stopPropagation();
              store.getState().select([], [id], []);
            }}
            toWorld={(e) => toWorld(e.clientX, e.clientY)}
            onAddBend={(id, x, y) => {
              store.getState().commit((p) => {
                const wire = p.wires.find((w) => w.id === id);
                if (!wire) return;
                const pt = { x: snap(x, ui.snap), y: snap(y, ui.snap) };
                // Insert the new bend at the nearest position along the run.
                const pts = [...(wire.points ?? [])];
                let best = pts.length;
                let bestD = Infinity;
                pts.forEach((existing, i) => {
                  const dd = Math.hypot(existing.x - pt.x, existing.y - pt.y);
                  if (dd < bestD) {
                    bestD = dd;
                    best = i;
                  }
                });
                pts.splice(best === pts.length ? pts.length : best + 1, 0, pt);
                wire.points = pts;
              });
            }}
            onBendDown={(e, id, index) => {
              store.getState().select([], [id]);
              store.getState().beginGesture();
              drag.current = {
                kind: 'bend',
                startX: e.clientX,
                startY: e.clientY,
                lastX: e.clientX,
                lastY: e.clientY,
                wireId: id,
                bendIndex: index,
                moved: false,
              };
            }}
            onBendRemove={(id, index) => {
              store.getState().commit((p) => {
                const wire = p.wires.find((w) => w.id === id);
                if (wire?.points) wire.points = wire.points.filter((_, i) => i !== index);
              });
            }}
          />

          {project.components.map((c) => (
            <ComponentNode
              key={c.id}
              comp={c}
              selected={selection.includes(c.id)}
              highlighted={ui.highlight.includes(c.id)}
              live={running}
              state={results.state[c.id] ?? {}}
              meas={results.meas[c.id] ?? {}}
              nodeV={results.nodeV}
              pendingTerminal={pending?.comp === c.id ? pending.terminal : null}
              compatibleTerminals={compatible}
              showTerminals={view.zoom > 0.4}
              touch={isTouch}
              onPointerDownBody={onPointerDownBody}
              onTerminalClick={onTerminalClick}
              onActivate={(id) => store.getState().select([id])}
            />
          ))}

          {/* conductor being drawn */}
          {pendingPos && (
            <path
              d={pathOf(
                routeWire(pendingPos, {
                  id: 'cursor',
                  def: { id: 'cursor', role: 'any', x: 0, y: 0 },
                  x: cursor.x,
                  y: cursor.y,
                  side: 'top',
                }),
              )}
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="none"
              pointerEvents="none"
            />
          )}

          {marquee && (
            <rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill="var(--accent)"
              fillOpacity={0.08}
              stroke="var(--accent)"
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {pending && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 max-w-[90vw] -translate-x-1/2 rounded px-3 py-1.5 text-center text-xs shadow"
             style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
          {t('canvas.wireHint')} · {t('canvas.wireCancel')}
        </div>
      )}

      {!project.components.length && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <div className="text-base font-medium">{t('canvas.emptyTitle')}</div>
          <div className="dim max-w-sm text-xs">{t('canvas.emptyHint')}</div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1 no-print">
        <button
          className={isTouch ? 'btn btn-touch' : 'btn btn-sm'}
          onClick={() => setView((v) => ({ ...v, zoom: Math.min(6, v.zoom * 1.25) }))}
          aria-label={t('action.zoomIn')}
        >
          +
        </button>
        <button
          className={isTouch ? 'btn btn-touch' : 'btn btn-sm'}
          onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.1, v.zoom / 1.25) }))}
          aria-label={t('action.zoomOut')}
        >
          −
        </button>
        <button className={isTouch ? 'btn btn-touch' : 'btn btn-sm'} onClick={fit} title={t('action.zoomFit')}>
          ⤢
        </button>
        <span className="faint ml-1 text-[11px] mono">{Math.round(view.zoom * 100)} %</span>
      </div>

      {ui.showMinimap && !isMobile && (
        <Minimap
          project={project}
          view={view}
          onJump={(x, y) => {
            const r = svgRef.current?.getBoundingClientRect();
            if (!r) return;
            setView((v) => ({ ...v, x: r.width / 2 - x * v.zoom, y: r.height / 2 - y * v.zoom }));
          }}
        />
      )}
    </div>
  );
}
