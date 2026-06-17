import type { NoteSection } from '@/lib/types';
import { InlineEditableTitle } from '@/components/ui/InlineEditableTitle';

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
      return (
        <div
          className="max-h-48 overflow-hidden text-sm leading-relaxed break-words text-slate-700"
          // Content is sanitized HTML produced by the editor (parity with the Svelte preview).
          dangerouslySetInnerHTML={{
            __html: section.content || '<p class="text-slate-400">(empty)</p>'
          }}
        />
      );
    case 'checklist': {
      const items = section.checklist_data ?? [];
      return (
        <ul className="max-h-48 space-y-1 overflow-hidden">
          {items.length === 0 && <li className="text-sm text-slate-400">(no items)</li>}
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={item.checked} readOnly className="h-4 w-4 rounded" />
              <span className={item.checked ? 'text-slate-400 line-through' : ''}>{item.text}</span>
              {item.date && <span className="ml-auto text-xs text-slate-400">{item.date}</span>}
            </li>
          ))}
        </ul>
      );
    }
    case 'diagram':
      return (
        <div className="flex h-32 items-center justify-center rounded bg-slate-50 text-sm text-slate-400">
          Diagram
        </div>
      );
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
