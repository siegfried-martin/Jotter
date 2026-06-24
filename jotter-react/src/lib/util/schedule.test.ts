import { describe, it, expect } from 'vitest';
import {
  buildTimelinePreview,
  getScheduleItemCount,
  getTimelineElementCount,
  parseTimeline,
  snapForScale,
  timelineToCsv,
  timelineToHtml,
  timelineToMarkdown,
  timelineToTsv
} from './schedule';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function doc(
  items: unknown[],
  groups: unknown[] = [{ id: 'g1', content: 'Team A' }],
  annotations: unknown[] = []
): string {
  return JSON.stringify({ groups, items, annotations });
}

const sample = doc([
  { id: 'i1', title: 'AK Build', start: '2026-07-01', end: '2026-07-31', group: 'g1', color: '#cffafe' }
]);

describe('parseTimeline', () => {
  it('returns an empty doc for blank / invalid content', () => {
    expect(parseTimeline('')).toEqual({ groups: [], items: [], annotations: [], window: undefined });
    expect(parseTimeline('not json')).toEqual({
      groups: [],
      items: [],
      annotations: [],
      window: undefined
    });
  });

  it('tolerates partial shapes', () => {
    expect(parseTimeline('{"items":[{"id":"x"}]}').groups).toEqual([]);
    expect(parseTimeline('{"groups":[]}').items).toEqual([]);
    expect(parseTimeline('{"groups":[]}').annotations).toEqual([]);
  });

  it('counts bars vs. all elements (bars + annotations)', () => {
    expect(getScheduleItemCount(sample)).toBe(1);
    expect(getScheduleItemCount('')).toBe(0);
    const withAnn = doc(
      [],
      [{ id: 'g1', content: 'Team A' }],
      [{ id: 'a1', title: 'Roadmap', start: '2026-01-01', end: '2026-06-01' }]
    );
    expect(getScheduleItemCount(withAnn)).toBe(0); // no bars
    expect(getTimelineElementCount(withAnn)).toBe(1); // but one annotation
  });
});

describe('buildTimelinePreview', () => {
  it('returns nothing when there are no items or annotations', () => {
    expect(buildTimelinePreview(doc([]))).toEqual({ lanes: [], annotations: [], extraLanes: 0 });
  });

  it('positions annotation bands across the span', () => {
    const model = buildTimelinePreview(
      doc(
        [{ id: 'i', title: 'A', start: '2026-01-01', end: '2026-12-31', group: 'g1' }],
        [{ id: 'g1', content: 'Team A' }],
        [{ id: 'a1', title: 'Roadmap', start: '2026-01-01', end: '2026-07-01', color: '#94a3b8' }]
      )
    );
    expect(model.annotations).toHaveLength(1);
    expect(model.annotations[0].title).toBe('Roadmap');
    expect(model.annotations[0].leftPct).toBe(0);
    expect(model.annotations[0].widthPct).toBeGreaterThan(40);
  });

  it('positions a bar across the full span', () => {
    const model = buildTimelinePreview(
      doc([
        { id: 'a', title: 'A', start: '2026-01-01', end: '2026-01-01', group: 'g1' },
        { id: 'b', title: 'B', start: '2026-12-31', end: '2026-12-31', group: 'g1' }
      ])
    );
    expect(model.lanes).toHaveLength(1);
    expect(model.lanes[0].label).toBe('Team A');
    expect(model.lanes[0].bars[0].leftPct).toBe(0);
    expect(model.lanes[0].bars[1].leftPct).toBeCloseTo(100, 0);
  });

  it('files items with an unknown group under "Unassigned"', () => {
    const model = buildTimelinePreview(
      doc([{ id: 'a', title: 'A', start: '2026-01-01', end: '2026-02-01', group: 'ghost' }])
    );
    expect(model.lanes[0].label).toBe('Unassigned');
  });

  it('summarizes lanes beyond the cap', () => {
    const groups = [1, 2, 3].map((n) => ({ id: `g${n}`, content: `L${n}` }));
    const items = [1, 2, 3].map((n) => ({
      id: `i${n}`,
      title: `T${n}`,
      start: '2026-01-01',
      end: '2026-02-01',
      group: `g${n}`
    }));
    const model = buildTimelinePreview(doc(items, groups), 2);
    expect(model.lanes).toHaveLength(2);
    expect(model.extraLanes).toBe(1);
  });
});

describe('timeline export converters', () => {
  it('emits TSV with a header row', () => {
    expect(timelineToTsv(sample)).toBe('Title\tLane\tStart\tEnd\nAK Build\tTeam A\t2026-07-01\t2026-07-31');
  });

  it('emits a GFM pipe table', () => {
    expect(timelineToMarkdown(sample)).toBe(
      '| Title | Lane | Start | End |\n| --- | --- | --- | --- |\n| AK Build | Team A | 2026-07-01 | 2026-07-31 |'
    );
  });

  it('emits an HTML table with a header row', () => {
    expect(timelineToHtml(sample)).toBe(
      '<table><tr><th>Title</th><th>Lane</th><th>Start</th><th>End</th></tr>' +
        '<tr><td>AK Build</td><td>Team A</td><td>2026-07-01</td><td>2026-07-31</td></tr></table>'
    );
  });

  it('quotes CSV fields with commas/quotes and labels unknown lanes', () => {
    const csv = timelineToCsv(
      doc([{ id: 'a', title: 'a,b', start: '2026-01-01', end: '2026-01-02', group: 'ghost' }])
    );
    expect(csv).toBe('Title,Lane,Start,End\n"a,b",Unassigned,2026-01-01,2026-01-02');
  });

  it('exports annotations as rows under an "Annotation" lane', () => {
    const withAnn = doc(
      [{ id: 'i', title: 'AK Build', start: '2026-07-01', end: '2026-07-31', group: 'g1' }],
      [{ id: 'g1', content: 'Team A' }],
      [{ id: 'a1', title: 'Roadmap', start: '2026-01-01', end: '2026-12-31' }]
    );
    expect(timelineToTsv(withAnn)).toBe(
      'Title\tLane\tStart\tEnd\n' +
        'AK Build\tTeam A\t2026-07-01\t2026-07-31\n' +
        'Roadmap\tAnnotation\t2026-01-01\t2026-12-31'
    );
  });

  it('returns empty strings for a doc with no items', () => {
    expect(timelineToTsv('')).toBe('');
    expect(timelineToMarkdown('')).toBe('');
    expect(timelineToHtml('')).toBe('');
    expect(timelineToCsv('')).toBe('');
  });
});

describe('snapForScale (drag snapping by zoom)', () => {
  it('snaps to the nearest day on a day axis', () => {
    expect(ymd(snapForScale(new Date(2026, 2, 10, 18), 'day'))).toBe('2026-03-11'); // ≥noon → up
    expect(ymd(snapForScale(new Date(2026, 2, 10, 9), 'day'))).toBe('2026-03-10');
  });

  it('snaps to the nearest month boundary on a year axis', () => {
    expect(ymd(snapForScale(new Date(2026, 2, 10), 'year'))).toBe('2026-03-01'); // early → this month
    expect(ymd(snapForScale(new Date(2026, 2, 25), 'year'))).toBe('2026-04-01'); // late → next month
  });

  it('snaps to the nearest quarter-month on a month axis', () => {
    expect(ymd(snapForScale(new Date(2026, 2, 1), 'month'))).toBe('2026-03-01'); // ¼·0
    expect(ymd(snapForScale(new Date(2026, 2, 9), 'month'))).toBe('2026-03-09'); // ≈¼
    expect(ymd(snapForScale(new Date(2026, 2, 24), 'month'))).toBe('2026-03-24'); // ≈¾
    expect(ymd(snapForScale(new Date(2026, 2, 31), 'month'))).toBe('2026-04-01'); // ≈end → next start
  });
});
