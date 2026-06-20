import { describe, it, expect } from 'vitest';
import {
  getTableCellCount,
  tableToCsv,
  tableToGrid,
  tableToHtml,
  tableToMarkdown,
  tableToTsv
} from './table';

function wb(cellData: Record<number, Record<number, { v: unknown }>>): string {
  return JSON.stringify({
    sheetOrder: ['s1'],
    sheets: { s1: { id: 's1', name: 'Sheet1', cellData } }
  });
}

describe('table snapshot helpers', () => {
  it('counts only non-empty cells', () => {
    expect(getTableCellCount(wb({ 0: { 0: { v: 'a' }, 1: { v: '' } }, 1: { 0: { v: 0 } } }))).toBe(
      2
    );
  });

  it('returns 0 for blank / invalid content', () => {
    expect(getTableCellCount('')).toBe(0);
    expect(getTableCellCount('not json')).toBe(0);
    expect(tableToGrid('')).toEqual([]);
  });

  it('builds a dense grid clamped to the used range', () => {
    // Sparse cells at (0,0) and (1,2) → a 2×3 dense grid with gaps filled in.
    const grid = tableToGrid(wb({ 0: { 0: { v: 'A1' } }, 1: { 2: { v: 'C2' } } }));
    expect(grid).toEqual([
      ['A1', '', ''],
      ['', '', 'C2']
    ]);
  });

  it('clamps to maxRows / maxCols', () => {
    const grid = tableToGrid(wb({ 0: { 0: { v: 'x' } }, 9: { 9: { v: 'y' } } }), 3, 2);
    expect(grid.length).toBe(3);
    expect(grid[0].length).toBe(2);
  });

  it('stringifies numbers and booleans', () => {
    expect(tableToGrid(wb({ 0: { 0: { v: 42 }, 1: { v: false } } }))).toEqual([['42', 'false']]);
  });
});

describe('table export converters', () => {
  const grid = wb({
    0: { 0: { v: 'Region' }, 1: { v: 'Sales' } },
    1: { 0: { v: 'West' }, 1: { v: 100 } }
  });

  it('emits tab-separated values', () => {
    expect(tableToTsv(grid)).toBe('Region\tSales\nWest\t100');
  });

  it('emits a GFM pipe table with the first row as header', () => {
    expect(tableToMarkdown(grid)).toBe('| Region | Sales |\n| --- | --- |\n| West | 100 |');
  });

  it('emits an HTML table for the rich clipboard flavor', () => {
    expect(tableToHtml(grid)).toBe(
      '<table><tr><td>Region</td><td>Sales</td></tr><tr><td>West</td><td>100</td></tr></table>'
    );
  });

  it('quotes CSV fields containing commas or quotes (RFC 4180)', () => {
    const csv = tableToCsv(wb({ 0: { 0: { v: 'a,b' }, 1: { v: 'he said "hi"' } } }));
    expect(csv).toBe('"a,b","he said ""hi"""');
  });

  it('returns empty strings for an empty workbook', () => {
    expect(tableToTsv('')).toBe('');
    expect(tableToMarkdown('')).toBe('');
    expect(tableToHtml('')).toBe('');
  });
});
