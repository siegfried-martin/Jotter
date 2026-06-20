// Helpers for reading a Univer workbook snapshot (IWorkbookData JSON) without loading Univer
// itself — used by the section card preview and the clipboard/CSV export. The snapshot shape
// we rely on is intentionally minimal: `sheets[id].cellData[row][col].v` holds a cell value.

type CellValue = string | number | boolean | null | undefined;
interface Cell {
  v?: CellValue;
}
interface Sheet {
  id?: string;
  name?: string;
  cellData?: Record<string, Record<string, Cell>>;
}
interface Workbook {
  sheetOrder?: string[];
  sheets?: Record<string, Sheet>;
}

function parse(content: string): Workbook | null {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as Workbook;
  } catch {
    return null;
  }
}

/** The first sheet (by sheetOrder, falling back to insertion order), or null. */
function firstSheet(wb: Workbook | null): Sheet | null {
  if (!wb?.sheets) return null;
  const id = wb.sheetOrder?.[0] ?? Object.keys(wb.sheets)[0];
  return (id && wb.sheets[id]) || null;
}

function cellText(cell: Cell | undefined): string {
  const v = cell?.v;
  return v === null || v === undefined ? '' : String(v);
}

/** Count of non-empty cells across the first sheet (0 if empty/invalid). */
export function getTableCellCount(content: string): number {
  const sheet = firstSheet(parse(content));
  if (!sheet?.cellData) return 0;
  let n = 0;
  for (const row of Object.values(sheet.cellData)) {
    for (const cell of Object.values(row)) {
      if (cellText(cell) !== '') n++;
    }
  }
  return n;
}

/**
 * A dense `rows × cols` grid of display strings from the first sheet, clamped to the used
 * range (the largest populated row/column), then to `maxRows`/`maxCols`. Returns `[]` when
 * there's nothing to show.
 */
export function tableToGrid(content: string, maxRows = 50, maxCols = 50): string[][] {
  const sheet = firstSheet(parse(content));
  const cellData = sheet?.cellData;
  if (!cellData) return [];

  let lastRow = -1;
  let lastCol = -1;
  for (const [r, row] of Object.entries(cellData)) {
    for (const [c, cell] of Object.entries(row)) {
      if (cellText(cell) === '') continue;
      lastRow = Math.max(lastRow, Number(r));
      lastCol = Math.max(lastCol, Number(c));
    }
  }
  if (lastRow < 0) return [];

  const rows = Math.min(lastRow + 1, maxRows);
  const cols = Math.min(lastCol + 1, maxCols);
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(cellText(cellData[r]?.[c]));
    }
    grid.push(row);
  }
  return grid;
}
