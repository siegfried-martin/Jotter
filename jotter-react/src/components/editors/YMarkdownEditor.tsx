import { useEffect, useMemo, useState } from 'react';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { YCodeMirrorEditor } from './YCodeMirrorEditor';
import { useIsDesktop } from '@/lib/util/useMediaQuery';
import { renderMarkdown } from '@/lib/util/renderMarkdown';
import './markdown-preview.css';

type View = 'code' | 'preview' | 'split';

/**
 * Yjs-backed Markdown section editor. The source lives in the shared `text` (durable via
 * y-indexeddb, collaborative via the provider) and is edited in a CodeMirror "code view"
 * with markdown highlighting. The rendered preview is a pure function of that text — it
 * holds no state of its own, just re-renders whenever the doc changes.
 *
 * Three views: Code, Preview, and a side-by-side Split that is **desktop-only** (two panes
 * need real width). Below the desktop breakpoint the Split control is hidden and any split
 * selection falls back to Code.
 */
export function YMarkdownEditor({ text, awareness }: { text: Y.Text; awareness: Awareness }) {
  const isDesktop = useIsDesktop();
  const [view, setView] = useState<View>(() => (isDesktop ? 'split' : 'code'));

  // Split is desktop-only; clamp to Code when the viewport is too narrow for two panes.
  const effective: View = view === 'split' && !isDesktop ? 'code' : view;

  // Live Markdown source for the preview, observed off the shared Y.Text.
  const [source, setSource] = useState(() => text.toString());
  useEffect(() => {
    const sync = () => setSource(text.toString());
    sync();
    text.observe(sync);
    return () => text.unobserve(sync);
  }, [text]);

  const html = useMemo(() => renderMarkdown(source), [source]);

  const showCode = effective === 'code' || effective === 'split';
  const showPreview = effective === 'preview' || effective === 'split';

  return (
    <div
      data-testid="markdown-editor"
      className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <ViewButton
          testid="md-view-code"
          active={effective === 'code'}
          onClick={() => setView('code')}
        >
          Code
        </ViewButton>
        <ViewButton
          testid="md-view-preview"
          active={effective === 'preview'}
          onClick={() => setView('preview')}
        >
          Preview
        </ViewButton>
        {isDesktop && (
          <ViewButton
            testid="md-view-split"
            active={effective === 'split'}
            onClick={() => setView('split')}
          >
            Split
          </ViewButton>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {showCode && (
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-hidden ${
              showPreview ? 'border-r border-slate-200' : ''
            }`}
          >
            <YCodeMirrorEditor text={text} awareness={awareness} language="markdown" />
          </div>
        )}
        {showPreview && (
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4">
            {html ? (
              <div
                data-testid="markdown-preview"
                className="markdown-preview"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p data-testid="markdown-preview" className="text-sm text-slate-400">
                Nothing to preview yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  testid,
  children
}: {
  active: boolean;
  onClick: () => void;
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm font-medium transition ${
        active
          ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
