import { useNavigate } from '@tanstack/react-router';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CreateNoteSection, NoteSection } from '@/lib/types';
import {
  useCreateSection,
  useDeleteSection,
  useSections,
  useUpdateSection
} from '@/lib/data/useSections';
import { useDndEnabled } from '@/lib/util/useDndEnabled';
import { SECTION_TYPE_META, SECTION_TYPE_ORDER } from '@/lib/util/sectionTypeStyle';
import { SectionCard } from './SectionCard';
import { isSectionEmpty } from '@/lib/util/sectionContent';
import { prefetchTimelineEngine } from '@/components/editors/timelinePrefetch';
import { prefetchCalendarEngine } from '@/components/editors/calendarPrefetch';

type SectionType = NoteSection['type'];

/** Warm the code-split editor chunk for types that have one, on hover/focus. */
function prefetchForType(type: SectionType): (() => void) | undefined {
  if (type === 'timeline') return prefetchTimelineEngine;
  if (type === 'calendar') return prefetchCalendarEngine;
  return undefined;
}

/** A section card wired as a dnd-kit sortable (drag handle, transform, drop ordering). */
function SortableSection({
  section,
  index,
  containerId,
  dndEnabled,
  onOpen,
  onDelete,
  onRenameTitle,
  onToggleChecklistItem
}: {
  section: NoteSection;
  index: number;
  containerId: string;
  dndEnabled: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRenameTitle: (title: string | null) => void;
  onToggleChecklistItem: (index: number, checked: boolean) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: {
      type: 'section',
      sectionId: section.id,
      containerId,
      index,
      title: section.title || SECTION_TYPE_META[section.type].typeLabel
    },
    disabled: !dndEnabled
  });

  return (
    <SectionCard
      section={section}
      onOpen={onOpen}
      onDelete={onDelete}
      onRenameTitle={onRenameTitle}
      onToggleChecklistItem={onToggleChecklistItem}
      dragRef={setNodeRef}
      // While dragging, the card stays put as a dimmed placeholder — the DragOverlay
      // renders the moving preview. Non-dragging cards shift via their transform.
      dragStyle={
        isDragging ? { opacity: 0.4 } : { transform: CSS.Transform.toString(transform), transition }
      }
      drag={dndEnabled ? { attributes, listeners } : undefined}
    />
  );
}

function defaultSection(type: SectionType, containerId: string): CreateNoteSection {
  return {
    note_container_id: containerId,
    type,
    content: '',
    meta: type === 'code' ? { language: 'plaintext' } : {},
    checklist_data: type === 'checklist' ? [] : undefined
  };
}

export function SectionGrid({
  collectionId,
  containerId
}: {
  collectionId: string;
  containerId: string;
}) {
  const navigate = useNavigate();
  const dndEnabled = useDndEnabled();
  const { data: sections, isPending } = useSections(containerId);
  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();
  const updateSection = useUpdateSection();

  function openEditor(sectionId: string) {
    navigate({
      to: '/app/collections/$collectionId/containers/$containerId/sections/$sectionId',
      params: { collectionId, containerId, sectionId }
    });
  }

  async function addSection(type: SectionType) {
    const created = await createSection.mutateAsync(defaultSection(type, containerId));
    openEditor(created.id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-slate-400">Add</span>
        {SECTION_TYPE_ORDER.map((type) => {
          const meta = SECTION_TYPE_META[type];
          return (
            <button
              key={type}
              onClick={() => addSection(type)}
              onPointerEnter={prefetchForType(type)}
              disabled={createSection.isPending}
              title={`${meta.addLabel} section`}
              className={`group flex min-h-[2.25rem] items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${meta.base} ${meta.hover}`}
            >
              <svg
                className="h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={meta.icon} />
              </svg>
              <span className="hidden sm:inline">{meta.addLabel}</span>
            </button>
          );
        })}
      </div>

      {isPending ? (
        <p className="text-sm text-slate-400">Loading sections…</p>
      ) : sections && sections.length > 0 ? (
        <SortableContext items={sections.map((s) => s.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {sections.map((s, index) => (
              <SortableSection
                key={s.id}
                section={s}
                index={index}
                containerId={containerId}
                dndEnabled={dndEnabled}
                onOpen={() => openEditor(s.id)}
                onDelete={() => {
                  // Confirm only when there's content to lose (parity with the docs).
                  if (
                    !isSectionEmpty(s) &&
                    !window.confirm(
                      `Delete this ${s.title || s.type} section? This cannot be undone.`
                    )
                  )
                    return;
                  deleteSection.mutate({ id: s.id, containerId });
                }}
                onRenameTitle={(title) =>
                  updateSection.mutate({ id: s.id, containerId, updates: { title } })
                }
                onToggleChecklistItem={(index, checked) => {
                  const next = (s.checklist_data ?? []).map((it, i) =>
                    i === index ? { ...it, checked } : it
                  );
                  updateSection.mutate({
                    id: s.id,
                    containerId,
                    updates: { checklist_data: next }
                  });
                }}
              />
            ))}
          </div>
        </SortableContext>
      ) : (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
          No sections yet. Add one above.
        </div>
      )}
    </div>
  );
}
