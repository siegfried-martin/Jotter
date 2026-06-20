/**
 * Timeline (resource-swimlane roadmap) section editor.
 *
 * SLICE 1 STUB — wires the section type end-to-end (create → save → card preview) before the
 * heavy vis-timeline library lands in the next slice. Mirrors the `{ initial, onChange }`
 * contract of the other LWW editors; the real editor will own a `TimelineDoc` (groups +
 * items), code-split vis-timeline, and emit serialized JSON on edits. See
 * docs/initiatives/calendar-timeline-section.md.
 */
export function TimelineEditor({
  initial,
  onChange
}: {
  initial: string;
  onChange: (content: string) => void;
}) {
  // The real editor consumes these; the stub keeps the signature stable for the route.
  void initial;
  void onChange;
  return (
    <div
      data-testid="timeline-editor"
      className="flex h-full w-full items-center justify-center rounded bg-slate-50 text-sm text-slate-400"
    >
      Timeline editor coming soon…
    </div>
  );
}
