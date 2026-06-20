// Warm the lazy vis-timeline chunk (the engine + its CSS) ahead of opening a Timeline
// editor, so the grid and the annotation overlay paint together instead of the grid lagging
// ~1s behind while the ~560KB library downloads + initializes on first open.
//
// ES module caching makes this idempotent: the editor's own `import()` resolves to the same
// cached module, so prefetching just moves the cost earlier (e.g. onto card hover). Shared so
// the in-flight promise is reused rather than kicking off a second fetch.

let pending: Promise<unknown> | null = null;

export function prefetchTimelineEngine(): Promise<unknown> {
  if (!pending) {
    pending = (async () => {
      const [vis] = await Promise.all([
        import('vis-timeline/standalone'),
        import('vis-timeline/styles/vis-timeline-graph2d.min.css')
      ]);
      return vis;
    })().catch((e) => {
      // Don't cache a failure — let a later attempt retry the import.
      pending = null;
      throw e;
    });
  }
  return pending;
}
