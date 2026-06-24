// Warm the FullCalendar chunk before the editor mounts. FullCalendar (+ its daygrid/timegrid/
// interaction plugins) is heavy, so CalendarCanvas is code-split; hovering a Calendar card or
// its Add button kicks off the download via this shared, idempotent promise. Mirrors
// timelinePrefetch. A failed prefetch clears the promise so a later attempt can retry.
let pending: Promise<unknown> | null = null;

export function prefetchCalendarEngine(): Promise<unknown> {
  if (!pending) {
    pending = import('./CalendarCanvas').catch((e) => {
      pending = null;
      throw e;
    });
  }
  return pending;
}
