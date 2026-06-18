import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { ChecklistItem, NoteSection } from '@/lib/types';
import { InlineEditableTitle } from '@/components/ui/InlineEditableTitle';
import { isWysiwygEmpty } from '@/lib/util/sectionContent';
import { getDiagramElementCount } from '@/lib/util/diagram';
import { showToast } from '@/lib/ui/toast';
import { DiagramThumbnail } from './DiagramThumbnail';

const TYPE_LABEL: Record<string, string> = {
  code: 'Code',
  wysiwyg: 'Text',
  checklist: 'Checklist',
  diagram: 'Diagram'
};

const GripIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <circle cx="7" cy="5" r="1.5" />
    <circle cx="13" cy="5" r="1.5" />
    <circle cx="7" cy="10" r="1.5" />
    <circle cx="13" cy="10" r="1.5" />
    <circle cx="7" cy="15" r="1.5" />
    <circle cx="13" cy="15" r="1.5" />
  </svg>
);

export type DragHandleProps = {
  ref: (el: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: Record<string, unknown> | undefined;
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

/** Plain-text representation of a section for "Copy to clipboard". (Copy-as-markdown is a future item.) */
function sectionToText(section: NoteSection): string {
  switch (section.type) {
    case 'code':
      return section.content;
    case 'wysiwyg': {
      const div = document.createElement('div');
      div.innerHTML = section.content;
      return div.textContent ?? '';
    }
    case 'checklist':
      return (section.checklist_data ?? [])
        .map((it) => `- [${it.checked ? 'x' : ' '}] ${it.text}`)
        .join('\n');
    default:
      return section.content;
  }
}

/** Copy a section to the clipboard: diagrams as a PNG image, everything else as text.
 *  Returns the toast message to show. */
async function copySectionToClipboard(section: NoteSection): Promise<string> {
  if (section.type === 'diagram') {
    if (getDiagramElementCount(section.content) === 0) return 'Nothing to copy';
    const data = JSON.parse(section.content);
    const { exportToBlob } = await import('@excalidraw/excalidraw');
    const blob = await exportToBlob({
      elements: data.elements,
      appState: { ...data.appState, exportBackground: true, exportWithDarkMode: false },
      files: data.files || {},
      mimeType: 'image/png'
    });
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return 'Copied image to clipboard';
  }
  await navigator.clipboard.writeText(sectionToText(section));
  return 'Copied to clipboard';
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
  dragHandle
}: {
  section: NoteSection;
  onOpen: () => void;
  onDelete: () => void;
  onRenameTitle: (title: string | null) => void;
  onToggleChecklistItem: (index: number, checked: boolean) => void;
  dragRef?: (el: HTMLElement | null) => void;
  dragStyle?: React.CSSProperties;
  dragHandle?: DragHandleProps | null;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const menuItems: MenuItem[] = [
    {
      label: 'Copy to clipboard',
      onClick: () =>
        copySectionToClipboard(section)
          .then(showToast)
          .catch(() => showToast('Copy failed'))
    },
    { label: 'Delete', danger: true, onClick: onDelete }
  ];

  return (
    <div
      ref={dragRef}
      style={dragStyle}
      data-section-id={section.id}
      data-testid="section-card"
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      className="group flex h-[280px] cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {dragHandle && (
            <button
              ref={dragHandle.ref}
              {...dragHandle.attributes}
              {...dragHandle.listeners}
              onClick={(e) => e.stopPropagation()}
              title="Drag to reorder or move"
              aria-label="Drag section"
              className="hidden flex-shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing md:flex"
            >
              <GripIcon />
            </button>
          )}
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
            {TYPE_LABEL[section.type] ?? section.type}
          </span>
          <InlineEditableTitle
            value={section.title || `Untitled ${TYPE_LABEL[section.type] ?? section.type}`}
            trigger="click"
            onSave={onRenameTitle}
            className="cursor-text truncate text-sm font-medium text-slate-800"
          />
        </div>
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
