import { useSyncExternalStore } from 'react';

// DnD is desktop-only for now (the user disables all drag-and-drop on mobile).
// Gate on Tailwind's `md` breakpoint so it matches the responsive layout.
const QUERY = '(min-width: 768px)';

function subscribe(cb: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** True when the viewport is md+ — drag-and-drop is disabled on mobile for now. */
export function useDndEnabled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
