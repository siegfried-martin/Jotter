import { useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useCallbackRef } from '@/lib/util/useCallbackRef';

type ExcalidrawProps = React.ComponentProps<typeof Excalidraw>;
type InitialData = ExcalidrawProps['initialData'];

// Default empty scene — mirrors the Svelte ExcalidrawEditor (normal font, medium size).
const EMPTY_SCENE = {
  type: 'excalidraw',
  version: 2,
  source: 'jotter',
  elements: [],
  appState: {
    gridSize: null,
    viewBackgroundColor: '#ffffff',
    currentItemFontFamily: 3,
    currentItemFontSize: 20
  },
  files: {}
};

function parseScene(content: string): {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
} {
  if (!content) return EMPTY_SCENE;
  try {
    return JSON.parse(content);
  } catch (e) {
    console.warn('Invalid diagram data, starting empty:', e);
    return EMPTY_SCENE;
  }
}

const UI_OPTIONS: ExcalidrawProps['UIOptions'] = {
  canvasActions: {
    loadScene: false,
    export: { saveFileToDisk: false }
  }
};

/** Diagram section editor — native Excalidraw (parity with the Svelte React-in-Svelte wrapper). */
export function ExcalidrawEditor({
  initial,
  onChange
}: {
  initial: string;
  onChange: (content: string) => void;
}) {
  const changeRef = useCallbackRef(onChange);
  const [initialData] = useState<InitialData>(() => parseScene(initial) as InitialData);
  const lockedDefaultApplied = useRef(false);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-slate-200 [&_.excalidraw]:h-full">
      <Excalidraw
        initialData={initialData}
        theme="light"
        zenModeEnabled={false}
        viewModeEnabled={false}
        UIOptions={UI_OPTIONS}
        excalidrawAPI={(api) => {
          // Default the tool-lock ON ("sticky" tools, Visio-style) — the user can
          // still toggle it off via the toolbar padlock. Apply once on ready.
          if (lockedDefaultApplied.current) return;
          lockedDefaultApplied.current = true;
          setTimeout(() => {
            const tool = api.getAppState().activeTool;
            api.updateScene({ appState: { activeTool: { ...tool, locked: true } } });
          }, 0);
        }}
        onChange={(elements, appState, files) => {
          changeRef(
            JSON.stringify({
              type: 'excalidraw',
              version: 2,
              source: 'jotter',
              elements,
              appState: {
                gridSize: appState.gridSize,
                viewBackgroundColor: appState.viewBackgroundColor || '#ffffff'
              },
              files: files || {}
            })
          );
        }}
      />
    </div>
  );
}
