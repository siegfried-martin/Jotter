import { parseCalendar, getCalendarEventCount, type CalendarEvent } from '@/lib/util/schedule';

// RETAINED (not currently wired): an alternative Calendar card preview — a compact mini-month
// grid that draws each event as a spanning BAR across the days it covers. The active preview is
// the agenda list in CalendarPreview.tsx; this is kept ready for a future "preview style" user
// preference (mini-month vs. agenda). See docs/initiatives/calendar-timeline-section.md.
//
// No FullCalendar instance (that stays behind the editor's code-split boundary): it shows the
// month of the earliest event, lane-stacks overlapping bars, and collapses any that don't fit a
// week into a "+N". Mirrors TablePreview/TimelinePreview's "render our own data" approach.
const DEFAULT_COLOR = '#6366f1';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY = 86_400_000;
const MAX_LANES = 3;
// Layout (px): a row of day numbers, then up to MAX_LANES bar lanes.
const DAY_ROW = 12;
const LANE_H = 11;
const BAR_H = 9;

/** Local midnight (ms) for an ISO date/date-time; date-only strings parse as LOCAL (not UTC). */
function startOfDayTime(v: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  const d = new Date(v);
  if (Number.isNaN(+d)) return NaN;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

type Span = { start: number; end: number; color: string; title: string };

/** An event as an inclusive [start, end] day range (all-day ends are stored exclusively). */
function eventSpan(e: CalendarEvent): Span | null {
  const start = startOfDayTime(e.start);
  if (Number.isNaN(start)) return null;
  let end = startOfDayTime(e.end);
  if (Number.isNaN(end)) end = start;
  if (e.allDay && end > start) end -= DAY; // exclusive end → inclusive last day
  if (end < start) end = start;
  return { start, end, color: e.color || DEFAULT_COLOR, title: e.title || '(untitled)' };
}

type Seg = { col: number; len: number; lane: number; color: string; title: string };

/** Clip events to one week and greedily stack them into ≤ MAX_LANES; the rest are overflow. */
function packWeek(spans: Span[], weekStart: number, weekEnd: number): { segs: Seg[]; overflow: number } {
  const raw = spans
    .map((s) => {
      const segStart = Math.max(s.start, weekStart);
      const segEnd = Math.min(s.end, weekEnd);
      if (segStart > segEnd) return null;
      return {
        col: Math.round((segStart - weekStart) / DAY),
        len: Math.round((segEnd - segStart) / DAY) + 1,
        color: s.color,
        title: s.title
      };
    })
    .filter((x) => x !== null)
    .sort((a, b) => a!.col - b!.col || b!.len - a!.len);

  const lanes: boolean[][] = [];
  const segs: Seg[] = [];
  let overflow = 0;
  for (const r of raw as { col: number; len: number; color: string; title: string }[]) {
    let lane = -1;
    for (let L = 0; L < lanes.length; L++) {
      let free = true;
      for (let c = r.col; c < r.col + r.len; c++) if (lanes[L][c]) { free = false; break; }
      if (free) { lane = L; break; }
    }
    if (lane === -1 && lanes.length < MAX_LANES) {
      lane = lanes.length;
      lanes.push(new Array(7).fill(false));
    }
    if (lane === -1) { overflow++; continue; }
    for (let c = r.col; c < r.col + r.len; c++) lanes[lane][c] = true;
    segs.push({ ...r, lane });
  }
  return { segs, overflow };
}

export function CalendarMiniMonthPreview({ content }: { content: string }) {
  if (getCalendarEventCount(content) === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded bg-slate-50 text-sm text-slate-400">
        {content?.trim() ? 'Empty calendar' : 'New calendar'}
      </div>
    );
  }

  const spans = parseCalendar(content)
    .events.map(eventSpan)
    .filter((s): s is Span => s !== null);
  const earliest = spans.reduce((m, s) => Math.min(m, s.start), Infinity);
  const ref = new Date(Number.isFinite(earliest) ? earliest : Date.now());
  const year = ref.getFullYear();
  const month = ref.getMonth();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const numWeeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  // Flat grid of dates via calendar arithmetic (DST-safe), Sunday-aligned.
  const days = Array.from({ length: numWeeks * 7 }, (_, i) =>
    new Date(year, month, 1 - firstWeekday + i)
  );
  const caption = new Date(year, month, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="select-none">
      <div className="mb-1 text-center text-xs font-semibold text-slate-500">{caption}</div>
      <div className="mb-0.5 grid grid-cols-7 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-[9px] font-medium text-slate-400">
            {d}
          </span>
        ))}
      </div>
      <div className="space-y-px">
        {Array.from({ length: numWeeks }, (_, w) => {
          const weekDays = days.slice(w * 7, w * 7 + 7);
          const { segs, overflow } = packWeek(
            spans,
            weekDays[0].getTime(),
            weekDays[6].getTime()
          );
          return (
            <div key={w} className="relative" style={{ height: DAY_ROW + MAX_LANES * LANE_H }}>
              <div className="grid grid-cols-7 text-center">
                {weekDays.map((d, c) => (
                  <span
                    key={c}
                    className={`text-[8px] leading-3 ${
                      d.getMonth() === month ? 'text-slate-500' : 'text-slate-300'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                ))}
              </div>
              {segs.map((seg, si) => (
                <div
                  key={si}
                  title={seg.title}
                  style={{
                    position: 'absolute',
                    top: DAY_ROW + seg.lane * LANE_H,
                    left: `calc(${(seg.col / 7) * 100}% + 1px)`,
                    width: `calc(${(seg.len / 7) * 100}% - 2px)`,
                    height: BAR_H,
                    backgroundColor: seg.color
                  }}
                  className="overflow-hidden rounded-[2px] px-0.5 text-[7px] leading-[9px] font-medium whitespace-nowrap text-white"
                >
                  {seg.title}
                </div>
              ))}
              {overflow > 0 && (
                <span
                  className="absolute right-0 rounded-sm bg-white/85 px-0.5 text-[7px] leading-[9px] text-slate-500"
                  style={{ top: DAY_ROW + (MAX_LANES - 1) * LANE_H }}
                >
                  +{overflow}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
