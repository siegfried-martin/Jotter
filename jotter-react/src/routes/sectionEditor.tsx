import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { useAuth } from '@/lib/auth/AuthContext';
import { YCodeEditor } from '@/components/editors/YCodeEditor';
import { YQuillEditor } from '@/components/editors/YQuillEditor';
import { ChecklistEditor } from '@/components/editors/ChecklistEditor';
import { ExcalidrawEditor } from '@/components/editors/ExcalidrawEditor';
import type { ChecklistItem, CreateNoteSection, NoteSection } from '@/lib/types';
import { useDeleteSection, useSection, useUpdateSection } from '@/lib/data/useSections';
import { useContainer } from '@/lib/data/useContainers';
import { useCollections } from '@/lib/data/useCollections';
import { queryKeys } from '@/lib/data/queryKeys';
import { SectionService } from '@/lib/services/sectionService';
import { SectionFiling } from '@/components/sections/SectionFiling';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { useDocumentTitle } from '@/lib/util/useDocumentTitle';
import { showToast } from '@/lib/ui/toast';
import { isOnline } from '@/lib/offline/onlineStatus';
import {
  acquireCrdtText,
  releaseCrdtText,
  destroyCrdtStore,
  type CrdtHandle
} from '@/lib/offline/crdtSection';
import { isSectionEmpty, isWysiwygEmpty } from '@/lib/util/sectionContent';

const TYPE_TITLE: Record<NoteSection['type'], string> = {
  code: 'Code',
  wysiwyg: 'Text',
  checklist: 'Checklist',
  diagram: 'Diagram'
};

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
  // Read by id (not via the container list) so reassigning the section from inside
  // the editor stays coherent. The URL container is only the close destination.
  const { data: section, isPending } = useSection(sectionId);

  const close = useCallbackRef(() =>
    navigate({
      to: '/app/collections/$collectionId/containers/$containerId',
      params: { collectionId, containerId }
    })
  );

  useDocumentTitle(section?.title?.trim() || (section ? TYPE_TITLE[section.type] : 'Section'));

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
      containerId={section.note_container_id ?? ''}
      onClose={() => close()}
    />
  );
}

/**
 * Flat editor route (/app/sections/$sectionId) — opens any section by id, filed or
 * unfiled, from the home recent feed or a quick jot. Closes back to the home page.
 */
export function FlatSectionEditorRoute() {
  return (
    <RequireAuth>
      <FlatSectionEditor />
    </RequireAuth>
  );
}

function FlatSectionEditor() {
  const params = useParams({ strict: false });
  const sectionId = params.sectionId as string;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: section, isPending } = useSection(sectionId);
  const { data: container } = useContainer(section?.note_container_id);
  const { data: collections } = useCollections();

  // The section is "filed" for me only if its collection is one I belong to. A section
  // shared with me lives in someone else's collection → unfiled for me.
  const isMyCollection = !!collections?.some((c) => c.id === container?.collection_id);

  // Opening a section I can't already access joins me to it (becomes unfiled for me).
  useEffect(() => {
    if (!section || !user || section.user_id === user.id) return;
    SectionService.openSharedSection(section.id).then((added) => {
      if (added) {
        qc.invalidateQueries({ queryKey: queryKeys.recentSections() });
        showToast('Added to your notes');
      }
    });
  }, [section?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A filed note (mine) closes back to its container page; otherwise close to home.
  const close = useCallbackRef(() => {
    if (section?.note_container_id && container?.collection_id && isMyCollection) {
      navigate({
        to: '/app/collections/$collectionId/containers/$containerId',
        params: { collectionId: container.collection_id, containerId: section.note_container_id }
      });
    } else {
      navigate({ to: '/app' });
    }
  });

  useDocumentTitle(section?.title?.trim() || (section ? TYPE_TITLE[section.type] : 'Section'));

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
      containerId={section.note_container_id ?? ''}
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

/**
 * Own a section's CRDT document for the lifetime of the editor. `ready` flips true once the
 * local store has loaded and any first-open seed is applied — render the editor only then,
 * so its initial content is present. The doc is destroyed on unmount.
 */
function useCrdtHandle(section: NoteSection, enabled: boolean, plainSeed: boolean) {
  const [handle, setHandle] = useState<CrdtHandle | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const h = acquireCrdtText(section, plainSeed);
    setHandle(h);
    h.whenReady.then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
      releaseCrdtText(section.id);
    };
    // section.id is stable for the modal's lifetime (keyed by it upstream).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, section.id]);

  return { handle, ready };
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
  const { user } = useAuth();

  // Code + wysiwyg are CRDT-backed (slice 3): their content lives in a Yjs doc persisted to
  // y-indexeddb, so edits are durable the instant they're typed. Checklist/diagram keep the
  // controlled-string path. Code seeds the doc as plain text; wysiwyg seeds through Quill.
  const isCrdt = section.type === 'code' || section.type === 'wysiwyg';
  const { handle, ready: crdtReady } = useCrdtHandle(section, isCrdt, section.type === 'code');

  const [content, setContent] = useState(() => readDraft(section.id) ?? section.content);
  const [language, setLanguage] = useState(
    typeof section.meta?.language === 'string' ? section.meta.language : 'plaintext'
  );
  const [checklistData, setChecklistData] = useState<ChecklistItem[]>(section.checklist_data ?? []);
  const [title, setTitle] = useState(section.title ?? '');
  const [saving, setSaving] = useState(false);

  function handleContentChange(next: string) {
    setContent(next);
    writeDraft(section.id, next);
  }

  // Save & close (Save button, Escape, Ctrl/Cmd+S, click-outside).
  const saveAndClose = useCallbackRef(async () => {
    if (saving) return;
    setSaving(true);
    // Materialize on flush: code reads its plain Y.Text; wysiwyg uses the live HTML kept by
    // the editor's onChange (its Y.Text holds deltas, not HTML); other types use their state.
    const nextContent = section.type === 'code' && handle ? handle.text.toString() : content;
    const updates: Partial<CreateNoteSection> = {
      content: nextContent,
      title: title.trim() || null
    };
    if (section.type === 'code') updates.meta = { ...section.meta, language };
    else if (section.type === 'checklist')
      // Drop blank items on save (e.g. the trailing empty row left after Enter → Escape).
      updates.checklist_data = checklistData.filter((it) => it.text.trim() !== '');
    try {
      // Guarantee write access first: editing a section you don't own joins you to it
      // (idempotent / no-op if you already can write). Covers every way you opened the
      // editor and removes the open-then-save race that caused RLS 406s. Skipped offline —
      // the RPC can't run; the save itself queues and reconciles on reconnect.
      if (user && section.user_id !== user.id && isOnline()) {
        await SectionService.openSharedSection(section.id);
      }
      await update.mutateAsync({ id: section.id, containerId, updates });
      clearDraft(section.id);
      onClose();
    } catch (e) {
      console.error('Failed to save section:', e);
      setSaving(false);
    }
  });

  // Cancel: a section that was never given content gets deleted. For string-based types we
  // also revert (the draft was never persisted). CRDT edits are already durable locally, so
  // Cancel just closes without publishing them to the server (they flush on a later Save).
  const cancel = useCallbackRef(async () => {
    // Emptiness from the *current* doc: code from its Y.Text, wysiwyg from the live HTML,
    // others from the (saved) section.
    const emptyNow =
      section.type === 'code' && handle
        ? handle.text.length === 0
        : section.type === 'wysiwyg'
          ? isWysiwygEmpty(content)
          : isSectionEmpty(section);
    if (emptyNow) {
      try {
        await del.mutateAsync({ id: section.id, containerId });
        if (isCrdt) await destroyCrdtStore(section.id);
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
        <div className="flex flex-1 flex-col overflow-hidden p-6">
          <div className="mb-4 flex flex-shrink-0 items-center gap-4 border-b border-slate-200 pb-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled section"
              className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-slate-800 focus:outline-none"
            />
            <SectionFiling section={section} />
          </div>
          <div className="min-h-0 flex-1">
            {section.type === 'code' &&
              (crdtReady && handle ? (
                <YCodeEditor
                  text={handle.text}
                  awareness={handle.awareness}
                  language={language}
                  onLanguageChange={setLanguage}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Loading…
                </div>
              ))}
            {section.type === 'wysiwyg' &&
              (crdtReady && handle ? (
                <YQuillEditor text={handle.text} initial={content} onChange={handleContentChange} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Loading…
                </div>
              ))}
            {section.type === 'checklist' && (
              <ChecklistEditor value={checklistData} onChange={setChecklistData} />
            )}
            {section.type === 'diagram' && (
              <ExcalidrawEditor initial={content} onChange={handleContentChange} />
            )}
          </div>
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
            className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
