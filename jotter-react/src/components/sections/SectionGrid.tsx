import { useNavigate } from '@tanstack/react-router';
import type { CreateNoteSection, NoteSection } from '@/lib/types';
import { useCreateSection, useDeleteSection, useSections } from '@/lib/data/useSections';
import { SectionCard } from './SectionCard';

type SectionType = NoteSection['type'];

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
  const { data: sections, isPending } = useSections(containerId);
  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();

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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {sections.map((s) => (
            <SectionCard
              key={s.id}
              section={s}
              onOpen={() => openEditor(s.id)}
              onDelete={() => deleteSection.mutate({ id: s.id, containerId })}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
          No sections yet. Add one above.
        </div>
      )}
    </div>
  );
}
