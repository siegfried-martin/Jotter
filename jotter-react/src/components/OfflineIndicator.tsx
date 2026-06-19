import { useOnlineStatus, usePendingSync } from '@/lib/offline/useOnlineStatus';

/**
 * Global connectivity badge (fixed, bottom-left). Reassures the user that edits made
 * offline are kept and will sync. Hidden when online with nothing pending.
 */
export function OfflineIndicator() {
  const online = useOnlineStatus();
  const pending = usePendingSync();

  if (online && pending === 0) return null;

  const offline = !online;
  const label = offline
    ? pending > 0
      ? `Offline — ${pending} change${pending === 1 ? '' : 's'} saved locally`
      : 'Offline'
    : `Syncing ${pending} change${pending === 1 ? '' : 's'}…`;

  return (
    <div
      data-testid="offline-indicator"
      data-offline={offline ? 'true' : 'false'}
      className={`fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium shadow-lg ${
        offline ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${offline ? 'bg-amber-500' : 'animate-pulse bg-blue-500'}`}
      />
      {label}
    </div>
  );
}
