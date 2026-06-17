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
  const hostRef = useRef<HTMLDivElement>(null);
  const changeRef = useCallbackRef(onChange);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const quill = setupQuillEditor(el);
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
      el.innerHTML = ''; // remove Quill's injected toolbar + editor DOM
    };
    // `initial` is intentionally read once on mount (uncontrolled editor).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeRef]);

  return (
    <div className="quill-editor h-full">
      <div ref={hostRef} className="h-full" />
    </div>
  );
}
