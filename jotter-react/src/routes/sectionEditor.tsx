import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { useAuth } from '@/lib/auth/AuthContext';
import { YCodeEditor } from '@/components/editors/YCodeEditor';
import { YMarkdownEditor } from '@/components/editors/YMarkdownEditor';
import { YTipTapEditor } from '@/components/editors/YTipTapEditor';
import { ChecklistEditor } from '@/components/editors/ChecklistEditor';
import { ExcalidrawEditor } from '@/components/editors/ExcalidrawEditor';
import { TableEditor } from '@/components/editors/TableEditor';
import { TimelineEditor } from '@/components/editors/TimelineEditor';
import { CalendarEditor } from '@/components/editors/CalendarEditor';
import type { ChecklistItem, CreateNoteSection, NoteSection } from '@/lib/types';
import { useDeleteSection, useSection, useUpdateSection } from '@/lib/data/useSections';
import { useContainer } from '@/lib/data/useContainers';
import { useCollections } from '@/lib/data/useCollections';
import { queryKeys } from '@/lib/data/queryKeys';
import { SectionService } from '@/lib/services/sectionService';
import { SectionFiling } from '@/components/sections/SectionFiling';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { useDocumentTitle } from '@/lib/util/useDocumentTitle';
import { useIsDesktop } from '@/lib/util/useMediaQuery';
import { showToast } from '@/lib/ui/toast';
import {
  copyNative,
  copyAsMarkdown,
  downloadCsv,
  nativeCopyLabel,
  hasMarkdownCopy,
  hasCsvDownload
} from '@/lib/util/sectionClipboard';
import { isOnline } from '@/lib/offline/onlineStatus';
import {
  acquireCrdtText,
  releaseCrdtText,
  destroyCrdtStore,
  encodeDocState,
  type CrdtHandle
} from '@/lib/offline/crdtSection';
import { isSectionEmpty, isWysiwygEmpty } from '@/lib/util/sectionContent';

const TYPE_TITLE: Record<NoteSection['type'], string> = {
  code: 'Code',
  wysiwyg: 'Text',
  checklist: 'Checklist',
  diagram: 'Diagram',
  markdown: 'Markdown',
  table: 'Table',
  timeline: 'Timeline',
  calendar: 'Calendar'
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

function ClipboardIcon() {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
      />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 9V5m0 4H5m4 0L4 4m11 5h4m-4 0V5m0 4l5-5M9 15v4m0-4H5m4 0l-5 5m11-5h4m-4 0v4m0-4l5 5"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
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
// Stable caret colors for collab presence; picked deterministically from the email so a
// user looks the same on every peer's screen.
const CARET_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#db2777'];

function collabIdentity(email: string | undefined | null): { name: string; color: string } {
  const name = email?.split('@')[0] || 'anonymous';
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { name, color: CARET_COLORS[hash % CARET_COLORS.length] };
}

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

  // Code + wysiwyg + markdown are CRDT-backed: their content lives in a Yjs doc persisted to
  // y-indexeddb, so edits are durable the instant they're typed. Checklist/diagram keep the
  // controlled-string path. Code and markdown seed the doc as plain text (they ARE plain
  // text — markdown source); wysiwyg seeds through TipTap (HTML → Y.XmlFragment).
  const isCrdt =
    section.type === 'code' || section.type === 'wysiwyg' || section.type === 'markdown';
  const isPlainText = section.type === 'code' || section.type === 'markdown';
  const { handle, ready: crdtReady } = useCrdtHandle(section, isCrdt, isPlainText);

  const [content, setContent] = useState(() => readDraft(section.id) ?? section.content);
  const [language, setLanguage] = useState(
    typeof section.meta?.language === 'string' ? section.meta.language : 'plaintext'
  );
  const [checklistData, setChecklistData] = useState<ChecklistItem[]>(section.checklist_data ?? []);
  const [title, setTitle] = useState(section.title ?? '');
  const [saving, setSaving] = useState(false);
  // A concurrent edit detected on save (LWW types only) — drives the conflict dialog.
  const [conflict, setConflict] = useState<NoteSection | null>(null);

  const qc = useQueryClient();
  // The server timestamp we loaded; a mismatch on save means someone else changed it.
  const baseUpdatedAt = useRef(section.updated_at);
  // The pending updates, stashed while the conflict dialog is open.
  const pendingUpdates = useRef<Partial<CreateNoteSection>>({});
  // Did this click's mousedown START on the backdrop? Only then is a backdrop-click a real
  // "click outside" to close. Without this, drag-selecting text and releasing past the modal
  // edge (mouseup lands on the backdrop) would close the editor — a long-standing annoyance.
  const downOnBackdrop = useRef(false);

  // Desktop-only fullscreen / focus mode. `isFullscreen` expands the modal to the viewport and
  // collapses the header+footer into a single auto-hiding "chrome" overlay; `chromeVisible`
  // toggles that overlay (revealed by the edge tabs, dismissed by a body click or Escape).
  const isDesktop = useIsDesktop();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(false);
  const toggleFullscreen = () => {
    setChromeVisible(false);
    setIsFullscreen((v) => !v);
  };
  // Shrinking below desktop drops out of fullscreen (the toggle is hidden there too).
  useEffect(() => {
    if (!isDesktop && isFullscreen) {
      setIsFullscreen(false);
      setChromeVisible(false);
    }
  }, [isDesktop, isFullscreen]);

  function handleContentChange(next: string) {
    setContent(next);
    writeDraft(section.id, next);
  }

  function buildUpdates(): Partial<CreateNoteSection> {
    // Materialize on flush: code/markdown read their plain Y.Text (the markdown source is
    // the canonical content); wysiwyg uses the live HTML kept by the editor's onChange (its
    // Y.XmlFragment holds the ProseMirror tree, not HTML); other types use their state.
    const nextContent = isPlainText && handle ? handle.text.toString() : content;
    const updates: Partial<CreateNoteSection> = {
      content: nextContent,
      title: title.trim() || null
    };
    if (section.type === 'code') updates.meta = { ...section.meta, language };
    else if (section.type === 'checklist')
      // Drop blank items on save (e.g. the trailing empty row left after Enter → Escape).
      updates.checklist_data = checklistData.filter((it) => it.text.trim() !== '');
    // Persist the CRDT snapshot alongside the materialized content, so other clients seed
    // from the shared ops (no duplicate-text on independent re-seed).
    if (handle) updates.ydoc = encodeDocState(handle);
    return updates;
  }

  // A snapshot of the section as it currently looks on screen (including unsaved edits), so
  // the modal's Copy actions grab what you see — not the last-saved version. Code/markdown
  // live in the Y.Text; wysiwyg/diagram keep their live value in `content`; checklist in state.
  function liveSection(): NoteSection {
    return {
      ...section,
      content: isPlainText && handle ? handle.text.toString() : content,
      checklist_data: section.type === 'checklist' ? checklistData : section.checklist_data,
      meta: section.type === 'code' ? { ...section.meta, language } : section.meta
    };
  }

  const copyNativeNow = () =>
    copyNative(liveSection())
      .then(showToast)
      .catch(() => showToast('Copy failed'));
  const copyMarkdownNow = () =>
    copyAsMarkdown(liveSection())
      .then(showToast)
      .catch(() => showToast('Copy failed'));
  const downloadCsvNow = () => showToast(downloadCsv(liveSection()));

  // The actual write + close. CRDT merge handles concurrent edits for code/wysiwyg; LWW
  // types (checklist/diagram) are guarded by the conflict pre-check in saveAndClose.
  async function performSave(updates: Partial<CreateNoteSection>) {
    try {
      // Guarantee write access first: editing a section you don't own joins you to it
      // (idempotent / no-op if you already can write). Skipped offline — the save queues.
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
  }

  // Save & close (Save button, Escape, Ctrl/Cmd+S, click-outside).
  const saveAndClose = useCallbackRef(async () => {
    if (saving || conflict) return;
    setSaving(true);
    const updates = buildUpdates();
    // LWW types: if the section changed under us since we opened it, don't silently
    // overwrite — surface the choice. (CRDT types merge, so they skip this.)
    const isLww =
      section.type === 'checklist' ||
      section.type === 'diagram' ||
      section.type === 'timeline' ||
      section.type === 'calendar';
    if (isLww && isOnline()) {
      const current = await SectionService.getSection(section.id).catch(() => null);
      if (current && current.updated_at !== baseUpdatedAt.current) {
        pendingUpdates.current = updates;
        setConflict(current);
        setSaving(false);
        return;
      }
    }
    await performSave(updates);
  });

  // Conflict dialog actions.
  const overwriteConflict = useCallbackRef(async () => {
    setConflict(null);
    setSaving(true);
    await performSave(pendingUpdates.current);
  });
  const saveConflictAsCopy = useCallbackRef(async () => {
    setConflict(null);
    setSaving(true);
    try {
      const u = pendingUpdates.current;
      await SectionService.createSection({
        note_container_id: section.note_container_id,
        type: section.type,
        content: u.content ?? '',
        title: u.title ?? null,
        meta: u.meta,
        checklist_data: u.checklist_data
      });
      qc.invalidateQueries({ queryKey: queryKeys.sections(containerId) });
      qc.invalidateQueries({ queryKey: queryKeys.recentSections() });
      clearDraft(section.id);
      onClose();
    } catch (e) {
      console.error('Failed to save a copy:', e);
      setSaving(false);
    }
  });
  const discardConflict = useCallbackRef(() => {
    setConflict(null);
    // Drop our edits and reload the other person's version.
    qc.invalidateQueries({ queryKey: queryKeys.section(section.id) });
    qc.invalidateQueries({ queryKey: queryKeys.sections(containerId) });
    qc.invalidateQueries({ queryKey: queryKeys.recentSections() });
    clearDraft(section.id);
    onClose();
  });

  // Cancel: a section that was never given content gets deleted. For string-based types we
  // also revert (the draft was never persisted). CRDT edits are already durable locally, so
  // Cancel just closes without publishing them to the server (they flush on a later Save).
  const cancel = useCallbackRef(async () => {
    // Emptiness from the *current* doc: code from its Y.Text, wysiwyg from the live HTML,
    // others from the (saved) section.
    const emptyNow =
      isPlainText && handle
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
        // In fullscreen, Escape steps down one level at a time. Closing the open chrome wins
        // even over a table, so the toolbar is always dismissable.
        if (isFullscreen && chromeVisible) {
          e.preventDefault();
          setChromeVisible(false);
          return;
        }
        // The spreadsheet editor is complex enough that Escape belongs to it (exit cell
        // edit, cancel a selection/formula, dismiss its menus) rather than closing the
        // modal. Let Univer handle it; the user saves explicitly (Save button / Cmd+S).
        if (section.type === 'table') return;
        // Next step down: leave fullscreen back to the windowed modal before closing.
        if (isFullscreen) {
          e.preventDefault();
          setIsFullscreen(false);
          return;
        }
        e.preventDefault();
        saveAndClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveAndClose, isFullscreen, chromeVisible, section.type]);

  return (
    <div
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Close only when the whole gesture was on the backdrop (press + release), so a
        // selection drag that ends outside the modal doesn't dismiss it.
        if (e.target === e.currentTarget && downOnBackdrop.current) saveAndClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        data-fullscreen={isFullscreen ? 'true' : undefined}
        data-chrome={isFullscreen ? (chromeVisible ? 'open' : 'closed') : undefined}
        className={`relative flex w-full flex-col overflow-hidden bg-white shadow-2xl ${
          isFullscreen ? '' : 'rounded-xl border border-slate-200'
        }`}
        style={
          isFullscreen ? { width: '100vw', height: '100vh' } : { width: '95vw', height: '90vh' }
        }
      >
        {/* Header. In fullscreen it becomes an auto-hiding overlay band (translated off the
            top until the chrome is revealed); windowed, it sits inline above the body. */}
        <div
          className={
            isFullscreen
              ? `absolute inset-x-0 top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm transition-transform duration-200 ${
                  chromeVisible ? 'translate-y-0' : 'pointer-events-none -translate-y-full'
                }`
              : 'mb-4 flex flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4 pt-6 pb-2 sm:gap-4 sm:px-6'
          }
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled section"
            className="w-full min-w-[5rem] flex-1 bg-transparent text-lg font-semibold text-slate-800 focus:outline-none"
          />
          <SectionFiling section={section} />
          {isDesktop && (
            <button
              type="button"
              data-testid="fullscreen-toggle"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              onClick={toggleFullscreen}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-100 hover:text-slate-800"
            >
              {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
              <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
          )}
          {/* Tab rides the header's bottom edge: at the screen top when the chrome is hidden,
              sticking out below the band when it's open. Click toggles; chevron flips. */}
          {isFullscreen && (
            <button
              type="button"
              data-testid="chrome-tab-top"
              aria-label={chromeVisible ? 'Hide toolbar' : 'Show toolbar'}
              onClick={() => setChromeVisible((v) => !v)}
              className="pointer-events-auto absolute top-full left-1/2 z-30 flex -translate-x-1/2 items-center justify-center rounded-b-3xl bg-slate-400/50 px-20 py-1 text-white shadow transition-colors hover:bg-slate-500"
            >
              {chromeVisible ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
          )}
        </div>
        {/* Body. Clicking it while the chrome overlay is open dismisses the overlay. */}
        <div
          data-testid="editor-body"
          onMouseDown={() => {
            if (isFullscreen && chromeVisible) setChromeVisible(false);
          }}
          className={
            isFullscreen
              ? 'min-h-0 flex-1 overflow-hidden px-6 py-4'
              : 'min-h-0 flex-1 overflow-hidden px-6 pb-6'
          }
        >
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
          {section.type === 'markdown' &&
            (crdtReady && handle ? (
              <YMarkdownEditor text={handle.text} awareness={handle.awareness} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Loading…
              </div>
            ))}
          {section.type === 'wysiwyg' &&
            (crdtReady && handle ? (
              <YTipTapEditor
                fragment={handle.fragment}
                awareness={handle.awareness}
                user={collabIdentity(user?.email)}
                initial={content}
                onChange={handleContentChange}
              />
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
          {section.type === 'table' && (
            <TableEditor initial={content} onChange={handleContentChange} />
          )}
          {section.type === 'timeline' && (
            <TimelineEditor initial={content} onChange={handleContentChange} />
          )}
          {section.type === 'calendar' && (
            <CalendarEditor initial={content} onChange={handleContentChange} />
          )}
        </div>

        {/* Footer. Mirrors the header: an auto-hiding overlay band in fullscreen (so Save is
            reachable the moment the chrome is revealed), inline otherwise. */}
        <div
          className={
            isFullscreen
              ? `absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 transition-transform duration-200 ${
                  chromeVisible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
                }`
              : 'flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4'
          }
        >
          {/* Copy actions (teal = alternate), bottom-left. They copy the live on-screen
              content via the same util as the section cards. */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyNativeNow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
            >
              <ClipboardIcon />
              {nativeCopyLabel(section.type)}
            </button>
            {hasMarkdownCopy(section.type) && (
              <button
                onClick={copyMarkdownNow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
              >
                <ClipboardIcon />
                Copy as Markdown
              </button>
            )}
            {hasCsvDownload(section.type) && (
              <button
                onClick={downloadCsvNow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
              >
                <ClipboardIcon />
                Download CSV
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
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
          {/* Tab rides the footer's top edge: at the screen bottom when the chrome is hidden,
              sticking out above the band when it's open. Click toggles; chevron flips. The
              footer's own click target also covers the table case, where Univer swallows the
              body click that would otherwise dismiss the chrome. */}
          {isFullscreen && (
            <button
              type="button"
              data-testid="chrome-tab-bottom"
              aria-label={chromeVisible ? 'Hide actions' : 'Show actions'}
              onClick={() => setChromeVisible((v) => !v)}
              className="pointer-events-auto absolute bottom-full left-1/2 z-30 flex -translate-x-1/2 items-center justify-center rounded-t-3xl bg-slate-400/50 px-20 py-1 text-white shadow transition-colors hover:bg-slate-500"
            >
              {chromeVisible ? <ChevronDownIcon /> : <ChevronUpIcon />}
            </button>
          )}
        </div>
      </div>

      {conflict && (
        <div
          data-testid="conflict-dialog"
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              This note changed while you were editing
            </h2>
            <p className="mb-5 text-sm text-slate-600">
              Someone else saved it since you opened it. Saving now would overwrite their changes.
              You can keep both by saving yours as a copy.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => saveConflictAsCopy()}
                className="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600"
              >
                Save as a copy
              </button>
              <button
                onClick={() => overwriteConflict()}
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
              >
                Overwrite their changes
              </button>
              <button
                onClick={() => discardConflict()}
                className="rounded-lg px-4 py-2 font-medium text-slate-500 hover:bg-slate-100"
              >
                Discard mine &amp; keep theirs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
