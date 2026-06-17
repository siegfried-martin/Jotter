import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { CodeEditor } from '@/components/editors/CodeEditor';
import { QuillEditor } from '@/components/editors/QuillEditor';
import type { ChecklistItem, CreateNoteSection, NoteSection } from '@/lib/types';
import { useDeleteSection, useSections, useUpdateSection } from '@/lib/data/useSections';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { isSectionEmpty } from '@/lib/util/sectionContent';

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

  const close = useCallbackRef(() =>
    navigate({
      to: '/app/collections/$collectionId/containers/$containerId',
      params: { collectionId, containerId }
    })
  );

  if (isPending && !section) {
    return <Backdrop onClick={() => close()}>Loading section…</Backdrop>;
  }
  if (!section) {
    return (
      <Backdrop onClick={() => close()}>
        <div className="text-center">
          <p className="mb-4 text-red-600">Section not found</p>
          <button
            onClick={() => close()}
            className="rounded-lg bg-slate-500 px-6 py-2 text-white hover:bg-slate-600"
          >
            Go back
          </button>
        </div>
      </Backdrop>
    );
  }

  return (
    <SectionEditorModal
      key={section.id}
      section={section}
      containerId={containerId}
      onClose={() => close()}
    />
  );
}

function Backdrop({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClick();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-slate-500"
    >
      {children}
    </div>
  );
}

function draftKey(id: string) {
  return `draft_${id}`;
}

function readDraft(id: string): string | null {
  try {
    return localStorage.getItem(draftKey(id));
  } catch {
    return null;
  }
}

function writeDraft(id: string, content: string) {
  try {
    localStorage.setItem(draftKey(id), content);
  } catch {
    /* localStorage unavailable */
  }
}

function clearDraft(id: string) {
  try {
    localStorage.removeItem(draftKey(id));
  } catch {
    /* localStorage unavailable */
  }
}

function SectionEditorModal({
  section,
  containerId,
  onClose
}: {
  section: NoteSection;
  containerId: string;
  onClose: () => void;
}) {
  const update = useUpdateSection();
  const del = useDeleteSection();

  const [content, setContent] = useState(() => readDraft(section.id) ?? section.content);
  const [language, setLanguage] = useState(
    typeof section.meta?.language === 'string' ? section.meta.language : 'plaintext'
  );
  const [checklistData, setChecklistData] = useState<ChecklistItem[]>(section.checklist_data ?? []);
  const [saving, setSaving] = useState(false);

  function handleContentChange(next: string) {
    setContent(next);
    writeDraft(section.id, next);
  }

  // Save & close (Save button, Escape, Ctrl/Cmd+S, click-outside).
  const saveAndClose = useCallbackRef(async () => {
    if (saving) return;
    setSaving(true);
    const updates: Partial<CreateNoteSection> = { content };
    if (section.type === 'code') updates.meta = { ...section.meta, language };
    else if (section.type === 'checklist') updates.checklist_data = checklistData;
    try {
      await update.mutateAsync({ id: section.id, containerId, updates });
      clearDraft(section.id);
      onClose();
    } catch (e) {
      console.error('Failed to save section:', e);
      setSaving(false);
    }
  });

  // Cancel: a section that was never given content gets deleted; otherwise revert
  // (we never persisted the draft, so just discarding it restores the saved state).
  const cancel = useCallbackRef(async () => {
    if (isSectionEmpty(section)) {
      try {
        await del.mutateAsync({ id: section.id, containerId });
      } catch (e) {
        console.error('Failed to delete empty section:', e);
      }
    }
    clearDraft(section.id);
    onClose();
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveAndClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        saveAndClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveAndClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) saveAndClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        className="flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        style={{ width: '95vw', height: '90vh' }}
      >
        <div className="flex-1 overflow-hidden p-6">
          {section.type === 'code' && (
            <CodeEditor
              content={content}
              language={language}
              onContentChange={handleContentChange}
              onLanguageChange={setLanguage}
            />
          )}
          {section.type === 'wysiwyg' && (
            <QuillEditor initial={content} onChange={handleContentChange} />
          )}
          {section.type === 'checklist' && (
            <ChecklistEditor value={checklistData} onChange={setChecklistData} />
          )}
          {section.type === 'diagram' && (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
              Diagram editor (Excalidraw) lands in the editor phase. Content preserved.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={() => cancel()}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-6 py-2 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => saveAndClose()}
            disabled={saving}
            className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChecklistEditor({
  value,
  onChange
}: {
  value: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  return (
    <div className="h-full overflow-auto rounded-lg border border-slate-200 bg-white p-4">
      <ul className="space-y-2">
        {value.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) =>
                onChange(
                  value.map((it, j) => (j === i ? { ...it, checked: e.target.checked } : it))
                )
              }
              className="h-4 w-4 rounded"
            />
            <input
              value={item.text}
              onChange={(e) =>
                onChange(value.map((it, j) => (j === i ? { ...it, text: e.target.value } : it)))
              }
              className="flex-1 border-b border-transparent text-sm focus:border-slate-300 focus:outline-none"
            />
            <button
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="rounded p-1 text-slate-300 hover:text-red-500"
              aria-label="Remove item"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onChange([...value, { text: '', checked: false }])}
        className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        + Add item
      </button>
    </div>
  );
}
