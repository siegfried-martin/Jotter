import { parseCalendar, getCalendarEventCount } from '@/lib/util/schedule';

// Static, non-interactive preview of a Calendar section — a compact agenda of the soonest
// events, built with plain HTML (no FullCalendar instance; that stays behind the editor's
// code-split boundary). Mirrors TablePreview/TimelinePreview's "render our own data" approach.
// Slice 7 upgrades this to a mini-month grid.
const PREVIEW_EVENTS = 5;

function fmtDate(v: string): string {
  const d = new Date(v);
  if (Number.isNaN(+d)) return v;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CalendarPreview({ content }: { content: string }) {
  if (getCalendarEventCount(content) === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded bg-slate-50 text-sm text-slate-400">
        {content?.trim() ? 'Empty calendar' : 'New calendar'}
      </div>
    );
  }

  const events = [...parseCalendar(content).events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  const shown = events.slice(0, PREVIEW_EVENTS);
  const extra = events.length - shown.length;

  return (
    <ul className="space-y-1">
      {shown.map((e, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: e.color || '#6366f1' }}
          />
          <span className="w-14 flex-shrink-0 text-xs text-slate-400">{fmtDate(e.start)}</span>
          <span className="flex-1 truncate" title={e.title}>
            {e.title || '(untitled)'}
          </span>
        </li>
      ))}
      {extra > 0 && (
        <li className="text-[10px] text-slate-400">
          +{extra} more {extra === 1 ? 'event' : 'events'}
        </li>
      )}
    </ul>
  );
}
