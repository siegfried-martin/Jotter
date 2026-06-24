import { parseCalendar, getCalendarEventCount, type CalendarEvent } from '@/lib/util/schedule';

// Static, non-interactive preview of a Calendar section — a compact mini-month grid with a
// colored dot on each day that has an event (no FullCalendar instance; that stays behind the
// editor's code-split boundary). Shows the month of the earliest event, so the card always
// lands on something populated. Mirrors TablePreview/TimelinePreview's "render our own data".
const DEFAULT_COLOR = '#6366f1';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfDay(v: string): number {
  const d = new Date(v);
  if (Number.isNaN(+d)) return NaN;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Map day-of-month → event color for every day the events cover in [year, month]. */
function colorByDay(events: CalendarEvent[], year: number, month: number): Map<number, string> {
  const monthStart = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 0).getTime(); // last day, 00:00
  const byDay = new Map<number, string>();
  const DAY = 86_400_000;
  for (const e of events) {
    const s = startOfDay(e.start);
    let end = startOfDay(e.end);
    if (Number.isNaN(s)) continue;
    if (Number.isNaN(end)) end = s;
    // All-day ends are exclusive (the day after) — step back to the inclusive last day.
    if (e.allDay && end > s) end -= DAY;
    for (let t = Math.max(s, monthStart); t <= Math.min(end, monthEnd); t += DAY) {
      const day = new Date(t).getDate();
      if (!byDay.has(day)) byDay.set(day, e.color || DEFAULT_COLOR);
    }
  }
  return byDay;
}

export function CalendarPreview({ content }: { content: string }) {
  if (getCalendarEventCount(content) === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded bg-slate-50 text-sm text-slate-400">
        {content?.trim() ? 'Empty calendar' : 'New calendar'}
      </div>
    );
  }

  const events = parseCalendar(content).events;
  const earliest = events.reduce(
    (min, e) => Math.min(min, startOfDay(e.start) || Infinity),
    Infinity
  );
  const ref = new Date(Number.isFinite(earliest) ? earliest : Date.now());
  const year = ref.getFullYear();
  const month = ref.getMonth();

  const dots = colorByDay(events, year, month);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  const caption = new Date(year, month, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="select-none">
      <div className="mb-1 text-center text-xs font-semibold text-slate-500">{caption}</div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={`h${i}`} className="text-[9px] font-medium text-slate-400">
            {d}
          </span>
        ))}
        {cells.map((day, i) => (
          <div key={i} className="flex h-5 flex-col items-center justify-center">
            {day !== null && (
              <>
                <span className="text-[10px] leading-none text-slate-600">{day}</span>
                <span
                  className="mt-0.5 h-1 w-1 rounded-full"
                  style={{ backgroundColor: dots.get(day) ?? 'transparent' }}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
