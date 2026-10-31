import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { NoteSection } from '@/lib/types';
import { SectionFiling } from '@/components/sections/SectionFiling';
import { usePinchZoom } from '@/lib/util/usePinchZoom';

// Editors with no zoom of their own get pinch-to-zoom from the shell. Diagram (Excalidraw),
// table (Univer) and timeline (vis-timeline) already pinch/zoom natively.
const PINCH_ZOOM_TYPES: ReadonlySet<NoteSection['type']> = new Set([
  'wysiwyg',
  'code',
  'markdown',
  'checklist',
  'calendar'
]);

export interface ShellAction {
  label: string;
  onClick: () => void;
}

function BackIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

/**
 * The section editor's chrome below the desktop breakpoint. Instead of the windowed modal
 * (backdrop, header, wrapping footer), it is a full-screen page with a single slim top bar:
 * back (= save & close), the title, and a ⋮ menu holding filing, copy actions, and
 * close-without-saving. Everything else goes to the editor body.
 */
export function MobileEditorShell({
  section,
  title,
  onTitleChange,
  saving,
  onSaveAndClose,
  onCancel,
  actions,
  children
}: {
  section: NoteSection;
  title: string;
  onTitleChange: (title: string) => void;
  saving: boolean;
  onSaveAndClose: () => void;
  onCancel: () => void;
  actions: ShellAction[];
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const zoomable = PINCH_ZOOM_TYPES.has(section.type);
  const { ref: zoomRef, zoom, pinching } = usePinchZoom<HTMLDivElement>(section.type, zoomable);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [menuOpen]);

  const runAction = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <div data-testid="mobile-editor" className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* z-20 keeps the ⋮ menu above popovers the editors render in the body. */}
      <div className="relative z-20 flex h-12 flex-shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-1">
        <button
          type="button"
          data-testid="mobile-editor-back"
          aria-label="Save and close"
          onClick={onSaveAndClose}
          disabled={saving}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-slate-600 active:bg-slate-100 disabled:opacity-50"
        >
          <BackIcon />
        </button>
        {/* text-base (16px) keeps iOS from auto-zooming the page when the title is focused. */}
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled section"
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-800 focus:outline-none"
        />
        {saving && <span className="flex-shrink-0 text-xs text-slate-400">Saving…</span>}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            type="button"
            data-testid="mobile-editor-menu"
            aria-label="More actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 active:bg-slate-100"
          >
            <MoreIcon />
          </button>
          {menuOpen && (
            <div
              data-testid="mobile-editor-menu-panel"
              className="absolute top-full right-0 z-10 mt-1 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                <span className="flex-shrink-0 text-xs text-slate-400">Filed in</span>
                <SectionFiling section={section} />
              </div>
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={runAction(a.onClick)}
                  className="block w-full px-4 py-3 text-left text-sm text-slate-700 active:bg-slate-50"
                >
                  {a.label}
                </button>
              ))}
              <button
                type="button"
                onClick={runAction(onCancel)}
                disabled={saving}
                className="block w-full border-t border-slate-100 px-4 py-3 text-left text-sm text-red-600 active:bg-red-50 disabled:opacity-50"
              >
                Close without saving
              </button>
            </div>
          )}
        </div>
      </div>

      <div data-testid="editor-body" className="relative min-h-0 flex-1 overflow-hidden p-1">
        {/* The zoom itself is applied in index.css to each editor's content element only, so
            the editors' own toolbars stay at their normal size. */}
        <div
          ref={zoomRef}
          data-pinch-zoom={zoomable || undefined}
          data-zoom={zoom}
          className="h-full"
          style={{ '--editor-zoom': zoom } as CSSProperties}
        >
          {children}
        </div>
        {pinching && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-white">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}
