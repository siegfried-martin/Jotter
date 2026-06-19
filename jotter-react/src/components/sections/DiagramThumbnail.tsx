import { useEffect, useState } from 'react';

/**
 * Diagram card preview — renders a PNG generated from the Excalidraw scene via a
 * DYNAMIC import of exportToBlob, so Excalidraw stays out of the container-page
 * bundle until a diagram thumbnail actually needs rendering. Parity with the
 * Svelte DiagramThumbnail.
 */
export function DiagramThumbnail({
  content,
  elementCount
}: {
  content: string;
  elementCount: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'generating' | 'ready' | 'error'>('generating');

  useEffect(() => {
    if (!content || elementCount === 0) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setStatus('generating');

    (async () => {
      try {
        const data = JSON.parse(content);
        const { exportToBlob } = await import('@excalidraw/excalidraw');
        const blob = await exportToBlob({
          elements: data.elements,
          appState: {
            ...data.appState,
            exportBackground: true,
            exportWithDarkMode: false,
            exportScale: 0.5
          },
          files: data.files || {},
          mimeType: 'image/png',
          quality: 0.6
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setStatus('ready');
      } catch (e) {
        if (!cancelled) setStatus('error');
        console.warn('Failed to generate diagram thumbnail:', e);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [content, elementCount]);

  return (
    <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded bg-slate-50">
      {url ? (
        <img
          src={url}
          alt="Diagram preview"
          loading="lazy"
          className="h-full w-full bg-white object-contain"
        />
      ) : status === 'error' ? (
        <span className="text-xs text-red-500">Preview error</span>
      ) : (
        <span className="text-xs text-blue-500">Generating…</span>
      )}
      <span className="absolute right-1.5 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
        {elementCount} elements
      </span>
    </div>
  );
}
