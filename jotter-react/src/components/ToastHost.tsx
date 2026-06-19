import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { getToasts, subscribeToasts } from '@/lib/ui/toast';

/** Renders active toasts bottom-center, in a portal. Mounted once near the app root. */
export function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">
          {t.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
