import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { ChecklistItem, NoteSection } from '@/lib/types';
import { isWysiwygEmpty } from '@/lib/util/sectionContent';
import { renderMarkdown } from '@/lib/util/renderMarkdown';
import { getDiagramElementCount } from '@/lib/util/diagram';
import {
  copyNative,
  copyAsMarkdown,
  downloadCsv,
  nativeCopyLabel,
  hasMarkdownCopy,
  hasCsvDownload
} from '@/lib/util/sectionClipboard';
import '@/components/editors/markdown-preview.css';
import { showToast } from '@/lib/ui/toast';
import { SECTION_TYPE_META } from '@/lib/util/sectionTypeStyle';
import { DiagramThumbnail } from './DiagramThumbnail';
import { TablePreview } from './TablePreview';
import { TimelinePreview } from './TimelinePreview';
import { CalendarPreview } from './CalendarPreview';
import { prefetchTimelineEngine } from '@/components/editors/timelinePrefetch';
import { prefetchCalendarEngine } from '@/components/editors/calendarPrefetch';

// The whole card is the drag activator (no handle): any spot that opens the editor
// is also grabbable. PointerSensor's distance constraint keeps click-to-open working.
export type CardDragProps = {
  attributes?: DraggableAttributes;
  listeners?: Record<string, unknown>;
};

function priorityPreviewStyle(priority: ChecklistItem['priority']): React.CSSProperties {
  switch (priority) {
    case 'high':
      return { backgroundColor: '#fee2e2', borderLeft: '3px solid #dc2626' };
    case 'medium':
      return { backgroundColor: '#fef3c7', borderLeft: '3px solid #d97706' };
    case 'low':
      return { backgroundColor: '#dbeafe', borderLeft: '3px solid #2563eb' };
    default:
      return {};
  }
}

function formatChecklistDate(date?: string): { label: string | null; overdue: boolean } {
  if (!date) return { label: null, overdue: false };
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return { label: date, overdue: false };
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return { label: dt.toLocaleDateString(), overdue: dt.getTime() < today.getTime() };
}

type MenuItem = { label: string; danger?: boolean; onClick: () => void };

/** Shared menu, rendered in a portal at fixed coords (3-dot button or right-click position). */
function CardMenu({
  x,
  y,
  items,
  onClose
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 200);
  const top = Math.min(y, window.innerHeight - 16 - items.length * 40);

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top, left }}
      // Portaled to <body>, but React events bubble through the component tree —
      // stop them so a menu click/right-click doesn't reach the card (which opens it).
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="z-[60] min-w-[184px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
    >
      {items.map((it, i) => (
        <button
          key={i}
          onClick={() => {
            it.onClick();
            onClose();
          }}
          className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
            it.danger ? 'text-red-600' : 'text-slate-700'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

/**
 * The type pill doubles as the title: it shows the section title, or the type name
 * when there's no title. Click to edit (text is pre-selected); saving empty — or the
 * bare type name — clears the title back to the type.
 */
function EditableTypeTitle({
  title,
  typeLabel,
  colorBase,
  colorHover,
  onSave
}: {
  title: string | null;
  typeLabel: string;
  colorBase: string;
  colorHover: string;
  onSave: (title: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const display = title?.trim() || typeLabel;
  const [draft, setDraft] = useState(display);

  function start(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(title?.trim() || typeLabel);
    setEditing(true);
  }
  function commit() {
    setEditing(false);
    const t = draft.trim();
    const next = t === '' || t === typeLabel ? null : t;
    const current = title?.trim() ? title : null;
    if (next !== current) onSave(next);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
        className={`max-w-[220px] min-w-0 rounded px-2 py-1 text-sm font-semibold focus:ring-2 focus:ring-blue-300 focus:outline-none ${colorBase}`}
      />
    );
  }
  return (
    <span
      onClick={start}
      title="Click to rename"
      className={`cursor-text truncate rounded px-2 py-1 text-sm font-semibold ${colorBase} ${colorHover}`}
    >
      {display}
    </span>
  );
}

function SectionPreview({
  section,
  onToggleChecklistItem
}: {
  section: NoteSection;
  onToggleChecklistItem: (index: number, checked: boolean) => void;
}) {
  switch (section.type) {
    case 'code':
      return (
        <div>
          <pre className="rounded bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-slate-800">
            {section.content || '(empty)'}
          </pre>
          {typeof section.meta?.language === 'string' && (
            <div className="mt-2 text-xs text-slate-400">{section.meta.language}</div>
          )}
        </div>
      );
    case 'wysiwyg':
      return isWysiwygEmpty(section.content) ? (
        <p className="text-sm text-slate-400">(empty)</p>
      ) : (
        <div
          className="text-sm leading-relaxed break-words text-slate-700"
          dangerouslySetInnerHTML={{ __html: section.content }}
        />
      );
    case 'markdown': {
      // Card shows the rendered Markdown (sanitized), not the raw source.
      const html = renderMarkdown(section.content);
      return html ? (
        <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm text-slate-400">(empty)</p>
      );
    }
    case 'checklist': {
      const items = section.checklist_data ?? [];
      if (items.length === 0) return <p className="text-sm text-slate-400">(no items)</p>;
      return (
        <ul className="space-y-1">
          {items.map((item, i) => {
            const { label, overdue } = formatChecklistDate(item.date);
            return (
              <li
                key={i}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm text-slate-700"
                style={priorityPreviewStyle(item.priority)}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onToggleChecklistItem(i, e.target.checked)}
                  className="h-4 w-4 flex-shrink-0 cursor-default rounded"
                />
                <span
                  className={`flex-1 break-words ${item.checked ? 'text-slate-400 line-through' : ''}`}
                >
                  {item.text}
                </span>
                {label && (
                  <span
                    className={`flex-shrink-0 text-xs ${overdue ? 'text-red-500' : 'text-slate-400'}`}
                  >
                    {label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      );
    }
    case 'table':
      return <TablePreview content={section.content} />;
    case 'timeline':
      return <TimelinePreview content={section.content} />;
    case 'calendar':
      return <CalendarPreview content={section.content} />;
    case 'diagram': {
      const count = getDiagramElementCount(section.content);
      if (count === 0) {
        return (
          <div className="flex h-32 items-center justify-center rounded bg-slate-50 text-sm text-slate-400">
            {section.content?.trim() ? 'Empty diagram' : 'New diagram'}
          </div>
        );
      }
      return <DiagramThumbnail content={section.content} elementCount={count} />;
    }
    default:
      return null;
  }
}

export function SectionCard({
  section,
  onOpen,
  onDelete,
  onRenameTitle,
  onToggleChecklistItem,
  dragRef,
  dragStyle,
  drag
}: {
  section: NoteSection;
  onOpen: () => void;
  onDelete: () => void;
  onRenameTitle: (title: string | null) => void;
  onToggleChecklistItem: (index: number, checked: boolean) => void;
  dragRef?: (el: HTMLElement | null) => void;
  dragStyle?: React.CSSProperties;
  drag?: CardDragProps;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const menuItems: MenuItem[] = [
    {
      label: nativeCopyLabel(section.type),
      onClick: () =>
        copyNative(section)
          .then(showToast)
          .catch(() => showToast('Copy failed'))
    },
    ...(hasMarkdownCopy(section.type)
      ? [
          {
            label: 'Copy as Markdown',
            onClick: () =>
              copyAsMarkdown(section)
                .then(showToast)
                .catch(() => showToast('Copy failed'))
          }
        ]
      : []),
    ...(hasCsvDownload(section.type)
      ? [
          {
            label: 'Download CSV',
            onClick: () => showToast(downloadCsv(section))
          }
        ]
      : []),
    {
      label: 'Copy share link',
      onClick: () =>
        navigator.clipboard
          .writeText(`${window.location.origin}/app/sections/${section.id}`)
          .then(() => showToast('Share link copied'))
          .catch(() => showToast('Copy failed'))
    },
    { label: 'Delete', danger: true, onClick: onDelete }
  ];

  return (
    <div
      ref={dragRef}
      style={dragStyle}
      {...drag?.attributes}
      {...drag?.listeners}
      data-section-id={section.id}
      data-testid="section-card"
      onClick={onOpen}
      onPointerEnter={
        section.type === 'timeline'
          ? prefetchTimelineEngine
          : section.type === 'calendar'
            ? prefetchCalendarEngine
            : undefined
      }
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      className="group flex h-[280px] cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <EditableTypeTitle
          title={section.title ?? null}
          typeLabel={SECTION_TYPE_META[section.type].typeLabel}
          colorBase={SECTION_TYPE_META[section.type].base}
          colorHover={SECTION_TYPE_META[section.type].hover}
          onSave={onRenameTitle}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            setMenu({ x: r.right - 184, y: r.bottom + 4 });
          }}
          className="flex-shrink-0 rounded p-1 leading-none text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
          title="More actions"
          aria-label="More actions"
        >
          ⋮
        </button>
      </div>
      <div data-testid="section-card-content" className="flex-1 overflow-y-auto">
        <SectionPreview section={section} onToggleChecklistItem={onToggleChecklistItem} />
      </div>

      {menu && <CardMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </div>
  );
}
