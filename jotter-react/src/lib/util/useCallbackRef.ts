import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Returns a stable function identity that always calls the latest `callback`.
 * Lets effects depend on it without re-running when the callback changes
 * (the standard "useEvent" pattern).
 */
export function useCallbackRef<Args extends unknown[], R>(callback: (...args: Args) => R) {
  const ref = useRef(callback);
  useLayoutEffect(() => {
    ref.current = callback;
  });
  return useCallback((...args: Args) => ref.current(...args), []);
}
