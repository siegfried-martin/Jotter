import { parseCalendar, getCalendarEventCount, type CalendarEvent } from '@/lib/util/schedule';

// Static, non-interactive preview of a Calendar section — a compact AGENDA: events in time
// order, color-coded by status so the card reads at a glance. Past events are muted grey at the
// top, currently-happening events are highlighted (with a "now" tag), future events are normal.
// The detailed grid lives in the editor; this small view is the agenda. (An alternative
// mini-month bar preview is kept in CalendarMiniMonthPreview.tsx for a future user preference.)
const DEFAULT_COLOR = '#6366f1';
const MAX_ROWS = 8;

/** Local ms for an ISO date/date-time; date-only strings parse as LOCAL midnight (not UTC). */
function timeOf(v: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)).getTime();
  }
  const d = new Date(v);
  return Number.isNaN(+d) ? NaN : d.getTime();
}

type Status = 'past' | 'current' | 'future';
type Row = { title: string; color: string; start: number; date: string; status: Status };

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toRow(e: CalendarEvent, now: number): Row | null {
  const start = timeOf(e.start);
  if (Number.isNaN(start)) return null;
  let end = timeOf(e.end);
  if (Number.isNaN(end)) end = start;
  // Ends are exclusive for all-day (and effectively so for "still happening" on timed events):
  // active while now < end.
  const status: Status = now >= end ? 'past' : now < start ? 'future' : 'current';
  return { title: e.title || '(untitled)', color: e.color || DEFAULT_COLOR, start, date: fmtDate(start), status };
}

export function CalendarPreview({ content }: { content: string }) {
  if (getCalendarEventCount(content) === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded bg-slate-50 text-sm text-slate-400">
        {content?.trim() ? 'Empty calendar' : 'New calendar'}
      </div>
    );
  }

  const now = Date.now();
  const rows = parseCalendar(content)
    .events.map((e) => toRow(e, now))
    .filter((r): r is Row => r !== null)
    .sort((a, b) => a.start - b.start);

  // Keep current + future when trimming; fill the rest with the most-recent past.
  const past = rows.filter((r) => r.status === 'past');
  const rest = rows.filter((r) => r.status !== 'past');
  let earlierHidden = 0;
  let laterHidden = 0;
  let shown: Row[];
  if (rest.length >= MAX_ROWS) {
    earlierHidden = past.length;
    laterHidden = rest.length - MAX_ROWS;
    shown = rest.slice(0, MAX_ROWS);
  } else {
    const room = MAX_ROWS - rest.length;
    const shownPast = past.slice(past.length - room);
    earlierHidden = past.length - shownPast.length;
    shown = [...shownPast, ...rest];
  }

  return (
    <ul className="space-y-0.5 text-sm">
      {earlierHidden > 0 && (
        <li className="text-[10px] text-slate-300">
          +{earlierHidden} earlier {earlierHidden === 1 ? 'event' : 'events'}
        </li>
      )}
      {shown.map((r, i) => {
        const rowClass =
          r.status === 'current'
            ? 'rounded bg-indigo-50 font-semibold text-slate-800'
            : r.status === 'past'
              ? 'text-slate-300'
              : 'text-slate-700';
        return (
          <li key={i} className={`flex items-center gap-2 px-1 ${rowClass}`}>
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: r.color, opacity: r.status === 'past' ? 0.4 : 1 }}
            />
            <span className="w-12 flex-shrink-0 text-xs opacity-70">{r.date}</span>
            <span className="flex-1 truncate" title={r.title}>
              {r.title}
            </span>
            {r.status === 'current' && (
              <span className="flex-shrink-0 text-[9px] font-semibold tracking-wide text-indigo-500 uppercase">
                now
              </span>
            )}
          </li>
        );
      })}
      {laterHidden > 0 && (
        <li className="text-[10px] text-slate-400">
          +{laterHidden} more {laterHidden === 1 ? 'event' : 'events'}
        </li>
      )}
    </ul>
  );
}
