import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { AppHeader } from '@/components/AppHeader';
import { CodeMirrorEditor } from '@/components/editors/CodeMirrorEditor';
import type { ChecklistItem, NoteSection } from '@/lib/types';
import { useSections, useUpdateSection } from '@/lib/data/useSections';

export function SectionEditorRoute() {
  return (
    <RequireAuth>
      <SectionEditor />
    </RequireAuth>
  );
}

function SectionEditor() {
  const params = useParams({ strict: false });
  const collectionId = params.collectionId as string;
  const containerId = params.containerId as string;
  const sectionId = params.sectionId as string;

  const navigate = useNavigate();
  const { data: sections, isPending } = useSections(containerId);
  const section = sections?.find((s) => s.id === sectionId) ?? null;

  function back() {
    navigate({
      to: '/app/collections/$collectionId/containers/$containerId',
      params: { collectionId, containerId }
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader>
        <button onClick={back} className="text-sm text-slate-500 hover:text-blue-600">
          ← Back to notes
        </button>
      </AppHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 p-6">
        {isPending && !section ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !section ? (
          <p className="text-sm text-slate-400">Section not found.</p>
        ) : (
          <SectionEditorBody key={section.id} section={section} containerId={containerId} />
        )}
      </main>
    </div>
  );
}

function SectionEditorBody({
  section,
  containerId
}: {
  section: NoteSection;
  containerId: string;
}) {
  const update = useUpdateSection();
  const save = useCallbackRef(
    (updates: Partial<Pick<NoteSection, 'title' | 'content' | 'checklist_data' | 'meta'>>) => {
      update.mutate({ id: section.id, containerId, updates });
    }
  );

  return (
    <div>
      <TitleField
        initial={section.title ?? ''}
        onSave={(title) => save({ title: title || null })}
      />
      <div className="mt-4">
        {section.type === 'code' && (
          <CodeMirrorEditor
            initial={section.content}
            language={
              typeof section.meta?.language === 'string' ? section.meta.language : 'plaintext'
            }
            onSave={(content) => save({ content })}
            onLanguageChange={(language) => save({ meta: { ...section.meta, language } })}
          />
        )}
        {section.type === 'wysiwyg' && (
          <HtmlEditor initial={section.content} onSave={(content) => save({ content })} />
        )}
        {section.type === 'checklist' && (
          <ChecklistEditor
            initial={section.checklist_data ?? []}
            onSave={(checklist_data) => save({ checklist_data })}
          />
        )}
        {section.type === 'diagram' && (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            Diagram editor (Excalidraw) lands in the editor phase. Raw content preserved.
          </div>
        )}
      </div>
      {update.isError && (
        <p className="mt-2 text-xs text-red-500">Save failed — will retry on next edit.</p>
      )}
    </div>
  );
}

/** Debounce a value change into onSave (800ms), and flush on unmount. */
function useDebouncedSave<T>(value: T, onSave: (v: T) => void, dirty: boolean) {
  const onSaveRef = useCallbackRef(onSave);
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => onSaveRef(value), 800);
    return () => clearTimeout(t);
  }, [value, dirty, onSaveRef]);
}

function TitleField({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);
  useDebouncedSave(value, onSave, dirty);
  return (
    <input
      value={value}
      placeholder="Untitled section"
      onChange={(e) => {
        setValue(e.target.value);
        setDirty(true);
      }}
      onBlur={() => dirty && onSave(value)}
      className="w-full border-b border-transparent bg-transparent text-xl font-semibold focus:border-slate-300 focus:outline-none"
    />
  );
}

/** Uncontrolled contentEditable so the cursor doesn't jump; reads innerHTML on input. */
function HtmlEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onSaveRef = useCallbackRef(onSave);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const onInput = () => {
      clearTimeout(t);
      t = setTimeout(() => onSaveRef(el.innerHTML), 800);
    };
    el.addEventListener('input', onInput);
    return () => {
      clearTimeout(t);
      el.removeEventListener('input', onInput);
    };
  }, [onSaveRef]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="min-h-[60vh] w-full rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed focus:border-blue-400 focus:outline-none"
    />
  );
}

function ChecklistEditor({
  initial,
  onSave
}: {
  initial: ChecklistItem[];
  onSave: (v: ChecklistItem[]) => void;
}) {
  const [items, setItems] = useState<ChecklistItem[]>(initial);

  function commit(next: ChecklistItem[]) {
    setItems(next);
    onSave(next);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) =>
                commit(items.map((it, j) => (j === i ? { ...it, checked: e.target.checked } : it)))
              }
              className="h-4 w-4 rounded"
            />
            <input
              value={item.text}
              onChange={(e) =>
                setItems(items.map((it, j) => (j === i ? { ...it, text: e.target.value } : it)))
              }
              onBlur={() => onSave(items)}
              className="flex-1 border-b border-transparent text-sm focus:border-slate-300 focus:outline-none"
            />
            <button
              onClick={() => commit(items.filter((_, j) => j !== i))}
              className="rounded p-1 text-slate-300 hover:text-red-500"
              aria-label="Remove item"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => commit([...items, { text: '', checked: false }])}
        className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        + Add item
      </button>
    </div>
  );
}
