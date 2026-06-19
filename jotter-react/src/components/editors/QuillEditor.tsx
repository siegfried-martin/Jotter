import { useEffect, useRef } from 'react';
import 'quill/dist/quill.snow.css';
import './quill-editor.css';
import { setupQuillEditor } from '@/lib/config/quill/quill-config';
import { useCallbackRef } from '@/lib/util/useCallbackRef';
import { isWysiwygEmpty } from '@/lib/util/sectionContent';

/** Rich-text section editor (Quill 2, snow theme) — parity with the Svelte WysiwygEditor. */
export function QuillEditor({
  initial,
  onChange
}: {
  initial: string;
  onChange: (html: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const changeRef = useCallbackRef(onChange);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Quill injects its toolbar as a sibling of the editor element, so we give it a
    // fresh child to mount on and clear the whole wrapper on teardown. This keeps
    // React's StrictMode double-mount (and any remount) from stacking toolbars.
    const editorEl = document.createElement('div');
    wrapper.appendChild(editorEl);

    const quill = setupQuillEditor(editorEl);
    if (initial && initial.trim()) {
      quill.clipboard.dangerouslyPasteHTML(initial);
    }

    const handler = () => {
      const html = quill.root.innerHTML;
      changeRef(isWysiwygEmpty(html) ? '' : html);
    };
    quill.on('text-change', handler);

    return () => {
      quill.off('text-change', handler);
      wrapper.innerHTML = ''; // remove toolbar + container Quill injected
    };
    // `initial` is read once on mount (uncontrolled editor).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeRef]);

  // React owns this wrapper but never renders children into it (the effect does),
  // so clearing it imperatively is safe.
  return <div ref={wrapperRef} className="quill-editor h-full" />;
}
