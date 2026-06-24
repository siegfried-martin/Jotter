import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput } from '@fullcalendar/core';

/**
 * The heavy half of the Calendar editor: a FullCalendar instance with the daygrid (month),
 * timegrid (hourly week) and interaction (drag/select) plugins. Code-split — CalendarEditor
 * pulls this in via React.lazy so FullCalendar stays out of the main/sectionEditor bundle and
 * only downloads when a Calendar section is opened. FullCalendar v6 injects its own CSS.
 *
 * Controlled: it renders the `events` we pass and reports user gestures back through the
 * callbacks; CalendarEditor owns the data (our CalendarDoc). See
 * docs/initiatives/calendar-timeline-section.md.
 */
export interface CalendarCanvasProps {
  events: EventInput[];
  view: 'month' | 'week';
  /** Range selected on an empty area → create an event. */
  onSelect: (sel: { start: string; end: string; allDay: boolean }) => void;
  /** An event was clicked → open it for editing. */
  onEventClick: (id: string) => void;
  /** An event was dragged or resized → persist its new span. */
  onEventChange: (id: string, patch: { start: string; end: string; allDay: boolean }) => void;
}

const VIEW_NAME = { month: 'dayGridMonth', week: 'timeGridWeek' } as const;

export default function CalendarCanvas({
  events,
  view,
  onSelect,
  onEventClick,
  onEventChange
}: CalendarCanvasProps) {
  const ref = useRef<FullCalendar>(null);

  // View is owned by CalendarEditor's toolbar; drive FullCalendar imperatively so switching
  // month/week keeps the current date rather than remounting.
  useEffect(() => {
    ref.current?.getApi().changeView(VIEW_NAME[view]);
  }, [view]);

  return (
    <div className="h-full" data-testid="calendar-canvas">
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={VIEW_NAME[view]}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        height="100%"
        editable
        selectable
        selectMirror
        dayMaxEvents
        nowIndicator
        events={events}
        select={(arg) => {
          onSelect({ start: arg.startStr, end: arg.endStr, allDay: arg.allDay });
          arg.view.calendar.unselect();
        }}
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
