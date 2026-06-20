import { useSyncExternalStore } from 'react';

// A media query as a reactive boolean, via useSyncExternalStore so it stays in sync with
// the browser without effects/listeners scattered through components. Server snapshot is
// `true` (desktop-first) to match the app's other matchMedia usage (useDndEnabled).
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => true
  );
}

// The split markdown view (source + preview side-by-side) needs real width for two panes,
// so it gates at Tailwind's `lg` (1024px) rather than the `md` line used for drag-and-drop.
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
