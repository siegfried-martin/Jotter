import { getScheduleItemCount } from '@/lib/util/schedule';

// Static, non-interactive preview of a Timeline section — no vis-timeline instance (that
// stays behind the editor's code-split boundary). SLICE 1 renders the count/empty state; the
// mini-swimlane render (lanes × bars) lands with the preview slice.
export function TimelinePreview({ content }: { content: string }) {
  const count = getScheduleItemCount(content);

  if (count === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded bg-slate-50 text-sm text-slate-400">
        {content?.trim() ? 'Empty timeline' : 'New timeline'}
      </div>
    );
  }

  return (
    <div className="flex h-32 items-center justify-center rounded bg-slate-50 text-sm text-slate-500">
      {count} {count === 1 ? 'item' : 'items'}
    </div>
  );
}
