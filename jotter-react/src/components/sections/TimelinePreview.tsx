import { buildTimelinePreview, getScheduleItemCount } from '@/lib/util/schedule';

// Static, non-interactive preview of a Timeline section — a compact swimlane (lanes × bars)
// built with plain CSS, no vis-timeline instance (that stays behind the editor's code-split
// boundary). Mirrors TablePreview's "render our own data, not the library" approach.
const PREVIEW_LANES = 4;

export function TimelinePreview({ content }: { content: string }) {
  if (getScheduleItemCount(content) === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded bg-slate-50 text-sm text-slate-400">
        {content?.trim() ? 'Empty timeline' : 'New timeline'}
      </div>
    );
  }

  const { lanes, extraLanes } = buildTimelinePreview(content, PREVIEW_LANES);

  return (
    <div className="space-y-1.5">
      {lanes.map((lane, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-16 flex-shrink-0 truncate text-[10px] text-slate-500" title={lane.label}>
            {lane.label}
          </span>
          <div className="relative h-4 flex-1 rounded bg-slate-50">
            {lane.bars.map((bar, j) => (
              <div
                key={j}
                title={bar.title}
                style={{
                  left: `${bar.leftPct}%`,
                  width: `${bar.widthPct}%`,
                  backgroundColor: bar.color
                }}
                className="absolute top-0 h-4 overflow-hidden rounded px-1 text-[9px] leading-4 whitespace-nowrap text-slate-700"
              >
                {bar.title}
              </div>
            ))}
          </div>
        </div>
      ))}
      {extraLanes > 0 && (
        <p className="text-[10px] text-slate-400">
          +{extraLanes} more {extraLanes === 1 ? 'lane' : 'lanes'}
        </p>
      )}
    </div>
  );
}
