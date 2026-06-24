import { useRef } from 'react';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { parseCalendar, type CalendarDoc } from '@/lib/util/schedule';

/**
 * Calendar (month / week date grid) section editor.
 *
 * Like Timeline, the library only RENDERS — WE own the data: `note_section.content` holds our
 * own `CalendarDoc` (events with an all-day flag), synced on the LWW track — no Yjs. See
 * docs/initiatives/calendar-timeline-section.md.
 *
 * SLICE 5 (skeleton): this is a stub that round-trips the document untouched so the type is
 * wired end-to-end (Add button → editor → save → card). The FullCalendar month/week renderer
 * lands in slice 6, code-split into its own lazy chunk.
 */
export function CalendarEditor({
  initial,
  onChange
}: {
  initial: string;
  onChange: (content: string) => void;
}) {
  const onChangeRef = useCallbackRef(onChange);
  // Parse once on mount with a graceful empty default; the stub doesn't mutate it yet.
  const docRef = useRef<CalendarDoc>(parseCalendar(initial));
  void onChangeRef; // wired in slice 6 (eventsSet → serialize → onChange)

  const count = docRef.current.events.length;

  return (
    <div
      data-testid="calendar-editor"
      className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center"
    >
      <svg
        className="mb-3 h-10 w-10 text-indigo-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 6a1 1 0 011-1h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6z M4 10h16 M8 3v4 M16 3v4"
        />
      </svg>
      <p className="text-sm font-medium text-slate-500">Calendar editor</p>
      <p className="mt-1 text-xs text-slate-400">
        Month &amp; week views are coming next. {count > 0 ? `${count} event(s) saved.` : ''}
      </p>
    </div>
  );
}
