import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import type { EventInput } from '@fullcalendar/core';
import type { CalendarView } from '@/lib/util/schedule';
import './calendar-editor.css';

/**
 * The heavy half of the Calendar editor: a FullCalendar instance with the daygrid (month /
 * two-month), timegrid (hourly week) and interaction (drag/select) plugins. Code-split —
 * CalendarEditor pulls this in via React.lazy so FullCalendar stays out of the main/
 * sectionEditor bundle and only downloads when a Calendar section is opened. FullCalendar v6
 * injects its own CSS.
 *
 * Controlled: it renders the `events` we pass and reports user gestures back through the
 * callbacks; CalendarEditor owns the data (our CalendarDoc). Selection is deliberate —
 * clicking or dragging only HIGHLIGHTS days (the selection persists, `unselectAuto={false}`);
 * turning a selection into an event is a separate action in CalendarEditor's form. See
 * docs/initiatives/calendar-timeline-section.md.
 */
export interface CalendarCanvasProps {
  events: EventInput[];
  view: CalendarView;
  /** Days were highlighted (click or drag) → offer to create an event for the range. */
  onSelect: (sel: { start: string; end: string; allDay: boolean }) => void;
  /** An event was clicked → open it for editing. */
  onEventClick: (id: string) => void;
  /** An event was dragged or resized → persist its new span. */
  onEventChange: (id: string, patch: { start: string; end: string; allDay: boolean }) => void;
  /** Hand the parent the highlight controls: set a range, or clear it. */
  onApiReady?: (api: {
    unselect: () => void;
    select: (range: { start: string; end: string; allDay: boolean }) => void;
  }) => void;
}

const VIEW_NAME: Record<CalendarView, string> = {
  month: 'dayGridMonth',
  twoMonth: 'twoMonth',
  week: 'timeGridWeek'
};

// A custom view: two side-by-side month grids that page forward by ONE month, so an event
// that wraps a month boundary stays visible across both. (They're separate grids, so a
// drag-select can't cross the gap — cross-month spans are set via the form's date fields,
// which re-draw the highlight across both months.)
const VIEWS = {
  twoMonth: {
    type: 'multiMonth',
    duration: { months: 2 },
    dateIncrement: { months: 1 },
    multiMonthMaxColumns: 2,
    multiMonthMinWidth: 300
  }
};

export default function CalendarCanvas({
  events,
  view,
  onSelect,
  onEventClick,
  onEventChange,
  onApiReady
}: CalendarCanvasProps) {
  const ref = useRef<FullCalendar>(null);

  // View is owned by CalendarEditor's toolbar; drive FullCalendar imperatively so switching
  // keeps the current date rather than remounting.
  useEffect(() => {
    ref.current?.getApi().changeView(VIEW_NAME[view]);
  }, [view]);

  // Expose the highlight controls so the editor can set the range (from manual date edits) or
  // clear it (on commit/cancel/edit).
  useEffect(() => {
    const api = ref.current?.getApi();
    if (api && onApiReady) {
      onApiReady({
        unselect: () => api.unselect(),
        select: (range) => api.select({ start: range.start, end: range.end, allDay: range.allDay })
      });
    }
  }, [onApiReady]);

  // The two-month grid sizes to its content (compact, both months visible, the wrapper
  // scrolls if events pile up). Single month and the hourly week fill the modal.
  const height = view === 'twoMonth' ? 'auto' : '100%';

  return (
    <div className="h-full overflow-auto" data-testid="calendar-canvas">
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
        initialView={VIEW_NAME[view]}
        views={VIEWS}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        height={height}
        editable
        selectable
        selectMirror
        unselectAuto={false}
        nowIndicator
        events={events}
        // A plain click highlights that single day (deliberate select, no event yet).
        dateClick={(arg) => arg.view.calendar.select({ start: arg.dateStr, allDay: arg.allDay })}
        select={(arg) => onSelect({ start: arg.startStr, end: arg.endStr, allDay: arg.allDay })}
        eventClick={(arg) => onEventClick(arg.event.id)}
        eventDrop={(arg) =>
          onEventChange(arg.event.id, {
            start: arg.event.startStr,
            end: arg.event.endStr || arg.event.startStr,
            allDay: arg.event.allDay
          })
        }
        eventResize={(arg) =>
          onEventChange(arg.event.id, {
            start: arg.event.startStr,
            end: arg.event.endStr || arg.event.startStr,
            allDay: arg.event.allDay
          })
        }
      />
    </div>
  );
}
