/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import './table-editor.css';

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

// Univer keeps this hidden contenteditable focused whenever a cell is selected, so typing
// starts an edit. On a touchscreen that focus pops the on-screen keyboard on every tap.
const CELL_EDITOR = '[id^="__editor___INTERNAL_EDITOR__DOCS_NORMAL"]';

/**
 * Touch: tapping a cell only selects it; tapping the already-selected cell edits it. The cell
 * editor carries `inputmode="none"` (focused, no keyboard) until then. The switch to "text"
 * and the refocus happen inside the touchend handler, as iOS only raises the keyboard for
 * focus that comes from a user gesture.
 */
function tapToEdit(container: HTMLElement, univerAPI: any): () => void {
  const cellEditor = () => container.querySelector<HTMLElement>(CELL_EDITOR);
  const setKeyboard = (on: boolean) => {
    const el = cellEditor();
    if (!el || el.getAttribute('inputmode') === (on ? 'text' : 'none')) return;
    el.setAttribute('inputmode', on ? 'text' : 'none');
    // Re-focus so the keyboard change takes effect on a field that is already focused.
    if (document.activeElement === el) {
      el.blur();
      el.focus();
    }
  };
  const activeCell = () => {
    const range = univerAPI.getActiveWorkbook()?.getActiveRange();
    return range ? `${range.getRow()}:${range.getColumn()}` : null;
  };

  let tap: { x: number; y: number; cell: string | null; wasEditing: boolean } | null = null;
  const onPointerDown = (e: PointerEvent) => {
    // Capture phase on the container runs before Univer's canvas moves the selection.
    tap =
      e.pointerType === 'touch' && e.target instanceof HTMLCanvasElement
        ? {
            x: e.clientX,
            y: e.clientY,
            cell: activeCell(),
            wasEditing: Boolean(univerAPI.getActiveWorkbook()?.isCellEditing())
          }
        : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = tap;
    tap = null;
    const t = e.changedTouches[0];
    if (!start || !t || Math.hypot(t.clientX - start.x, t.clientY - start.y) > 10) return;
    const wb = univerAPI.getActiveWorkbook();
    if (!wb || start.wasEditing || !start.cell || activeCell() !== start.cell) return;
    setKeyboard(true);
    // A quick second tap reads as a double-click to Univer, which has already started the
    // edit on pointerdown; only start it ourselves for a slower tap.
    if (!wb.isCellEditing()) wb.startEditing();
  };

  setKeyboard(false);
  // The cell editor mounts asynchronously; catch it (and any remount) as it appears.
  const observer = new MutationObserver(() => {
    if (!univerAPI.getActiveWorkbook()?.isCellEditing()) setKeyboard(false);
  });
  observer.observe(container, { childList: true, subtree: true });
  const editEnded = univerAPI.addEvent(univerAPI.Event.SheetEditEnded, () => setKeyboard(false));
  container.addEventListener('pointerdown', onPointerDown, true);
  container.addEventListener('touchend', onTouchEnd, true);
  return () => {
    observer.disconnect();
    editEnded.dispose();
    container.removeEventListener('pointerdown', onPointerDown, true);
    container.removeEventListener('touchend', onTouchEnd, true);
  };
}

const SCROLL_RELATIVE = 'sheet.command.set-scroll-relative';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

/**
 * Touch: two fingers pan the grid (and pinching them zooms it); one finger keeps Univer's
 * own behavior (select / drag a range). Univer's desktop UI has no touch scrolling of its
 * own. Registered on an ancestor of Univer's container so its capture listeners run before
 * the canvas (where Univer listens) and before tapToEdit: once a second finger lands, every
 * touch event until all fingers lift belongs to the gesture.
 */
function twoFingerScroll(el: HTMLElement, univerAPI: any): () => void {
  const touchPointers = new Set<number>();
  let gesturing = false;
  let last: { x: number; y: number; dist: number; zoom: number } | null = null;
  let pending = { x: 0, y: 0, zoom: 0 };
  let frame = 0;

  const sheet = () => univerAPI.getActiveWorkbook()?.getActiveSheet();
  const measure = (t: TouchList) => ({
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
    dist: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1
  });
  const flush = () => {
    frame = 0;
    const ws = sheet();
    if (!ws) return;
    if (pending.zoom && Math.abs(pending.zoom - ws.getZoom()) >= 0.05) ws.zoom(pending.zoom);
    const zoom = ws.getZoom() || 1;
    if (pending.x || pending.y) {
      univerAPI.executeCommand(SCROLL_RELATIVE, {
        offsetX: pending.x / zoom,
        offsetY: pending.y / zoom
      });
    }
    pending = { x: 0, y: 0, zoom: 0 };
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    touchPointers.add(e.pointerId);
    if (touchPointers.size >= 2) gesturing = true;
    // The second finger must not reach Univer as a new selection.
    if (gesturing) e.stopPropagation();
  };
  const onPointerMove = (e: PointerEvent) => {
    // Keep the first finger from dragging a range selection while panning.
    if (gesturing && e.pointerType === 'touch') e.stopPropagation();
  };
  const onPointerUp = (e: PointerEvent) => {
    touchPointers.delete(e.pointerId);
  };
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length < 2) return;
    gesturing = true;
    e.stopPropagation();
    const m = measure(e.touches);
    last = { ...m, zoom: sheet()?.getZoom() ?? 1 };
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!gesturing) return;
    e.preventDefault();
    e.stopPropagation();
    if (!last || e.touches.length < 2) return;
    const m = measure(e.touches);
    pending.x += last.x - m.x;
    pending.y += last.y - m.y;
    const zoom = (last.zoom * m.dist) / last.dist;
    pending.zoom = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) * 10) / 10;
    last = { ...last, x: m.x, y: m.y };
    if (!frame) frame = requestAnimationFrame(flush);
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!gesturing) return;
    // No finger-lift of the gesture counts as a tap (tapToEdit listens for touchend).
    e.stopPropagation();
    if (e.touches.length < 2) last = null;
    if (e.touches.length === 0) {
      gesturing = false;
      touchPointers.clear();
    }
  };
  // iOS Safari's own page-zoom gesture events.
  const onGesture = (e: Event) => e.preventDefault();

  const listeners: [string, EventListener][] = [
    ['pointerdown', onPointerDown as EventListener],
    ['pointermove', onPointerMove as EventListener],
    ['pointerup', onPointerUp as EventListener],
    ['pointercancel', onPointerUp as EventListener],
    ['touchstart', onTouchStart as EventListener],
    ['touchmove', onTouchMove as EventListener],
    ['touchend', onTouchEnd as EventListener],
    ['touchcancel', onTouchEnd as EventListener],
    ['gesturestart', onGesture],
    ['gesturechange', onGesture]
  ];
  const opts = { capture: true, passive: false } as const;
  for (const [type, fn] of listeners) el.addEventListener(type, fn, opts);
  return () => {
    cancelAnimationFrame(frame);
    for (const [type, fn] of listeners) el.removeEventListener(type, fn, opts);
  };
}

export function TableEditor({
  initial,
  onChange
}: {
  initial: string;
  onChange: (content: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
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
    let disposeTapToEdit: (() => void) | null = null;
    let disposeTwoFinger: (() => void) | null = null;
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
          presets: [
            UniverSheetsCorePreset({
              container: containerRef.current,
              // Compact single-row toolbar instead of the multi-tab ribbon (we don't lean on
              // tabs/formulas). The formula bar is relocated below the grid via table-editor.css.
              ribbonType: 'simple'
            })
          ]
        });
        univer = created.univer;
        const univerAPI = created.univerAPI;

        univerAPI.createWorkbook(parseSnapshot(initialRef.current));
        disposeTapToEdit = tapToEdit(containerRef.current, univerAPI);
        if (rootRef.current) disposeTwoFinger = twoFingerScroll(rootRef.current, univerAPI);
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
      disposeTapToEdit?.();
      disposeTwoFinger?.();
      univer?.dispose();
      if (import.meta.env.DEV) {
        delete (window as unknown as Record<string, unknown>).__UNIVER_TABLE_API__;
      }
    };
  }, [onChangeRef]);

  return (
    <div ref={rootRef} className="relative h-full w-full" data-testid="table-editor">
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
