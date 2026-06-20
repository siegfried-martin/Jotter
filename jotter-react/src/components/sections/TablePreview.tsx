import { tableToGrid } from '@/lib/util/table';

// Static, non-interactive preview of a table section's workbook snapshot — a plain HTML
// <table>, no Univer instance (that stays behind the editor's code-split boundary). Shows the
// top-left corner of the used range; the card's content area scrolls/clips the rest.
const PREVIEW_ROWS = 8;
const PREVIEW_COLS = 6;

export function TablePreview({ content }: { content: string }) {
  const grid = tableToGrid(content, PREVIEW_ROWS, PREVIEW_COLS);

  if (grid.length === 0) {
    return <p className="text-sm text-slate-400">New table</p>;
  }

  return (
    <table className="w-full border-collapse text-xs text-slate-700">
      <tbody>
        {grid.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => (
              <td
                key={c}
                className="max-w-[8rem] truncate border border-slate-200 px-1.5 py-1 align-top"
                title={cell || undefined}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
