/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useCallbackRef } from '@/lib/util/useCallbackRef';

/**
 * Table (spreadsheet) section editor — a code-split Univer instance.
 *
 * Mirrors ExcalidrawEditor's `{ initial, onChange }` contract: the editor owns an opaque
 * JSON blob (a Univer workbook snapshot, `IWorkbookData`) that is mirrored into
 * `note_section.content` and synced on the LWW track — no Yjs. See
 * docs/initiatives/table-section.md.
 *
 * Univer is large, so every `@univerjs/*` package is loaded via dynamic import() inside the
 * mount effect: it stays out of the main/sectionEditor bundle and only downloads when a
 * Table section is actually opened (the same code-split discipline DiagramThumbnail uses
 * for Excalidraw).
 */

/** Parse the stored snapshot; blank/garbage falls back to a fresh empty workbook. */
function parseSnapshot(content: string): Record<string, any> {
  if (!content?.trim()) return {};
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function TableEditor({
  initial,
  onChange
}: {
  initial: string;
  onChange: (content: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useCallbackRef(onChange);
  // Snapshot only the very first `initial` — Univer owns the document after mount, and we
  // must not re-seed it when the parent re-renders with the value we just emitted.
  const initialRef = useRef(initial);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let disposed = false;
    let univer: any = null;
    let listener: { dispose: () => void } | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const presets = await import('@univerjs/presets');
        const { createUniver, LocaleType, mergeLocales, defaultTheme, CommandType } = presets;
        const { UniverSheetsCorePreset } = await import('@univerjs/preset-sheets-core');
        const enUS = (await import('@univerjs/preset-sheets-core/locales/en-US')).default;
        await import('@univerjs/preset-sheets-core/lib/index.css');

        if (disposed || !containerRef.current) return;

        const created = createUniver({
          locale: LocaleType.EN_US,
          locales: { [LocaleType.EN_US]: mergeLocales(enUS) },
          theme: defaultTheme,
          presets: [UniverSheetsCorePreset({ container: containerRef.current })]
        });
        univer = created.univer;
        const univerAPI = created.univerAPI;

        univerAPI.createWorkbook(parseSnapshot(initialRef.current));
        setStatus('ready');

        // Dev/e2e only: expose the Facade so tests can drive deterministic edits (the grid is
        // canvas-rendered, so simulated keystrokes are racy). Stripped from production builds.
        if (import.meta.env.DEV) {
          (window as unknown as Record<string, unknown>).__UNIVER_TABLE_API__ = univerAPI;
        }

        // Persist on every data mutation (cell edits, row/col ops, formatting). Selection
        // changes are OPERATIONs, not MUTATIONs, so they don't dirty the draft. Debounced so
        // a burst of mutations serializes once.
        listener = univerAPI.onCommandExecuted((command: any) => {
          if (command.type !== CommandType.MUTATION) return;
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            const wb = univerAPI.getActiveWorkbook();
            if (wb) onChangeRef(JSON.stringify(wb.save()));
          }, 250);
        });
      } catch (err) {
        if (!disposed) {
          console.error('Failed to load the table editor', err);
          setStatus('error');
        }
      }
    })();

    return () => {
      disposed = true;
      if (debounce) clearTimeout(debounce);
      listener?.dispose();
      univer?.dispose();
      if (import.meta.env.DEV) {
        delete (window as unknown as Record<string, unknown>).__UNIVER_TABLE_API__;
      }
    };
  }, [onChangeRef]);

  return (
    <div className="relative h-full w-full" data-testid="table-editor">
      <div ref={containerRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Loading spreadsheet…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500">
          Couldn’t load the spreadsheet editor.
        </div>
      )}
    </div>
  );
}
