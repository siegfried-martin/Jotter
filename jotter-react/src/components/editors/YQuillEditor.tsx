import { useEffect, useRef } from 'react';
import 'quill/dist/quill.snow.css';
import './quill-editor.css';
import { QuillBinding } from 'y-quill';
import type * as Y from 'yjs';
import { setupQuillEditor } from '@/lib/config/quill/quill-config';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { isWysiwygEmpty } from '@/lib/util/sectionContent';

// Guard the one-time HTML seed against React StrictMode's double mount (both mounts share
// one doc via the registry; without this they could both paste the legacy content).
const seededDocs = new Set<string>();

/**
 * Yjs-backed rich-text editor (slice 3b). Quill is bound to a shared Y.Text via y-quill, so
 * edits are durable in the local CRDT store (y-indexeddb). The Y.Text holds Quill's delta
 * encoding — not HTML — so on first open (empty doc) we seed it by pasting the section's
 * legacy HTML through Quill, and we report the live HTML via `onChange` so the modal can
 * materialize `content` on save.
 */
export function YQuillEditor({
  text,
  initial,
  onChange
}: {
  text: Y.Text;
  initial: string;
  onChange: (html: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const changeRef = useCallbackRef(onChange);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const editorEl = document.createElement('div');
    wrapper.appendChild(editorEl);
    const quill = setupQuillEditor(editorEl);

    // Bind first so Quill is populated from the (possibly rehydrated) shared doc.
    const binding = new QuillBinding(text, quill);

    // First-ever open: the doc is empty but the section has legacy HTML → seed via Quill,
    // which the binding captures into the Y.Text. Once per doc (StrictMode-safe).
    if (text.length === 0 && initial && initial.trim() && !seededDocs.has(text.doc!.guid)) {
      seededDocs.add(text.doc!.guid);
      quill.clipboard.dangerouslyPasteHTML(initial);
    }

    const emit = () => {
      const html = quill.root.innerHTML;
      changeRef(isWysiwygEmpty(html) ? '' : html);
    };
    emit(); // seed the modal's materialized content with the current doc
    quill.on('text-change', emit);

    return () => {
      quill.off('text-change', emit);
      binding.destroy();
      wrapper.innerHTML = ''; // remove toolbar + container Quill injected
    };
    // `text` is stable for the editor's lifetime; initial is read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeRef]);

  return <div ref={wrapperRef} className="quill-editor h-full" />;
}
