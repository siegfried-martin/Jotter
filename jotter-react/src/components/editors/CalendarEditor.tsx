/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { parseCalendar, type CalendarEvent, type CalendarView } from '@/lib/util/schedule';
import type { CalendarCanvasProps } from './CalendarCanvas';

const CalendarCanvas = lazy(() => import('./CalendarCanvas'));

/**
 * Calendar (month / two-month / hourly-week date grid) section editor.
 *
 * Like Timeline, the library only RENDERS — WE own the data: `note_section.content` holds our
 * own `CalendarDoc` (events with an all-day flag + the last view), synced on the LWW track —
 * no Yjs. The heavy FullCalendar instance is code-split into `CalendarCanvas` (React.lazy) so
 * it stays out of the main bundle and only downloads when a Calendar section is opened.
 * See docs/initiatives/calendar-timeline-section.md.
 *
 * UX: selecting days only HIGHLIGHTS them (the canvas keeps the selection). Turning a
 * highlight into an event is a separate, deliberate step — the create form (name + color,
 * with the date range at the bottom for the rare out-of-view span). Clicking an event opens
 * the same form, prefilled, in edit mode (no add button; a delete instead).
 */

// A small palette of event tints (indigo-led, to match the Calendar type color).
const PALETTE = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Slate', hex: '#64748b' }
];
const DEFAULT_COLOR = PALETTE[0].hex;

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'fiveWeek', label: '5 Week' },
  { key: 'week', label: 'Week' }
];

const uid = () => crypto.randomUUID();

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
/** ISO/whatever → a `<input type=date>` value (YYYY-MM-DD). */
function toDateInput(v: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(+d) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** ISO/whatever → a `<input type=datetime-local>` value (local YYYY-MM-DDTHH:mm). */
function toDateTimeInput(v: string): string {
  const d = new Date(v);
  if (Number.isNaN(+d)) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** Shift a YYYY-MM-DD value by `n` days (used to bridge FullCalendar's exclusive all-day end). */
function shiftDay(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(+d)) return ymd;
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// All-day spans are stored with an EXCLUSIVE end (FullCalendar's convention: a Jul 6–8 event
// ends Jul 9). The End field shows the inclusive last day, converting on the way in and out.
function allDayEndToDisplay(end: string, start: string): string {
  const inclusive = shiftDay(toDateInput(end), -1);
  return inclusive < toDateInput(start) ? toDateInput(start) : inclusive;
}
function allDayEndFromDisplay(display: string): string {
  return shiftDay(display, 1);
}

/** The mutable fields a create-draft / event edit share. */
type EventFields = {
  title: string;
  color: string;
  start: string;
  end: string;
  allDay: boolean;
};

// The docked form is either creating a new event from a highlighted range, or editing one.
type Panel = { mode: 'create'; draft: EventFields } | { mode: 'edit'; id: string } | null;

export type CalendarApi = {
  addEvent: (partial?: Partial<CalendarEvent>, open?: boolean) => string;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  getEvent: (id: string) => CalendarEvent | null;
  getEvents: () => { id: string; title: string }[];
  setView: (view: CalendarView) => void;
  /** Open the create form for a range (the highlight path, exposed for e2e). */
  openCreate: (sel: { start: string; end: string; allDay: boolean }) => void;
};

export function CalendarEditor({
  initial,
  onChange
}: {
  initial: string;
  onChange: (content: string) => void;
}) {
  const onChangeRef = useCallbackRef(onChange);

  // Source of truth lives in refs; a version bump drives re-render (mirrors TimelineEditor).
  const parsed = useRef(parseCalendar(initial));
  const eventsRef = useRef<CalendarEvent[]>(parsed.current.events);
  const viewRef = useRef<CalendarView>(parsed.current.defaultView ?? 'month');
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const [panel, setPanel] = useState<Panel>(null);
  const panelRef = useRef<Panel>(null);
  panelRef.current = panel;

  // The canvas hands us its highlight controls (set a range / clear it).
  const canvasApiRef = useRef<{
    unselect: () => void;
    select: (r: { start: string; end: string; allDay: boolean }) => void;
  }>({ unselect: () => {}, select: () => {} });
  // Most-recently used color — new events default to it while you keep adding.
  const lastColorRef = useRef<string>(DEFAULT_COLOR);

  // Reflect a date range as the canvas highlight (covers cross-month / out-of-view spans).
  // The select-callback echo this triggers is ignored downstream (the form is open), so the
  // typed dates stay the source of truth.
  function applyHighlight(range: { start: string; end: string; allDay: boolean }) {
    canvasApiRef.current.select(range);
  }

  function persist() {
    onChangeRef(JSON.stringify({ events: eventsRef.current, defaultView: viewRef.current }));
  }

  const addEvent = useCallbackRef((partial?: Partial<CalendarEvent>, open = false): string => {
    const id = uid();
    const todayStr = toDateInput(new Date().toISOString());
    const ev: CalendarEvent = {
      id,
      title: partial?.title?.trim() || 'New event',
      start: partial?.start ?? todayStr,
      end: partial?.end ?? partial?.start ?? todayStr,
      allDay: partial?.allDay ?? true,
      color: partial?.color ?? DEFAULT_COLOR
    };
    eventsRef.current = [...eventsRef.current, ev];
    persist();
    bump();
    if (open) setPanel({ mode: 'edit', id });
    return id;
  });

  const updateEvent = useCallbackRef((id: string, patch: Partial<CalendarEvent>) => {
    eventsRef.current = eventsRef.current.map((e) => (e.id === id ? { ...e, ...patch } : e));
    persist();
    bump();
  });

  const removeEvent = useCallbackRef((id: string) => {
    eventsRef.current = eventsRef.current.filter((e) => e.id !== id);
    persist();
    bump();
  });

  const setView = useCallbackRef((view: CalendarView) => {
    if (viewRef.current === view) return;
    viewRef.current = view;
    persist();
    bump();
  });

  // Open the create form for a highlighted range (keeps the highlight; commit creates). New
  // events default to the last color used this session.
  const openCreate = useCallbackRef((sel: { start: string; end: string; allDay: boolean }) => {
    setPanel({
      mode: 'create',
      draft: {
        title: '',
        color: lastColorRef.current,
        start: sel.start,
        end: sel.end,
        allDay: sel.allDay
      }
    });
  });

  // A field changed in the create form: update the draft, track color, and re-highlight when
  // the dates move (so manual Start/End edits show on the grid, even across months).
  const createField = useCallbackRef((patch: Partial<EventFields>) => {
    const cur = panelRef.current;
    if (cur?.mode !== 'create') return;
    const draft = { ...cur.draft, ...patch };
    if (patch.color) lastColorRef.current = draft.color;
    setPanel({ mode: 'create', draft });
    if ('start' in patch || 'end' in patch || 'allDay' in patch) {
      applyHighlight({ start: draft.start, end: draft.end, allDay: draft.allDay });
    }
  });

  const closePanel = useCallbackRef(() => {
    setPanel(null);
    canvasApiRef.current.unselect();
  });

  // DEV-only facade for e2e — arrange events / drive the form without real FullCalendar drags.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const api: CalendarApi = {
      addEvent,
      updateEvent,
      removeEvent,
      getEvent: (id) => eventsRef.current.find((e) => e.id === id) ?? null,
      getEvents: () => eventsRef.current.map((e) => ({ id: e.id, title: e.title })),
      setView,
      openCreate
    };
    (window as any).__CALENDAR_API__ = api;
    return () => {
      delete (window as any).__CALENDAR_API__;
    };
  }, [addEvent, updateEvent, removeEvent, setView, openCreate]);

  // Escape closes the form first (rather than the section modal). Capture phase +
  // stopImmediatePropagation pre-empts sectionEditor's window keydown handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelRef.current) {
        e.stopImmediatePropagation();
        e.preventDefault();
        setPanel(null);
        canvasApiRef.current.unselect();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const canvasProps: CalendarCanvasProps = {
    events: eventsRef.current.map((e) => ({
      id: e.id,
      title: e.title || '(untitled)',
      start: e.start,
      end: e.end || undefined,
      allDay: e.allDay,
      backgroundColor: e.color || DEFAULT_COLOR,
      borderColor: e.color || DEFAULT_COLOR
    })),
    view: viewRef.current,
    onSelect: (sel) => {
      // Only a fresh highlight (no form open) starts a new event. While the form is open we
      // ignore selection events — both our own highlight echoes and stray re-selects — so the
      // typed Start/End stay authoritative. (Re-pick a range by cancelling first.)
      if (panelRef.current) return;
      openCreate(sel);
    },
    onEventClick: (id) => {
      canvasApiRef.current.unselect();
      setPanel({ mode: 'edit', id });
    },
    onEventChange: (id, patch) => updateEvent(id, patch),
    onApiReady: (api) => {
      canvasApiRef.current = api;
    }
  };

  const editing =
    panel?.mode === 'edit' ? (eventsRef.current.find((e) => e.id === panel.id) ?? null) : null;

  return (
    <div data-testid="calendar-editor" className="relative flex h-full flex-col">
      <div className="mb-3 flex flex-shrink-0 flex-wrap items-center gap-2">
        <ViewToggle view={viewRef.current} onChange={setView} />
        <span className="ml-auto hidden text-xs text-slate-400 sm:inline">
          Select day(s), then add an event
        </span>
      </div>

      <div className="min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Loading calendar…
            </div>
          }
        >
          <CalendarCanvas {...canvasProps} />
        </Suspense>
      </div>

      {panel?.mode === 'create' && (
        <EventForm
          mode="create"
          values={panel.draft}
          onField={createField}
          onCommit={() => {
            lastColorRef.current = panel.draft.color;
            addEvent(panel.draft);
            closePanel();
          }}
          onCancel={closePanel}
        />
      )}

      {editing && (
        <EventForm
          key={editing.id}
          mode="edit"
          values={{
            title: editing.title,
            color: editing.color || DEFAULT_COLOR,
            start: editing.start,
            end: editing.end,
            allDay: editing.allDay
          }}
          onField={(patch) => {
            if (patch.color) lastColorRef.current = patch.color;
            updateEvent(editing.id, patch);
          }}
          onDelete={() => {
            removeEvent(editing.id);
            closePanel();
          }}
          onCancel={() => setPanel(null)}
        />
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange
}: {
  view: CalendarView;
  onChange: (v: CalendarView) => void;
}) {
  return (
    <div className="inline-flex flex-shrink-0 overflow-hidden rounded-md border border-slate-200 text-sm">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onChange(v.key)}
          className={`px-3 py-1.5 font-medium whitespace-nowrap transition ${
            view === v.key
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The docked event form (top-right of the plot). In `create` mode it commits a highlighted
 * range as a new event via the "+ Event" button; in `edit` mode it edits a clicked event
 * live (no add button — a Delete instead). The date range sits at the bottom: usually implied
 * by the highlight, but editable for the rare span that isn't in the current view.
 */
function EventForm({
  mode,
  values,
  onField,
  onCommit,
  onDelete,
  onCancel
}: {
  mode: 'create' | 'edit';
  values: EventFields;
  onField: (patch: Partial<EventFields>) => void;
  onCommit?: () => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      data-testid="calendar-edit-panel"
      className="absolute top-12 right-2 z-10 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          {mode === 'create' ? 'New event' : 'Event'}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <label className="mb-2 block">
        <span className="mb-1 block text-xs text-slate-500">Name</span>
        <input
          data-testid="calendar-event-title"
          autoFocus
          value={values.title}
          onChange={(e) => onField({ title: e.target.value })}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && mode === 'create' && onCommit) {
              e.preventDefault();
              onCommit();
            }
          }}
          placeholder="Event name"
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </label>

      <div className="mb-2">
        <span className="mb-1 block text-xs text-slate-500">Color</span>
        <div className="flex flex-wrap gap-1.5">
          {PALETTE.map((p) => (
            <button
              key={p.hex}
              type="button"
              title={p.name}
              onClick={() => onField({ color: p.hex })}
              style={{ backgroundColor: p.hex }}
              className={`h-5 w-5 rounded-full ring-offset-1 ${
                values.color === p.hex ? 'ring-2 ring-slate-500' : ''
              }`}
            />
          ))}
        </div>
      </div>

      <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={values.allDay}
          onChange={(e) => {
            const allDay = e.target.checked;
            const day = toDateInput(values.start);
            // Reshape to a sane default span on switch: a 1-day all-day block, or a 09:00–10:00
            // slot. (The exact span is then editable below.)
            onField(
              allDay
                ? { allDay: true, start: day, end: shiftDay(day, 1) }
                : { allDay: false, start: `${day}T09:00`, end: `${day}T10:00` }
            );
          }}
        />
        All day
      </label>

      {/* Date range last: implied by the highlight, here for the rare out-of-view span. */}
      <div className="mb-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Start</span>
          <input
            type={values.allDay ? 'date' : 'datetime-local'}
            value={values.allDay ? toDateInput(values.start) : toDateTimeInput(values.start)}
            onChange={(e) => onField({ start: e.target.value })}
            className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">End</span>
          <input
            type={values.allDay ? 'date' : 'datetime-local'}
            value={
              values.allDay
                ? allDayEndToDisplay(values.end, values.start)
                : toDateTimeInput(values.end)
            }
            onChange={(e) =>
              onField({
                end: values.allDay ? allDayEndFromDisplay(e.target.value) : e.target.value
              })
            }
            className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"
          />
        </label>
      </div>

      {mode === 'create' ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCommit}
            className="flex-1 rounded bg-indigo-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Event
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded border border-rose-200 px-2 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          Delete event
        </button>
      )}
    </div>
  );
}
