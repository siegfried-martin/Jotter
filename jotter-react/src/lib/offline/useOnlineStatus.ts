import { useSyncExternalStore } from 'react';
import { isOnline, subscribeOnline } from './onlineStatus';

/** React binding for connectivity — re-renders on online↔offline transitions. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeOnline(onChange),
    isOnline,
    () => true // server snapshot: assume online
  );
}
