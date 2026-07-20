import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { NoteSection } from '@/lib/types';
import { SECTION_TYPE_META, SECTION_TYPE_ORDER } from '@/lib/util/sectionTypeStyle';
import { prefetchTimelineEngine } from '@/components/editors/timelinePrefetch';
import { prefetchCalendarEngine } from '@/components/editors/calendarPrefetch';

type SectionType = NoteSection['type'];

/** Warm the code-split editor chunk for types that have one, on hover/focus. */
function prefetchForType(type: SectionType): (() => void) | undefined {
  if (type === 'timeline') return prefetchTimelineEngine;
  if (type === 'calendar') return prefetchCalendarEngine;
  return undefined;
}

const GAP = 8; // keep in sync with the row's gap-2

function TypeIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

const BUTTON_CLASSES =
  'group flex min-h-[2.25rem] items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50';

/**
 * The "Add <type>" toolbar. Always a single row: types that don't fit the
 * available width fold into a trailing "More ▾" dropdown instead of wrapping.
 * Fit is computed from a hidden mirror row (spans with identical classes, so
 * widths match without exposing duplicate buttons to the accessibility tree)
 * and re-computed on resize.
 */
export function AddSectionBar({
  onAdd,
  busy
}: {
  onAdd: (type: SectionType) => void;
  busy: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(SECTION_TYPE_ORDER.length);
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const compute = () => {
      const items = Array.from(measure.children) as HTMLElement[];
      const addWidth = items[0].offsetWidth;
      const moreWidth = items[items.length - 1].offsetWidth;
      const widths = items.slice(1, -1).map((el) => el.offsetWidth);
      const avail = row.clientWidth;

      const fullWidth = widths.reduce((acc, w) => acc + GAP + w, addWidth);
      if (fullWidth <= avail) {
        setVisibleCount(widths.length);
        return;
      }
      let used = addWidth + GAP + moreWidth;
      let count = 0;
      for (const w of widths) {
        if (used + GAP + w > avail) break;
        used += GAP + w;
        count += 1;
      }
      setVisibleCount(count);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(row);
    ro.observe(measure); // catches font-load reflow changing label widths
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [menuOpen]);

  const visible = SECTION_TYPE_ORDER.slice(0, visibleCount);
  const overflow = SECTION_TYPE_ORDER.slice(visibleCount);

  return (
    <div className="relative mb-5">
      {/* Hidden mirror of the full row, for width measurement only. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 left-0 flex w-max items-center gap-2"
      >
        <span className="mr-1 text-sm font-medium">Add</span>
        {SECTION_TYPE_ORDER.map((type) => {
          const meta = SECTION_TYPE_META[type];
          return (
            <span key={type} className={BUTTON_CLASSES}>
              <TypeIcon d={meta.icon} />
              {meta.addLabel}
            </span>
          );
        })}
        <span className={BUTTON_CLASSES}>More ▾</span>
      </div>

      <div ref={rowRef} className="flex items-center gap-2">
        <span className="mr-1 text-sm font-medium text-slate-400">Add</span>
        {visible.map((type) => {
          const meta = SECTION_TYPE_META[type];
          return (
            <button
              key={type}
              onClick={() => onAdd(type)}
              onPointerEnter={prefetchForType(type)}
              disabled={busy}
              title={`${meta.addLabel} section`}
              className={`${BUTTON_CLASSES} ${meta.base} ${meta.hover}`}
            >
              <TypeIcon d={meta.icon} />
              {meta.addLabel}
            </button>
          );
        })}
        {overflow.length > 0 && (
          <div ref={menuRef} className="relative">
            <button
              data-testid="add-overflow"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={busy}
              title="More section types"
              className={`${BUTTON_CLASSES} bg-slate-100 text-slate-600 hover:bg-slate-200`}
            >
              More ▾
            </button>
            {menuOpen && (
              <div
                data-testid="add-overflow-menu"
                className="absolute top-full right-0 z-30 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
              >
                {overflow.map((type) => {
                  const meta = SECTION_TYPE_META[type];
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setMenuOpen(false);
                        onAdd(type);
                      }}
                      onPointerEnter={prefetchForType(type)}
                      disabled={busy}
                      title={`${meta.addLabel} section`}
                      className={`group flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${meta.base} ${meta.hover}`}
                    >
                      <TypeIcon d={meta.icon} />
                      {meta.addLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
