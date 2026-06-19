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
import { SectionCard } from './SectionCard';
import { isSectionEmpty } from '@/lib/util/sectionContent';

type SectionType = NoteSection['type'];

const TYPE_LABEL: Record<SectionType, string> = {
  code: 'Code',
  wysiwyg: 'Text',
  checklist: 'Checklist',
  diagram: 'Diagram'
};

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
      title: section.title || TYPE_LABEL[section.type]
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

// Per-type icon + hover color. Hover classes are spelled out (not interpolated) so
// Tailwind keeps them. New section types slot in here and the row wraps to fit.
const SECTION_TYPES: {
  type: SectionType;
  label: string;
  icon: string;
  hover: string;
}[] = [
  {
    type: 'wysiwyg',
    label: 'Text',
    icon: 'M4 6h16M4 12h16M4 18h7',
    hover: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
  },
  {
    type: 'code',
    label: 'Code',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    hover: 'hover:bg-green-50 hover:text-green-700 hover:border-green-200'
  },
  {
    type: 'diagram',
    label: 'Draw',
    icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
    hover: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
  },
  {
    type: 'checklist',
    label: 'Tasks',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    hover: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
  }
];

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
        {SECTION_TYPES.map((b) => (
          <button
            key={b.type}
            onClick={() => addSection(b.type)}
            disabled={createSection.isPending}
            title={`${b.label} section`}
            className={`group flex min-h-[2.25rem] items-center gap-2 rounded-md border border-transparent bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition disabled:opacity-50 ${b.hover}`}
          >
            <svg
              className="h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.icon} />
            </svg>
            <span className="hidden sm:inline">{b.label}</span>
          </button>
        ))}
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
