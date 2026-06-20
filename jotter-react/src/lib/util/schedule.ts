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

/**
 * A free-floating annotation — a rounded rectangle that overlays the bars, independent of any
 * lane (a callout, a phase marker, a multi-team event). Drag/resize freely: horizontally it's
 * time-anchored (start/end, so it tracks zoom/pan); vertically it's a fraction of the plot
 * height (topPct/heightPct), so it floats wherever you put it. Rendered by a custom overlay
 * layer, not by vis-timeline.
 */
export interface Annotation {
  id: string;
  title: string;
  start: string; // ISO 8601 — left edge (time)
  end: string; // ISO 8601 — right edge (time)
  topPct?: number; // 0..1 — top position as a fraction of the plot height (default ~0.1)
  heightPct?: number; // 0..1 — height as a fraction of the plot height (default ~0.3)
  color?: string;
}

/** The Timeline section's `content` shape. */
export interface TimelineDoc {
  groups: TimelineGroup[];
  items: TimelineItem[];
  annotations: Annotation[];
  /** Initial visible range (zoom); absent ⇒ fit to the items. */
  window?: { start: string; end: string };
}

const EMPTY_TIMELINE: TimelineDoc = { groups: [], items: [], annotations: [] };

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
      annotations: Array.isArray(raw.annotations) ? raw.annotations : [],
      window: raw.window
    };
  } catch {
    return { ...EMPTY_TIMELINE };
  }
}

/** Count of bars (lane-bound items) — gates the "Nothing to copy" / bar-export checks. */
export function getScheduleItemCount(content: string): number {
  return parseTimeline(content).items.length;
}

/** Count of everything drawn (bars + annotation bands) — drives the card empty state. */
export function getTimelineElementCount(content: string): number {
  const doc = parseTimeline(content);
  return doc.items.length + doc.annotations.length;
}

function toTime(v: string): number {
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export interface PreviewBar {
  title: string;
  leftPct: number;
  widthPct: number;
  color: string;
}
export interface PreviewLane {
  label: string;
  bars: PreviewBar[];
}
export interface PreviewAnnotation {
  title: string;
  leftPct: number;
  widthPct: number;
  color: string;
}
export interface TimelinePreviewModel {
  lanes: PreviewLane[];
  annotations: PreviewAnnotation[];
  extraLanes: number;
}

/**
 * Build a compact, static swimlane model for the card preview — annotation bands plus lanes
 * (that actually hold bars), each positioned as a percentage of the doc's overall time span.
 * Pure: no vis-timeline. Lanes beyond `maxLanes` are summarized as `extraLanes`.
 */
export function buildTimelinePreview(content: string, maxLanes = 4): TimelinePreviewModel {
  const doc = parseTimeline(content);
  if (doc.items.length === 0 && doc.annotations.length === 0) {
    return { lanes: [], annotations: [], extraLanes: 0 };
  }

  // Overall span across every bar AND annotation; guard against a zero-width domain.
  let min = Infinity;
  let max = -Infinity;
  for (const el of [...doc.items, ...doc.annotations]) {
    min = Math.min(min, toTime(el.start));
    max = Math.max(max, toTime(el.end), toTime(el.start));
  }
  const span = max - min || 1;

  const annotations: PreviewAnnotation[] = doc.annotations.map((a) => {
    const start = toTime(a.start);
    const end = Math.max(toTime(a.end), start);
    return {
      title: a.title,
      leftPct: ((start - min) / span) * 100,
      widthPct: Math.max(((end - start) / span) * 100, 3),
      color: a.color || '#e2e8f0'
    };
  });

  // Only flat lanes (section headers own nestedGroups) that contain at least one bar, in
  // declared order. Items whose group is missing fall into an "Unassigned" lane.
  const flat = doc.groups.filter((g) => !g.nestedGroups);
  const labelById = new Map(flat.map((g) => [g.id, g.content]));
  const order: string[] = [];
  const byLane = new Map<string, PreviewBar[]>();
  for (const it of doc.items) {
    const key = labelById.has(it.group) ? it.group : '__unassigned__';
    if (!byLane.has(key)) {
      byLane.set(key, []);
      order.push(key);
    }
    const start = toTime(it.start);
    const end = Math.max(toTime(it.end), start);
    byLane.get(key)!.push({
      title: it.title,
      leftPct: ((start - min) / span) * 100,
      widthPct: Math.max(((end - start) / span) * 100, 3),
      color: it.color || '#cffafe'
    });
  }

  const lanes = order.slice(0, maxLanes).map((key) => ({
    label: key === '__unassigned__' ? 'Unassigned' : (labelById.get(key) ?? ''),
    bars: byLane.get(key)!
  }));
  return { lanes, annotations, extraLanes: Math.max(order.length - maxLanes, 0) };
}

// ---- Export converters (copy / CSV) -------------------------------------------------------
// A Timeline exports as a flat table of bars: Title | Lane | Start | End. Pure functions over
// our own JSON, so .ics / image export can be layered on later without touching the editor.

const EXPORT_HEADERS = ['Title', 'Lane', 'Start', 'End'];

function timelineRows(content: string): string[][] {
  const doc = parseTimeline(content);
  const labelById = new Map(doc.groups.map((g) => [g.id, g.content]));
  const bars = doc.items.map((it) => [
    it.title ?? '',
    labelById.get(it.group) ?? 'Unassigned',
    it.start ?? '',
    it.end ?? ''
  ]);
  // Annotations are lane-less; export them with a sentinel lane so they survive a round-trip.
  const annotations = doc.annotations.map((a) => [
    a.title ?? '',
    'Annotation',
    a.start ?? '',
    a.end ?? ''
  ]);
  return [...bars, ...annotations];
}

/** TSV (pastes into Excel/Sheets) with a header row. */
export function timelineToTsv(content: string): string {
  const rows = timelineRows(content);
  if (rows.length === 0) return '';
  return [EXPORT_HEADERS, ...rows].map((r) => r.join('\t')).join('\n');
}

function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV with a header row. */
export function timelineToCsv(content: string): string {
  const rows = timelineRows(content);
  if (rows.length === 0) return '';
  return [EXPORT_HEADERS, ...rows].map((r) => r.map(csvField).join(',')).join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** HTML table (header + rows) for the rich clipboard flavor. */
export function timelineToHtml(content: string): string {
  const rows = timelineRows(content);
  if (rows.length === 0) return '';
  const head = `<tr>${EXPORT_HEADERS.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table>${head}${body}</table>`;
}

/** GFM pipe table with the export headers. */
export function timelineToMarkdown(content: string): string {
  const rows = timelineRows(content);
  if (rows.length === 0) return '';
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [
    line(EXPORT_HEADERS),
    line(EXPORT_HEADERS.map(() => '---')),
    ...rows.map((r) => line(r))
  ].join('\n');
}
