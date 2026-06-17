import type { ChecklistItem, NoteSection } from '@/lib/types';
import { InlineEditableTitle } from '@/components/ui/InlineEditableTitle';
import { isWysiwygEmpty } from '@/lib/util/sectionContent';
import { getDiagramElementCount } from '@/lib/util/diagram';
import { DiagramThumbnail } from './DiagramThumbnail';

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

const TYPE_LABEL: Record<string, string> = {
  code: 'Code',
  wysiwyg: 'Text',
  checklist: 'Checklist',
  diagram: 'Diagram'
};

function SectionPreview({ section }: { section: NoteSection }) {
  switch (section.type) {
    case 'code':
      return (
        <div>
          <pre className="max-h-48 overflow-hidden rounded bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-slate-800">
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
          className="max-h-48 overflow-hidden text-sm leading-relaxed break-words text-slate-700"
          // Content is sanitized HTML produced by the editor (parity with the Svelte preview).
          dangerouslySetInnerHTML={{ __html: section.content }}
        />
      );
    case 'checklist': {
      const items = section.checklist_data ?? [];
      if (items.length === 0) return <p className="text-sm text-slate-400">(no items)</p>;
      return (
        <ul className="max-h-48 space-y-1 overflow-hidden">
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
                  readOnly
                  className="h-4 w-4 flex-shrink-0 rounded"
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
  onRenameTitle
}: {
  section: NoteSection;
  onOpen: () => void;
  onDelete: () => void;
  onRenameTitle: (title: string | null) => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="group flex min-h-[180px] cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
            {TYPE_LABEL[section.type] ?? section.type}
          </span>
          <InlineEditableTitle
            value={section.title || `Untitled ${TYPE_LABEL[section.type] ?? section.type}`}
            trigger="dblclick"
            onSave={onRenameTitle}
            className="truncate text-sm font-medium text-slate-800"
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
          title="Delete section"
          aria-label="Delete section"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <SectionPreview section={section} />
      </div>
    </div>
  );
}
