/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { parseCalendar, type CalendarEvent } from '@/lib/util/schedule';
import type { CalendarCanvasProps } from './CalendarCanvas';

const CalendarCanvas = lazy(() => import('./CalendarCanvas'));

/**
 * Calendar (month / week date grid) section editor.
 *
 * Like Timeline, the library only RENDERS — WE own the data: `note_section.content` holds our
 * own `CalendarDoc` (events with an all-day flag + the last view), synced on the LWW track —
 * no Yjs. The heavy FullCalendar instance is code-split into `CalendarCanvas` (React.lazy) so
 * it stays out of the main bundle and only downloads when a Calendar section is opened.
 * See docs/initiatives/calendar-timeline-section.md.
 *
 * Data flow: events/view live in refs here (the source of truth); the canvas renders them and
 * reports gestures (select → create, click → edit, drag/resize → re-span) back up. Every
 * mutation re-serializes the doc and calls onChange.
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

export type CalendarApi = {
  addEvent: (partial?: Partial<CalendarEvent>, open?: boolean) => string;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  getEvent: (id: string) => CalendarEvent | null;
  getEvents: () => { id: string; title: string }[];
  setView: (view: 'month' | 'week') => void;
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
  const viewRef = useRef<'month' | 'week'>(parsed.current.defaultView ?? 'month');
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIdRef = useRef<string | null>(null);
  editingIdRef.current = editingId;

  function persist() {
    onChangeRef(JSON.stringify({ events: eventsRef.current, defaultView: viewRef.current }));
  }

  const addEvent = useCallbackRef((partial?: Partial<CalendarEvent>, open = false): string => {
    const id = uid();
    const todayStr = toDateInput(new Date().toISOString());
    const ev: CalendarEvent = {
      id,
      title: partial?.title ?? 'New event',
      start: partial?.start ?? todayStr,
      end: partial?.end ?? partial?.start ?? todayStr,
      allDay: partial?.allDay ?? true,
      color: partial?.color ?? DEFAULT_COLOR
    };
    eventsRef.current = [...eventsRef.current, ev];
    persist();
    bump();
    if (open) setEditingId(id);
    return id;
  });

  const updateEvent = useCallbackRef((id: string, patch: Partial<CalendarEvent>) => {
    eventsRef.current = eventsRef.current.map((e) => (e.id === id ? { ...e, ...patch } : e));
    persist();
    bump();
  });

  const removeEvent = useCallbackRef((id: string) => {
    eventsRef.current = eventsRef.current.filter((e) => e.id !== id);
    if (editingIdRef.current === id) setEditingId(null);
    persist();
    bump();
  });

  const setView = useCallbackRef((view: 'month' | 'week') => {
    if (viewRef.current === view) return;
    viewRef.current = view;
    persist();
    bump();
  });

  // DEV-only facade for e2e — arrange events without clicking through FullCalendar.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const api: CalendarApi = {
      addEvent,
      updateEvent,
      removeEvent,
      getEvent: (id) => eventsRef.current.find((e) => e.id === id) ?? null,
      getEvents: () => eventsRef.current.map((e) => ({ id: e.id, title: e.title })),
      setView
    };
    (window as any).__CALENDAR_API__ = api;
    return () => {
      delete (window as any).__CALENDAR_API__;
    };
  }, [addEvent, updateEvent, removeEvent, setView]);

  // Escape closes the edit panel first (rather than the section modal). Capture phase +
  // stopImmediatePropagation pre-empts sectionEditor's window keydown handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingIdRef.current) {
        e.stopImmediatePropagation();
        e.preventDefault();
        setEditingId(null);
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
    onSelect: (sel) => addEvent({ ...sel, title: 'New event' }, true),
    onEventClick: (id) => setEditingId(id),
    onEventChange: (id, patch) => updateEvent(id, patch)
  };

  const editing = editingId
    ? (eventsRef.current.find((e) => e.id === editingId) ?? null)
    : null;

  return (
    <div data-testid="calendar-editor" className="relative flex h-full flex-col">
      <div className="mb-3 flex flex-shrink-0 items-center gap-2">
        <ViewToggle view={viewRef.current} onChange={setView} />
        <button
          type="button"
          onClick={() => addEvent({ title: 'New event' }, true)}
          className="ml-auto rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          + Event
        </button>
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

      {editing && (
        <EventPanel
          key={editing.id}
          event={editing}
          onChange={(patch) => updateEvent(editing.id, patch)}
          onDelete={() => removeEvent(editing.id)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange
}: {
  view: 'month' | 'week';
  onChange: (v: 'month' | 'week') => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-200 text-sm">
      {(['month', 'week'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 font-medium capitalize transition ${
            view === v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/** A docked panel (top-right of the plot) to edit the clicked/created event. */
function EventPanel({
  event,
  onChange,
  onDelete,
  onClose
}: {
  event: CalendarEvent;
  onChange: (patch: Partial<CalendarEvent>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div
      data-testid="calendar-edit-panel"
      className="absolute top-12 right-2 z-10 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Event</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <label className="mb-2 block">
        <span className="mb-1 block text-xs text-slate-500">Title</span>
        <input
          autoFocus
          value={event.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onFocus={(e) => e.target.select()}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </label>

      <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={event.allDay}
          onChange={(e) => {
            const allDay = e.target.checked;
            // Keep the dates coherent across the all-day ↔ timed switch.
            onChange({
              allDay,
              start: allDay ? toDateInput(event.start) : `${toDateInput(event.start)}T09:00`,
              end: allDay ? toDateInput(event.end) : `${toDateInput(event.end)}T10:00`
            });
          }}
        />
        All day
      </label>

      <div className="mb-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Start</span>
          <input
            type={event.allDay ? 'date' : 'datetime-local'}
            value={event.allDay ? toDateInput(event.start) : toDateTimeInput(event.start)}
            onChange={(e) => onChange({ start: e.target.value })}
            className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">End</span>
          <input
            type={event.allDay ? 'date' : 'datetime-local'}
            value={event.allDay ? toDateInput(event.end) : toDateTimeInput(event.end)}
            onChange={(e) => onChange({ end: e.target.value })}
            className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="mb-3">
        <span className="mb-1 block text-xs text-slate-500">Color</span>
        <div className="flex flex-wrap gap-1.5">
          {PALETTE.map((p) => (
            <button
              key={p.hex}
              type="button"
              title={p.name}
              onClick={() => onChange({ color: p.hex })}
              style={{ backgroundColor: p.hex }}
              className={`h-5 w-5 rounded-full ring-offset-1 ${
                (event.color || DEFAULT_COLOR) === p.hex ? 'ring-2 ring-slate-500' : ''
              }`}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="w-full rounded border border-rose-200 px-2 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50"
      >
        Delete event
      </button>
    </div>
  );
}
