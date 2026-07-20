import { useEffect, useState } from 'react';
import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { TableKit } from '@tiptap/extension-table';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
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
  awareness,
  user,
  initial,
  onChange
}: {
  fragment: Y.XmlFragment;
  awareness: Awareness;
  /** Presence identity for remote carets (name label + caret color). */
  user: { name: string; color: string };
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
      // The extension only reads `provider.awareness`; ours lives on the CRDT handle
      // (broadcast over the Supabase Realtime channel by SupabaseYjsProvider).
      CollaborationCaret.configure({ provider: { awareness }, user }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      // The "Word-like" upgrades that motivated the TipTap move (wysiwyg-upgrade.md).
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      // Tables: without the schema, pasted <table> HTML (e.g. from a rendered markdown
      // preview) silently flattens to paragraphs — the owner hit this on day one.
      TableKit.configure({ table: { resizable: false } })
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

// Preset palettes — deliberately small (throwaway planning notes, not a design tool).
const TEXT_COLORS = [
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Gray', value: '#64748b' }
];
const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Purple', value: '#e9d5ff' }
];

/** Selection-reactive toolbar (v3 pattern: useEditorState re-renders only on changes). */
function Toolbar({ editor }: { editor: Editor }) {
  const [openPicker, setOpenPicker] = useState<'color' | 'highlight' | 'table' | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '',
      highlight: (e.getAttributes('highlight').color as string | undefined) ?? '',
      code: e.isActive('code'),
      inTable: e.isActive('table'),
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
          label="Inline code"
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
          testId="tool-inline-code"
        >
          <span className="rounded bg-slate-200 px-0.5 font-mono text-xs">c</span>
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
        <SwatchPicker
          label="Text color"
          testId="picker-color"
          open={openPicker === 'color'}
          onToggle={() => setOpenPicker((p) => (p === 'color' ? null : 'color'))}
          onClose={() => setOpenPicker(null)}
          colors={TEXT_COLORS}
          current={state.color}
          onPick={(c) => editor.chain().focus().setColor(c).run()}
          onClear={() => editor.chain().focus().unsetColor().run()}
          trigger={
            <span
              className="text-sm leading-none font-semibold"
              style={{ color: state.color || undefined }}
            >
              A
              <span
                className="mx-auto mt-0.5 block h-[3px] w-4 rounded-sm"
                style={{ background: state.color || '#374151' }}
              />
            </span>
          }
        />
        <SwatchPicker
          label="Highlight"
          testId="picker-highlight"
          open={openPicker === 'highlight'}
          onToggle={() => setOpenPicker((p) => (p === 'highlight' ? null : 'highlight'))}
          onClose={() => setOpenPicker(null)}
          colors={HIGHLIGHT_COLORS}
          current={state.highlight}
          onPick={(c) => editor.chain().focus().setHighlight({ color: c }).run()}
          onClear={() => editor.chain().focus().unsetHighlight().run()}
          trigger={<HighlighterIcon color={state.highlight || undefined} />}
        />
        <div className="relative">
          <ToolButton
            label="Table"
            active={state.inTable || openPicker === 'table'}
            onClick={() => setOpenPicker((p) => (p === 'table' ? null : 'table'))}
            testId="picker-table"
          >
            <TableIcon />
          </ToolButton>
          {openPicker === 'table' && (
            <>
              <div className="fixed inset-0 z-30" onMouseDown={() => setOpenPicker(null)} />
              <div className="absolute top-full left-0 z-40 mt-1 w-max rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {(state.inTable
                  ? ([
                      ['Add row below', () => editor.chain().focus().addRowAfter().run()],
                      ['Add column right', () => editor.chain().focus().addColumnAfter().run()],
                      ['Delete row', () => editor.chain().focus().deleteRow().run()],
                      ['Delete column', () => editor.chain().focus().deleteColumn().run()],
                      ['Delete table', () => editor.chain().focus().deleteTable().run()]
                    ] as const)
                  : ([
                      [
                        'Insert table (3×3)',
                        () =>
                          editor
                            .chain()
                            .focus()
                            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                            .run()
                      ]
                    ] as const)
                ).map(([itemLabel, run]) => (
                  <button
                    key={itemLabel}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      run();
                      setOpenPicker(null);
                    }}
                    className="block w-full px-3 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                  >
                    {itemLabel}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
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

/** A toolbar swatch popover: trigger button + a small grid of preset colors + "None". */
function SwatchPicker({
  label,
  testId,
  open,
  onToggle,
  onClose,
  colors,
  current,
  onPick,
  onClear,
  trigger
}: {
  label: string;
  testId: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  colors: { name: string; value: string }[];
  current: string;
  onPick: (color: string) => void;
  onClear: () => void;
  trigger: React.ReactNode;
}) {
  return (
    <div className="relative">
      <ToolButton label={label} active={open || current !== ''} onClick={onToggle} testId={testId}>
        {trigger}
      </ToolButton>
      {open && (
        <>
          {/* click-away catcher */}
          <div className="fixed inset-0 z-30" onMouseDown={onClose} />
          <div className="absolute top-full left-0 z-40 mt-1 w-max rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <div className="grid grid-cols-4 gap-1">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  aria-label={`${label}: ${c.name}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(c.value);
                    onClose();
                  }}
                  className={`h-6 w-6 rounded border ${
                    current === c.value ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                  }`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onClear();
                onClose();
              }}
              className="mt-1.5 block w-full rounded px-1 py-0.5 text-left text-xs text-slate-500 hover:bg-slate-100"
            >
              None
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TableIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1" />
      <path d="M1.5 6.5h13M6 6.5v7M10.5 6.5v7" />
    </svg>
  );
}

function HighlighterIcon({ color }: { color?: string }) {
  return (
    <span className="flex flex-col items-center">
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 11l-6 6v3h3l6-6" />
        <path d="M22 12l-4.5 4.5L9 8l4.5-4.5a2.1 2.1 0 013 0l5.5 5.5a2.1 2.1 0 010 3z" />
      </svg>
      <span
        className="mt-0.5 block h-[3px] w-4 rounded-sm"
        style={{ background: color ?? '#fde047' }}
      />
    </span>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
  testId
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      data-testid={testId}
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
