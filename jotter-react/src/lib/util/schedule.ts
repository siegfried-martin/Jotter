// Shared data model for the time-axis section types (Calendar & Timeline) — see
// docs/initiatives/calendar-timeline-section.md.
//
// Unlike table/diagram (where the library owns an opaque document blob), here the rendering
// library only *renders*: WE own the data. `note_section.content` holds plain JSON in one of
// the shapes below, so lock-in is low and CSV/.ics export is a pure function over our array.
// Both types live on the LWW track — no Yjs.

/** The shared atom: a titled thing with a span on the time axis. */
export interface ScheduleItem {
  id: string;
  title: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  color?: string; // optional tint (hex or a small named-palette token)
}

/** A Timeline lane (left gutter), or a section header when it owns `nestedGroups`. */
export interface TimelineGroup {
  id: string;
  content: string;
  /** Present ⇒ this group is a section header over the listed child lane ids. */
  nestedGroups?: string[];
}

/** A bar on the Timeline — a ScheduleItem pinned to a lane. */
export interface TimelineItem extends ScheduleItem {
  group: string; // which lane (TimelineGroup.id) the bar sits in
}

/** The Timeline section's `content` shape. */
export interface TimelineDoc {
  groups: TimelineGroup[];
  items: TimelineItem[];
  /** Initial visible range (zoom); absent ⇒ fit to the items. */
  window?: { start: string; end: string };
}

const EMPTY_TIMELINE: TimelineDoc = { groups: [], items: [] };

/**
 * Parse a Timeline snapshot from `content`; blank/garbage falls back to an empty doc.
 * Tolerant of partial shapes so a hand-edited or older blob never throws.
 */
export function parseTimeline(content: string): TimelineDoc {
  if (!content?.trim()) return { ...EMPTY_TIMELINE };
  try {
    const raw = JSON.parse(content) as Partial<TimelineDoc>;
    return {
      groups: Array.isArray(raw.groups) ? raw.groups : [],
      items: Array.isArray(raw.items) ? raw.items : [],
      window: raw.window
    };
  } catch {
    return { ...EMPTY_TIMELINE };
  }
}

/** Count of items (bars/events) in a Timeline snapshot — drives the card empty state. */
export function getScheduleItemCount(content: string): number {
  return parseTimeline(content).items.length;
}
