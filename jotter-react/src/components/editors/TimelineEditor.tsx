/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { parseTimeline } from '@/lib/util/schedule';
import './timeline-editor.css';

/**
 * Timeline (resource-swimlane roadmap) section editor — a code-split vis-timeline instance.
 *
 * Unlike the table/diagram editors (which round-trip a library-opaque blob), vis-timeline
 * only *renders*: we own the data. `note_section.content` holds our own `TimelineDoc`
 * (lanes + bars), synced on the LWW track — no Yjs. See
 * docs/initiatives/calendar-timeline-section.md.
 *
 * vis-timeline (+ vis-data + moment) is heavy, so it's loaded via dynamic import() inside the
 * mount effect: it stays out of the main/sectionEditor bundle and only downloads when a
 * Timeline section is opened (the same code-split discipline TableEditor uses for Univer).
 */

// A small palette of bar tints (fill / border / text), chosen to read at a glance on a
// roadmap. Each item stores its `color` as the fill hex; the others are derived on render.
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
/** Today (+offset days) as YYYY-MM-DD. */
function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return ymd(d);
}
/** Coerce any stored date to an <input type="date"> value. */
function toDateInput(v: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(+d) ? '' : ymd(d);
}

type Lane = { id: string; content: string };
type Editing = { kind: 'item'; id: string } | { kind: 'lane'; id: string } | null;

export type TimelineApi = {
  addLane: (name?: string, open?: boolean) => string;
  addItem: (partial?: Partial<ItemFields>, open?: boolean) => string;
  updateItem: (id: string, patch: Partial<ItemFields>) => void;
  removeItem: (id: string) => void;
  updateLane: (id: string, content: string) => void;
  removeLane: (id: string) => void;
  getItem: (id: string) => ItemFields | null;
  getLanes: () => Lane[];
  fit: () => void;
};

export type ItemFields = {
  title: string;
  start: string;
  end: string;
  group: string;
  color: string;
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
  // Bumped on structural changes (lane/item add/remove) so the toolbar + panel re-read.
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const apiRef = useRef<TimelineApi | null>(null);

  useEffect(() => {
    let disposed = false;
    let timeline: any = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        // The standalone bundle re-exports Timeline + DataSet at runtime, but its type
        // subpath mis-resolves to the peer build (no DataSet) — cast to any (this file is
        // already untyped against vis on purpose).
        const vis: any = await import('vis-timeline/standalone');
        await import('vis-timeline/styles/vis-timeline-graph2d.min.css');
        if (disposed || !containerRef.current) return;

        const doc = parseTimeline(initialRef.current);
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

        timeline = new vis.Timeline(containerRef.current, items as any, groups as any, {
          editable: { add: false, remove: false, updateTime: true, updateGroup: true },
          selectable: true,
          stack: true,
          stackSubgroups: true,
          orientation: { axis: 'top', item: 'top' },
          margin: { item: { horizontal: 6, vertical: 10 }, axis: 14 },
          zoomMin: 1000 * 60 * 60 * 24, // 1 day
          zoomMax: 1000 * 60 * 60 * 24 * 365 * 6, // ~6 years
          orientationItem: 'top',
          tooltip: { followMouse: true }
        } as any);

        if (doc.window) {
          timeline.setWindow(doc.window.start, doc.window.end, { animation: false });
        } else if (doc.items.length) {
          timeline.fit({ animation: false });
        }

        // ---- serialize / persist (our own JSON, not a vis blob) --------------------------
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
              start: typeof i.start === 'string' ? toDateInput(i.start) : ymd(new Date(i.start)),
              end:
                i.end == null
                  ? toDateInput(typeof i.start === 'string' ? i.start : ymd(new Date(i.start)))
                  : typeof i.end === 'string'
                    ? toDateInput(i.end)
                    : ymd(new Date(i.end)),
              group: i.group,
              color: i.color
            })),
            window: win ? { start: new Date(win.start).toISOString(), end: new Date(win.end).toISOString() } : undefined
          });
        };
        const persist = () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => onChangeRef(serialize()), 250);
        };

        // Drag/resize/move-between-lanes all mutate the DataSets → persist. Structural
        // changes also re-render React (lane <select>, panel).
        items.on('*', (event: string) => {
          persist();
          if (event === 'add' || event === 'remove') bump();
        });
        groups.on('*', () => {
          persist();
          bump();
        });

        // ---- imperative API (used by the React toolbar/panel + the e2e hook) -------------
        const api: TimelineApi = {
          addLane(name, open = false) {
            const id = uid();
            groups.add({ id, content: name?.trim() || 'New lane' } as any);
            if (open) setEditing({ kind: 'lane', id });
            return id;
          },
          addItem(partial, open = false) {
            // Need a lane to hang the bar on — make one if the board is empty.
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
            // Drop the lane and any bars sitting in it.
            const orphans = (items.get() as any[]).filter((i) => i.group === id).map((i) => i.id);
            if (orphans.length) items.remove(orphans);
            groups.remove(id);
          },
          getItem(id) {
            const i = items.get(id) as any;
            if (!i) return null;
            return {
              title: i.content ?? '',
              start: toDateInput(typeof i.start === 'string' ? i.start : ymd(new Date(i.start))),
              end: toDateInput(
                i.end == null
                  ? typeof i.start === 'string'
                    ? i.start
                    : ymd(new Date(i.start))
                  : typeof i.end === 'string'
                    ? i.end
                    : ymd(new Date(i.end))
              ),
              group: i.group ?? '',
              color: i.color ?? PALETTE[0].fill
            };
          },
          getLanes() {
            return (groups.get() as any[])
              .filter((g) => !g.nestedGroups) // section headers aren't bar targets
              .map((g) => ({ id: g.id, content: g.content }));
          },
          fit() {
            timeline?.fit({ animation: true });
          }
        };
        apiRef.current = api;

        // Double-click interactions: a bar → edit it; a lane label → rename it; empty lane
        // space → add a bar there.
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
      timeline?.destroy();
      apiRef.current = null;
      if (import.meta.env.DEV) {
        delete (window as unknown as Record<string, unknown>).__TIMELINE_API__;
      }
    };
  }, [onChangeRef]);

  const api = apiRef.current;
  const ready = status === 'ready';

  return (
    <div className="flex h-full w-full flex-col" data-testid="timeline-editor">
      <div className="mb-2 flex flex-shrink-0 flex-wrap items-center gap-2">
        <ToolbarButton onClick={() => api?.addLane(undefined, true)} disabled={!ready}>
          + Lane
        </ToolbarButton>
        <ToolbarButton onClick={() => api?.addItem(undefined, true)} disabled={!ready}>
          + Bar
        </ToolbarButton>
        <ToolbarButton onClick={() => api?.fit()} disabled={!ready}>
          Fit
        </ToolbarButton>
        <span className="ml-1 text-xs text-slate-400">
          Drag to move or resize · double-click a bar to edit, a lane to rename, empty space to
          add
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200">
        <div ref={containerRef} className="h-full w-full" />
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
 * Docked editor for the selected bar or lane. Escape closes the panel (and is stopped from
 * bubbling, so it doesn't also close the section modal — the panel owns Escape while open).
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
    } else {
      const lane = api.getLanes().find((l) => l.id === editing.id);
      setLaneName(lane?.content ?? '');
    }
    // editing.id identifies the target; api is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing.kind, editing.id]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
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
  const lanes = api.getLanes();
  return (
    <div
      data-testid="timeline-edit-panel"
      onKeyDown={onKeyDown}
      className="mt-2 flex flex-shrink-0 flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
    >
      <Field label="Title">
        <input
          autoFocus
          value={item.title}
          onChange={(e) => {
            setItem({ ...item, title: e.target.value });
            api.updateItem(editing.id, { title: e.target.value });
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
            api.updateItem(editing.id, { start: e.target.value });
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
            api.updateItem(editing.id, { end: e.target.value });
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
      </Field>
      <Field label="Lane">
        <select
          value={item.group}
          onChange={(e) => {
            setItem({ ...item, group: e.target.value });
            api.updateItem(editing.id, { group: e.target.value });
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
      <Field label="Color">
        <div className="flex items-center gap-1.5 py-0.5">
          {PALETTE.map((p) => (
            <button
              key={p.fill}
              type="button"
              aria-label={p.name}
              onClick={() => {
                setItem({ ...item, color: p.fill });
                api.updateItem(editing.id, { color: p.fill });
              }}
              style={{ backgroundColor: p.fill, borderColor: p.border }}
              className={`h-5 w-5 rounded-full border-2 ${
                item.color === p.fill ? 'ring-2 ring-slate-400 ring-offset-1' : ''
              }`}
            />
          ))}
        </div>
      </Field>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            api.removeItem(editing.id);
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
