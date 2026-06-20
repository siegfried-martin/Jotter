/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { parseTimeline, type Annotation } from '@/lib/util/schedule';
import { prefetchTimelineEngine } from './timelinePrefetch';
import './timeline-editor.css';

/**
 * Timeline (resource-swimlane roadmap) section editor — a code-split vis-timeline instance
 * plus a custom free-floating annotation overlay.
 *
 * We own the data: `note_section.content` holds our own `TimelineDoc` (lanes + bars +
 * annotations), synced on the LWW track — no Yjs. vis-timeline only renders the lanes/bars;
 * annotations are rounded rectangles we draw and drag/resize ourselves on a layer above the
 * plot (time-anchored horizontally, free vertically). See
 * docs/initiatives/calendar-timeline-section.md.
 *
 * vis-timeline (+ vis-data + moment) is heavy, so it's loaded via dynamic import() inside the
 * mount effect: it stays out of the main/sectionEditor bundle and only downloads when a
 * Timeline section is opened.
 */

// A small palette of bar/annotation tints (fill / border / text).
const PALETTE = [
  { name: 'Cyan', fill: '#cffafe', border: '#0891b2', text: '#155e75' },
  { name: 'Blue', fill: '#dbeafe', border: '#2563eb', text: '#1e40af' },
  { name: 'Emerald', fill: '#d1fae5', border: '#059669', text: '#065f46' },
  { name: 'Amber', fill: '#fef3c7', border: '#d97706', text: '#92400e' },
  { name: 'Rose', fill: '#ffe4e6', border: '#e11d48', text: '#9f1239' },
  { name: 'Violet', fill: '#ede9fe', border: '#7c3aed', text: '#5b21b6' },
  { name: 'Slate', fill: '#e2e8f0', border: '#475569', text: '#334155' }
];

function paletteFor(fill?: string) {
  return PALETTE.find((p) => p.fill === fill) ?? PALETTE[0];
}
function styleFor(fill?: string): string {
  const p = paletteFor(fill);
  return `background-color:${p.fill};border-color:${p.border};color:${p.text};`;
}

const uid = () => crypto.randomUUID();

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return ymd(d);
}
function toDateInput(v: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(+d) ? '' : ymd(d);
}
const ms = (v: string) => new Date(v).getTime();
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type Lane = { id: string; content: string };
type Editing =
  | { kind: 'item'; id: string }
  | { kind: 'annotation'; id: string }
  | { kind: 'lane'; id: string }
  | null;

// Pixel/time geometry of the vis plot area, refreshed on every redraw so the overlay tracks.
type Geo = { left: number; top: number; width: number; height: number; winStart: number; winEnd: number };

export type ItemFields = { title: string; start: string; end: string; group: string; color: string };
export type AnnotationFields = { title: string; start: string; end: string; color: string };

export type TimelineApi = {
  addLane: (name?: string, open?: boolean) => string;
  addItem: (partial?: Partial<ItemFields>, open?: boolean) => string;
  updateItem: (id: string, patch: Partial<ItemFields>) => void;
  removeItem: (id: string) => void;
  updateLane: (id: string, content: string) => void;
  removeLane: (id: string) => void;
  getItem: (id: string) => ItemFields | null;
  getLanes: () => Lane[];
  addAnnotation: (partial?: Partial<AnnotationFields>, open?: boolean) => string;
  updateAnnotation: (id: string, patch: Partial<AnnotationFields>) => void;
  removeAnnotation: (id: string) => void;
  getAnnotation: (id: string) => AnnotationFields | null;
  getAnnotations: () => { id: string; title: string }[];
  fit: () => void;
};

export function TimelineEditor({
  initial,
  onChange
}: {
  initial: string;
  onChange: (content: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useCallbackRef(onChange);
  const initialRef = useRef(initial);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [editing, setEditing] = useState<Editing>(null);
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const [geo, setGeo] = useState<Geo | null>(null);

  const apiRef = useRef<TimelineApi | null>(null);
  const timelineRef = useRef<any>(null);
  // Annotations live in React (not vis); refs so the effect's serialize() and the overlay
  // share one source of truth, with a bump to re-render.
  const annotationsRef = useRef<Annotation[]>([]);
  const persistRef = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let timeline: any = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let measureRaf = 0;

    // Resolve once the container is actually laid out (non-zero size). vis caches its
    // dimensions at construction and only refreshes them via _onResize (window 'resize' or a
    // 1000ms poll); constructing while the modal's height is still 0 makes it cache 0 and
    // render an empty grid until the next poll — the ~1s lag. Waiting here means vis sees the
    // real size on init and draws correctly the first time. Capped so it can never hang.
    const waitForSize = () =>
      new Promise<void>((resolve) => {
        let tries = 0;
        const check = () => {
          const el = containerRef.current;
          if (disposed || tries++ > 90 || (el && el.clientHeight > 0 && el.clientWidth > 0)) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });

    (async () => {
      try {
        // Reuses the prefetched chunk when the card/Add button was hovered first (instant);
        // otherwise this is the first load.
        const vis: any = await prefetchTimelineEngine();
        if (disposed || !containerRef.current) return;

        const doc = parseTimeline(initialRef.current);
        annotationsRef.current = doc.annotations.map((a) => ({ ...a }));

        const items = new vis.DataSet(
          doc.items.map((it) => ({
            id: it.id,
            group: it.group,
            content: it.title,
            start: it.start,
            end: it.end,
            type: 'range',
            color: it.color,
            style: styleFor(it.color)
          }))
        );
        const groups = new vis.DataSet(
          doc.groups.map((g) => ({
            id: g.id,
            content: g.content,
            ...(g.nestedGroups ? { nestedGroups: g.nestedGroups } : {})
          }))
        );

        // Don't construct until the modal has laid the container out (see waitForSize).
        await waitForSize();
        if (disposed || !containerRef.current) return;

        timeline = new vis.Timeline(containerRef.current, items as any, groups as any, {
          editable: { add: false, remove: false, updateTime: true, updateGroup: true },
          selectable: true,
          stack: true,
          stackSubgroups: true,
          orientation: { axis: 'top', item: 'top' },
          // Fill the container (not just the lane content) so there's empty plot below the
          // lanes to float annotations into when the lanes don't reach the bottom.
          height: '100%',
          margin: { item: { horizontal: 6, vertical: 10 }, axis: 14 },
          zoomMin: 1000 * 60 * 60 * 24, // 1 day
          zoomMax: 1000 * 60 * 60 * 24 * 365 * 6, // ~6 years
          tooltip: { followMouse: true },
          // Pin the initial window via OPTIONS (not a post-construction setWindow) so vis never
          // does its deferred auto-fit-to-data over a restored zoom.
          ...(doc.window ? { start: doc.window.start, end: doc.window.end } : {})
        } as any);
        timelineRef.current = timeline;

        // First open of a populated board with no saved zoom → frame it once.
        if (!doc.window && (doc.items.length || doc.annotations.length)) {
          timeline.fit({ animation: false });
        }

        // ---- serialize / persist (our own JSON) ------------------------------------------
        const outDate = (v: any, fallback?: any): string => {
          if (v == null) return fallback == null ? '' : outDate(fallback);
          return typeof v === 'string' ? toDateInput(v) : ymd(new Date(v));
        };
        const serialize = (): string => {
          const win = timeline?.getWindow?.();
          return JSON.stringify({
            groups: (groups.get() as any[]).map((g) => ({
              id: g.id,
              content: g.content,
              ...(g.nestedGroups ? { nestedGroups: g.nestedGroups } : {})
            })),
            items: (items.get() as any[]).map((i) => ({
              id: i.id,
              title: i.content,
              start: outDate(i.start),
              end: outDate(i.end, i.start),
              group: i.group,
              color: i.color
            })),
            annotations: annotationsRef.current.map((a) => ({ ...a })),
            window: win
              ? { start: new Date(win.start).toISOString(), end: new Date(win.end).toISOString() }
              : undefined
          });
        };
        const persist = () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => onChangeRef(serialize()), 250);
        };
        persistRef.current = persist;

        items.on('*', (event: string) => {
          persist();
          if (event === 'add' || event === 'remove') bump();
        });
        groups.on('*', () => {
          persist();
          bump();
        });
        timeline.on('rangechanged', (props: any) => {
          if (props?.byUser) persist();
        });

        // ---- keep the annotation overlay aligned with the plot ----------------------------
        const measure = () => {
          if (measureRaf) cancelAnimationFrame(measureRaf);
          measureRaf = requestAnimationFrame(() => {
            const cont = containerRef.current;
            const center = cont?.querySelector('.vis-panel.vis-center') as HTMLElement | null;
            if (!cont || !center || !timeline) return;
            const c = center.getBoundingClientRect();
            const o = cont.getBoundingClientRect();
            const w = timeline.getWindow();
            setGeo({
              left: c.left - o.left,
              top: c.top - o.top,
              width: c.width,
              height: c.height,
              winStart: +w.start,
              winEnd: +w.end
            });
          });
        };
        timeline.on('changed', measure);
        timeline.on('rangechange', measure);

        const api: TimelineApi = {
          addLane(name, open = false) {
            const id = uid();
            groups.add({ id, content: name?.trim() || 'New lane' } as any);
            if (open) setEditing({ kind: 'lane', id });
            return id;
          },
          addItem(partial, open = false) {
            let group = partial?.group;
            if (!group) {
              const lanes = groups.get() as any[];
              group = lanes.length ? lanes[0].id : api.addLane('New lane');
            }
            const id = uid();
            const color = partial?.color ?? PALETTE[0].fill;
            items.add({
              id,
              group,
              content: partial?.title ?? 'New item',
              start: partial?.start ?? today(),
              end: partial?.end ?? today(14),
              type: 'range',
              color,
              style: styleFor(color)
            } as any);
            if (open) setEditing({ kind: 'item', id });
            return id;
          },
          updateItem(id, patch) {
            const next: any = { id };
            if (patch.title !== undefined) next.content = patch.title;
            if (patch.start !== undefined) next.start = patch.start;
            if (patch.end !== undefined) next.end = patch.end;
            if (patch.group !== undefined) next.group = patch.group;
            if (patch.color !== undefined) {
              next.color = patch.color;
              next.style = styleFor(patch.color);
            }
            items.update(next);
          },
          removeItem(id) {
            items.remove(id);
          },
          updateLane(id, content) {
            groups.update({ id, content } as any);
          },
          removeLane(id) {
            const orphans = (items.get() as any[]).filter((i) => i.group === id).map((i) => i.id);
            if (orphans.length) items.remove(orphans);
            groups.remove(id);
          },
          getItem(id) {
            const i = items.get(id) as any;
            if (!i) return null;
            return {
              title: i.content ?? '',
              start: outDate(i.start),
              end: outDate(i.end, i.start),
              group: i.group ?? '',
              color: i.color ?? PALETTE[0].fill
            };
          },
          getLanes() {
            return (groups.get() as any[])
              .filter((g) => !g.nestedGroups)
              .map((g) => ({ id: g.id, content: g.content }));
          },
          addAnnotation(partial, open = false) {
            // Default to a box in the middle third of the current view so it lands on screen.
            const w = timeline.getWindow();
            const s = +w.start;
            const span = +w.end - s || 864e5;
            const id = uid();
            const ann: Annotation = {
              id,
              title: partial?.title ?? 'Annotation',
              start: partial?.start ?? new Date(s + span / 3).toISOString(),
              end: partial?.end ?? new Date(s + (span * 2) / 3).toISOString(),
              topPct: 0.1,
              heightPct: 0.3,
              color: partial?.color ?? '#fde68a'
            };
            annotationsRef.current = [...annotationsRef.current, ann];
            bump();
            persist();
            if (open) setEditing({ kind: 'annotation', id });
            return id;
          },
          updateAnnotation(id, patch) {
            annotationsRef.current = annotationsRef.current.map((a) =>
              a.id === id ? { ...a, ...patch } : a
            );
            bump();
            persist();
          },
          removeAnnotation(id) {
            annotationsRef.current = annotationsRef.current.filter((a) => a.id !== id);
            bump();
            persist();
          },
          getAnnotation(id) {
            const a = annotationsRef.current.find((x) => x.id === id);
            if (!a) return null;
            return {
              title: a.title ?? '',
              start: toDateInput(a.start),
              end: toDateInput(a.end),
              color: a.color ?? '#fde68a'
            };
          },
          getAnnotations() {
            return annotationsRef.current.map((a) => ({ id: a.id, title: a.title ?? '' }));
          },
          fit() {
            timeline?.fit({ animation: true });
          }
        };
        apiRef.current = api;

        timeline.on('doubleClick', (props: any) => {
          if (props.item != null) {
            setEditing({ kind: 'item', id: String(props.item) });
          } else if (props.what === 'group-label' && props.group != null) {
            setEditing({ kind: 'lane', id: String(props.group) });
          } else if (props.group != null && props.time) {
            const start = ymd(new Date(props.time));
            const end = ymd(new Date(new Date(props.time).getTime() + 14 * 864e5));
            api.addItem({ group: String(props.group), start, end }, true);
          }
        });

        setStatus('ready');
        bump();
        measure();

        if (import.meta.env.DEV) {
          (window as unknown as Record<string, unknown>).__TIMELINE_API__ = api;
        }
      } catch (err) {
        if (!disposed) {
          console.error('Failed to load the timeline editor', err);
          setStatus('error');
        }
      }
    })();

    return () => {
      disposed = true;
      if (debounce) clearTimeout(debounce);
      if (measureRaf) cancelAnimationFrame(measureRaf);
      timeline?.destroy();
      timelineRef.current = null;
      apiRef.current = null;
      if (import.meta.env.DEV) {
        delete (window as unknown as Record<string, unknown>).__TIMELINE_API__;
      }
    };
  }, [onChangeRef]);

  const api = apiRef.current;
  const ready = status === 'ready';

  // Commit annotation geometry edits (drag/resize) back into the ref + persist.
  const writeAnnotation = (id: string, patch: Partial<Annotation>) => {
    annotationsRef.current = annotationsRef.current.map((a) =>
      a.id === id ? { ...a, ...patch } : a
    );
    bump();
  };
  const commit = () => persistRef.current();

  return (
    <div className="flex h-full w-full flex-col" data-testid="timeline-editor">
      <div className="mb-2 flex flex-shrink-0 flex-wrap items-center gap-2">
        <ToolbarButton onClick={() => api?.addLane(undefined, true)} disabled={!ready}>
          + Lane
        </ToolbarButton>
        <ToolbarButton onClick={() => api?.addItem(undefined, true)} disabled={!ready}>
          + Bar
        </ToolbarButton>
        <ToolbarButton onClick={() => api?.addAnnotation(undefined, true)} disabled={!ready}>
          + Annotation
        </ToolbarButton>
        <ToolbarButton onClick={() => api?.fit()} disabled={!ready}>
          Fit
        </ToolbarButton>
        <span className="ml-1 text-xs text-slate-400">
          Drag to move or resize · double-click a bar to edit, a lane to rename, empty space to
          add · annotations float — drag/resize them anywhere
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200">
        <div ref={containerRef} className="h-full w-full" />

        {/* Free-floating annotation overlay — sits above the plot, only the boxes catch
            pointer events so panning/bar-dragging still works in the gaps. */}
        {geo && api && (
          <div
            className="pointer-events-none absolute z-20 overflow-hidden"
            style={{ left: geo.left, top: geo.top, width: geo.width, height: geo.height }}
          >
            {annotationsRef.current.map((a) => (
              <AnnotationBox
                key={a.id}
                ann={a}
                geo={geo}
                onEdit={() => setEditing({ kind: 'annotation', id: a.id })}
                onGeometry={(patch) => writeAnnotation(a.id, patch)}
                onCommit={commit}
              />
            ))}
          </div>
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Loading timeline…
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500">
            Couldn’t load the timeline editor.
          </div>
        )}
      </div>

      {editing && api && (
        <EditPanel editing={editing} api={api} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

// ---- annotation overlay box -------------------------------------------------------------

type DragMode = { body?: boolean; left?: boolean; right?: boolean; top?: boolean; bottom?: boolean };

function AnnotationBox({
  ann,
  geo,
  onEdit,
  onGeometry,
  onCommit
}: {
  ann: Annotation;
  geo: Geo;
  onEdit: () => void;
  onGeometry: (patch: Partial<Annotation>) => void;
  onCommit: () => void;
}) {
  const p = paletteFor(ann.color);
  const span = geo.winEnd - geo.winStart || 1;
  const xOf = (t: number) => ((t - geo.winStart) / span) * geo.width;
  const left = xOf(ms(ann.start));
  const width = Math.max(xOf(ms(ann.end)) - left, 8);
  const topPct = ann.topPct ?? 0.1;
  const heightPct = ann.heightPct ?? 0.3;
  const top = topPct * geo.height;
  const height = Math.max(heightPct * geo.height, 20);

  function startDrag(e: React.PointerEvent, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const o = { start: ms(ann.start), end: ms(ann.end), topPct, heightPct };
    const minDur = span * 0.01; // keep at least ~1% of the view wide

    const move = (ev: PointerEvent) => {
      const dt = ((ev.clientX - startX) / geo.width) * span;
      const dPct = (ev.clientY - startY) / geo.height;
      const patch: Partial<Annotation> = {};
      if (mode.body) {
        patch.start = new Date(o.start + dt).toISOString();
        patch.end = new Date(o.end + dt).toISOString();
        patch.topPct = clamp(o.topPct + dPct, 0, 1 - o.heightPct);
      }
      if (mode.left) patch.start = new Date(Math.min(o.start + dt, o.end - minDur)).toISOString();
      if (mode.right) patch.end = new Date(Math.max(o.end + dt, o.start + minDur)).toISOString();
      if (mode.top) {
        const nt = clamp(o.topPct + dPct, 0, o.topPct + o.heightPct - 0.04);
        patch.topPct = nt;
        patch.heightPct = o.topPct + o.heightPct - nt;
      }
      if (mode.bottom) patch.heightPct = clamp(o.heightPct + dPct, 0.04, 1 - o.topPct);
      onGeometry(patch);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onCommit();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const handle = 'absolute bg-transparent';
  return (
    <div
      data-testid="timeline-annotation"
      onPointerDown={(e) => startDrag(e, { body: true })}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      title={ann.title}
      style={{
        left,
        top,
        width,
        height,
        backgroundColor: p.fill,
        borderColor: p.border,
        color: p.text,
        opacity: 0.92
      }}
      className="pointer-events-auto absolute flex cursor-move items-start overflow-hidden rounded-lg border-2 border-dashed px-2 py-1 text-[11px] font-semibold shadow-sm"
    >
      <span className="pointer-events-none truncate">{ann.title}</span>
      {/* edge + corner resize handles */}
      <div className={`${handle} left-0 top-0 h-full w-1.5 cursor-ew-resize`} onPointerDown={(e) => startDrag(e, { left: true })} />
      <div className={`${handle} right-0 top-0 h-full w-1.5 cursor-ew-resize`} onPointerDown={(e) => startDrag(e, { right: true })} />
      <div className={`${handle} left-0 top-0 h-1.5 w-full cursor-ns-resize`} onPointerDown={(e) => startDrag(e, { top: true })} />
      <div className={`${handle} bottom-0 left-0 h-1.5 w-full cursor-ns-resize`} onPointerDown={(e) => startDrag(e, { bottom: true })} />
      <div className={`${handle} bottom-0 right-0 h-2.5 w-2.5 cursor-nwse-resize`} onPointerDown={(e) => startDrag(e, { right: true, bottom: true })} />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * Docked editor for the selected bar, annotation, or lane. Escape closes the panel (stopped
 * from bubbling, so it doesn't also close the section modal — the panel owns Escape).
 */
function EditPanel({
  editing,
  api,
  onClose
}: {
  editing: NonNullable<Editing>;
  api: TimelineApi;
  onClose: () => void;
}) {
  const [item, setItem] = useState<ItemFields | null>(null);
  const [laneName, setLaneName] = useState('');

  useEffect(() => {
    if (editing.kind === 'item') {
      setItem(api.getItem(editing.id));
    } else if (editing.kind === 'annotation') {
      const a = api.getAnnotation(editing.id);
      setItem(a ? { ...a, group: '' } : null);
    } else {
      const lane = api.getLanes().find((l) => l.id === editing.id);
      setLaneName(lane?.content ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing.kind, editing.id]);

  function onKeyDown(e: React.KeyboardEvent) {
    // Enter commits & closes the panel; Escape closes it. Both are stopped from bubbling so
    // they don't also reach the section modal (which saves on Escape).
    if (e.key === 'Escape' || (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'SELECT')) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }

  if (editing.kind === 'lane') {
    return (
      <div
        data-testid="timeline-edit-panel"
        onKeyDown={onKeyDown}
        className="mt-2 flex flex-shrink-0 flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
      >
        <Field label="Lane name">
          <input
            autoFocus
            value={laneName}
            onChange={(e) => {
              setLaneName(e.target.value);
              api.updateLane(editing.id, e.target.value);
            }}
            className="w-56 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
          />
        </Field>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              api.removeLane(editing.id);
              onClose();
            }}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete lane
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-cyan-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!item) return null;
  const isAnn = editing.kind === 'annotation';
  const upd = (patch: Partial<ItemFields>) =>
    isAnn ? api.updateAnnotation(editing.id, patch) : api.updateItem(editing.id, patch);
  const del = () => (isAnn ? api.removeAnnotation(editing.id) : api.removeItem(editing.id));
  const lanes = api.getLanes();
  return (
    <div
      data-testid="timeline-edit-panel"
      onKeyDown={onKeyDown}
      className="mt-2 flex flex-shrink-0 flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
    >
      <Field label={isAnn ? 'Annotation' : 'Title'}>
        <input
          autoFocus
          value={item.title}
          onChange={(e) => {
            setItem({ ...item, title: e.target.value });
            upd({ title: e.target.value });
          }}
          className="w-52 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
      </Field>
      <Field label="Start">
        <input
          type="date"
          value={item.start}
          onChange={(e) => {
            setItem({ ...item, start: e.target.value });
            upd({ start: e.target.value });
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
      </Field>
      <Field label="End">
        <input
          type="date"
          value={item.end}
          onChange={(e) => {
            setItem({ ...item, end: e.target.value });
            upd({ end: e.target.value });
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
      </Field>
      {!isAnn && (
        <Field label="Lane">
          <select
            value={item.group}
            onChange={(e) => {
              setItem({ ...item, group: e.target.value });
              upd({ group: e.target.value });
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            {lanes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.content}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Color">
        <div className="flex items-center gap-1.5 py-0.5">
          {PALETTE.map((pp) => (
            <button
              key={pp.fill}
              type="button"
              aria-label={pp.name}
              onClick={() => {
                setItem({ ...item, color: pp.fill });
                upd({ color: pp.fill });
              }}
              style={{ backgroundColor: pp.fill, borderColor: pp.border }}
              className={`h-5 w-5 rounded-full border-2 ${
                item.color === pp.fill ? 'ring-2 ring-slate-400 ring-offset-1' : ''
              }`}
            />
          ))}
        </div>
      </Field>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            del();
            onClose();
          }}
          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-cyan-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
