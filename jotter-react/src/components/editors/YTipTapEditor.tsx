import { useEffect } from 'react';
import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import TextAlign from '@tiptap/extension-text-align';
import type * as Y from 'yjs';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { isWysiwygEmpty } from '@/lib/util/sectionContent';
import './tiptap-editor.css';

// Guard the one-time HTML seed against React StrictMode's double mount (both mounts share
// one doc via the registry; without this they could both paste the legacy content).
const seededDocs = new Set<string>();

/**
 * Yjs-backed rich-text editor (docs/initiatives/wysiwyg-upgrade.md). TipTap/ProseMirror is
 * bound to a shared Y.XmlFragment via the Collaboration extension, so edits are durable in
 * the local CRDT store (y-indexeddb). On first open (empty fragment) we seed from the
 * section's materialized HTML — including legacy Quill sections, whose delta-encoded Y.Text
 * is deliberately abandoned (owner-approved history wipe). We report the live HTML via
 * `onChange` so the modal can materialize `content` on save.
 */
export function YTipTapEditor({
  fragment,
  initial,
  onChange
}: {
  fragment: Y.XmlFragment;
  initial: string;
  onChange: (html: string) => void;
}) {
  const changeRef = useCallbackRef(onChange);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Undo/redo comes from the Yjs document (Collaboration ships its own manager);
        // TipTap's local history would fight it.
        undoRedo: false,
        link: { openOnClick: false }
      }),
      Collaboration.configure({ fragment }),
      TextAlign.configure({ types: ['heading', 'paragraph'] })
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        'data-testid': 'wysiwyg-content'
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      changeRef(isWysiwygEmpty(html) ? '' : html);
    }
  });

  // First-ever open: the fragment is empty but the section has HTML → seed it (the
  // Collaboration binding captures it into the Y.XmlFragment). Once per doc
  // (StrictMode-safe); later clients rehydrate from the shared snapshot instead.
  useEffect(() => {
    if (!editor) return;
    const guid = fragment.doc?.guid ?? '';
    if (fragment.length === 0 && initial && initial.trim() && !seededDocs.has(guid)) {
      seededDocs.add(guid);
      editor.commands.setContent(initial, { emitUpdate: false });
    }
    // Seed the modal's materialized content with the current doc state.
    const html = editor.getHTML();
    changeRef(isWysiwygEmpty(html) ? '' : html);
    // initial is read once on mount; fragment is stable for the editor's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, changeRef]);

  return (
    <div className="tiptap-editor flex h-full flex-col">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="tiptap-scroll min-h-0 flex-1 overflow-y-auto" />
    </div>
  );
}

/** Selection-reactive toolbar (v3 pattern: useEditorState re-renders only on changes). */
function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      heading: e.isActive('heading', { level: 1 })
        ? '1'
        : e.isActive('heading', { level: 2 })
          ? '2'
          : e.isActive('heading', { level: 3 })
            ? '3'
            : '',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      link: e.isActive('link'),
      alignCenter: e.isActive({ textAlign: 'center' }),
      alignRight: e.isActive({ textAlign: 'right' })
    })
  });

  function setLink() {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return; // cancelled
    const chain = editor.chain().focus().extendMarkRange('link');
    if (url.trim() === '') chain.unsetLink().run();
    else chain.setLink({ href: url.trim() }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
      <select
        title="Text style"
        aria-label="Text style"
        value={state.heading}
        onChange={(e) => {
          const v = e.target.value;
          const chain = editor.chain().focus();
          if (v === '') chain.setParagraph().run();
          else chain.toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
        }}
        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[13px] text-slate-700 focus:outline-none"
      >
        <option value="">Normal</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>

      <div className="flex items-center gap-0.5">
        <ToolButton
          label="Bold"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </ToolButton>
        <ToolButton
          label="Italic"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolButton>
        <ToolButton
          label="Underline"
          active={state.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolButton>
      </div>

      <div className="flex items-center gap-0.5">
        <ToolButton
          label="Bullet list"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListIcon ordered={false} />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListIcon ordered />
        </ToolButton>
      </div>

      <div className="flex items-center gap-0.5">
        <ToolButton
          label="Blockquote"
          active={state.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <span className="font-serif text-base leading-none">&ldquo;</span>
        </ToolButton>
        <ToolButton
          label="Code block"
          active={state.codeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <span className="font-mono text-xs">{'</>'}</span>
        </ToolButton>
        <ToolButton label="Link" active={state.link} onClick={setLink}>
          <LinkIcon />
        </ToolButton>
      </div>

      <div className="flex items-center gap-0.5">
        <ToolButton
          label="Align left"
          active={!state.alignCenter && !state.alignRight}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignIcon variant="left" />
        </ToolButton>
        <ToolButton
          label="Align center"
          active={state.alignCenter}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignIcon variant="center" />
        </ToolButton>
        <ToolButton
          label="Align right"
          active={state.alignRight}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignIcon variant="right" />
        </ToolButton>
      </div>

      <ToolButton
        label="Clear formatting"
        active={false}
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <ClearFormatIcon />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // preventDefault so the editor selection survives the click.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded text-sm ${
        active ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function ListIcon({ ordered }: { ordered: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      {ordered ? (
        <text x="0" y="5" fontSize="5.5" fontFamily="sans-serif">
          1.
        </text>
      ) : (
        <circle cx="2" cy="3.5" r="1.3" />
      )}
      {ordered ? (
        <text x="0" y="10.5" fontSize="5.5" fontFamily="sans-serif">
          2.
        </text>
      ) : (
        <circle cx="2" cy="8" r="1.3" />
      )}
      {!ordered && <circle cx="2" cy="12.5" r="1.3" />}
      <rect x="5.5" y="2.7" width="10" height="1.6" rx="0.8" />
      <rect x="5.5" y="7.2" width="10" height="1.6" rx="0.8" />
      <rect x="5.5" y="11.7" width="10" height="1.6" rx="0.8" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function AlignIcon({ variant }: { variant: 'left' | 'center' | 'right' }) {
  const x = (w: number) => (variant === 'left' ? 0 : variant === 'center' ? (16 - w) / 2 : 16 - w);
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <rect x="0" y="2.5" width="16" height="1.6" rx="0.8" />
      <rect x={x(10)} y="7" width="10" height="1.6" rx="0.8" />
      <rect x="0" y="11.5" width="16" height="1.6" rx="0.8" />
    </svg>
  );
}

function ClearFormatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 4h12M9 4l-2 16M15 4l-1.5 12" />
      <path d="M4 21l16-4" opacity="0" />
      <path d="M17 17l5 5M22 17l-5 5" />
    </svg>
  );
}
