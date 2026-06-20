import { describe, it, expect } from 'vitest';
import { getTableCellCount, tableToGrid } from './table';

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
