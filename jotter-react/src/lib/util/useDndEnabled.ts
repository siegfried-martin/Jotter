import { useMediaQuery } from './useMediaQuery';

// DnD is desktop-only for now (the user disables all drag-and-drop on mobile).
// Gate on Tailwind's `md` breakpoint so it matches the responsive layout.
const QUERY = '(min-width: 768px)';

/** True when the viewport is md+ — drag-and-drop is disabled on mobile for now. */
export function useDndEnabled(): boolean {
  return useMediaQuery(QUERY);
}
