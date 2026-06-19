import { useSyncExternalStore } from 'react';
import { isDemoMode, subscribeDemoMode } from './demoMode';

/** React binding for the framework-neutral demo-mode flag. */
export function useDemoMode(): boolean {
  return useSyncExternalStore(subscribeDemoMode, isDemoMode, () => false);
}
