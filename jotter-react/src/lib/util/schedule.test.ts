import { describe, it, expect } from 'vitest';
import {
  buildTimelinePreview,
  getScheduleItemCount,
  parseTimeline,
  timelineToCsv,
  timelineToHtml,
  timelineToMarkdown,
  timelineToTsv
} from './schedule';

function doc(items: unknown[], groups: unknown[] = [{ id: 'g1', content: 'Team A' }]): string {
  return JSON.stringify({ groups, items });
}

const sample = doc([
  { id: 'i1', title: 'AK Build', start: '2026-07-01', end: '2026-07-31', group: 'g1', color: '#cffafe' }
]);

describe('parseTimeline', () => {
  it('returns an empty doc for blank / invalid content', () => {
    expect(parseTimeline('')).toEqual({ groups: [], items: [], window: undefined });
    expect(parseTimeline('not json')).toEqual({ groups: [], items: [], window: undefined });
  });

  it('tolerates partial shapes', () => {
    expect(parseTimeline('{"items":[{"id":"x"}]}').groups).toEqual([]);
    expect(parseTimeline('{"groups":[]}').items).toEqual([]);
  });

  it('counts items', () => {
    expect(getScheduleItemCount(sample)).toBe(1);
    expect(getScheduleItemCount('')).toBe(0);
  });
});

describe('buildTimelinePreview', () => {
  it('returns no lanes when there are no items', () => {
    expect(buildTimelinePreview(doc([]))).toEqual({ lanes: [], extraLanes: 0 });
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

  it('returns empty strings for a doc with no items', () => {
    expect(timelineToTsv('')).toBe('');
    expect(timelineToMarkdown('')).toBe('');
    expect(timelineToHtml('')).toBe('');
    expect(timelineToCsv('')).toBe('');
  });
});
