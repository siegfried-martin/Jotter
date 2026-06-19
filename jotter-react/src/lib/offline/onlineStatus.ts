// Online/offline detection (docs/initiatives/offline-sync.md, slice 1).
//
// A tiny observable around `navigator.onLine` + the browser's online/offline events.
// The offline layer subscribes to drain the outbox on reconnect; the UI subscribes to
// show an offline/pending indicator. Kept framework-light (plain subscribe) with a thin
// React hook on top so it can be unit-tested without React.

type Listener = (online: boolean) => void;

const listeners = new Set<Listener>();

function currentlyOnline(): boolean {
  // `navigator.onLine` is false only when the browser is certain it's offline; treat the
  // non-browser/unknown case as online so SSR/tests don't wrongly queue everything.
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

let online = currentlyOnline();

function emit() {
  const next = currentlyOnline();
  if (next === online) return;
  online = next;
  for (const l of listeners) l(online);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
}

/** Current connectivity (synchronous). */
export function isOnline(): boolean {
  return online;
}

/**
 * Subscribe to connectivity changes. Returns an unsubscribe fn. The listener fires only
 * on transitions (online↔offline), never with the current value on subscribe.
 */
export function subscribeOnline(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: force a connectivity value and notify subscribers. */
export function __setOnlineForTests(value: boolean): void {
  if (value === online) return;
  online = value;
  for (const l of listeners) l(online);
}
