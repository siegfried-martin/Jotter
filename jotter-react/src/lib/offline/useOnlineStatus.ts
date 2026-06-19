import { useSyncExternalStore } from 'react';
import { isOnline, subscribeOnline } from './onlineStatus';
import { getPendingCount, subscribePending } from './sectionSync';

/** React binding for connectivity — re-renders on online↔offline transitions. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeOnline(onChange),
    isOnline,
    () => true // server snapshot: assume online
  );
}

/** Number of edits parked in the outbox awaiting sync — re-renders as it changes. */
export function usePendingSync(): number {
  return useSyncExternalStore(subscribePending, getPendingCount, () => 0);
}
