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
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: section.id,
    data: { type: 'section', sectionId: section.id, containerId, index },
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
      dragStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
        zIndex: isDragging ? 20 : undefined
      }}
      dragHandle={dndEnabled ? { ref: setActivatorNodeRef, attributes, listeners } : null}
    />
  );
}

const ADD_BUTTONS: { type: SectionType; label: string }[] = [
  { type: 'wysiwyg', label: '+ Text' },
  { type: 'code', label: '+ Code' },
  { type: 'checklist', label: '+ Checklist' },
  { type: 'diagram', label: '+ Diagram' }
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
      <div className="mb-4 flex flex-wrap gap-2">
        {ADD_BUTTONS.map((b) => (
          <button
            key={b.type}
            onClick={() => addSection(b.type)}
            disabled={createSection.isPending}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {b.label}
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
