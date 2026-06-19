import { useNavigate } from '@tanstack/react-router';
import type { CreateNoteSection, NoteSection } from '@/lib/types';
import {
  useCreateUnparentedSection,
  useDeleteSection,
  useRecentSections,
  useUpdateSection
} from '@/lib/data/useSections';
import { SECTION_TYPE_META, SECTION_TYPE_ORDER } from '@/lib/util/sectionTypeStyle';
import { SectionCard } from '@/components/sections/SectionCard';
import { isSectionEmpty } from '@/lib/util/sectionContent';

type SectionType = NoteSection['type'];

function defaultJot(type: SectionType): Omit<CreateNoteSection, 'note_container_id' | 'sequence'> {
  return {
    type,
    content: '',
    meta: type === 'code' ? { language: 'plaintext' } : {},
    checklist_data: type === 'checklist' ? [] : undefined
  };
}

/**
 * Home dashboard: a "Quick jot" row that creates an unparented section and opens it,
 * plus a "Recent notes" feed of recently-edited sections (filed or not). Cards open
 * the flat editor route. Not draggable here — DnD lives on the container page.
 */
export function HomeNotes() {
  const navigate = useNavigate();
  const createJot = useCreateUnparentedSection();
  const deleteSection = useDeleteSection();
  const updateSection = useUpdateSection();
  const { data: recent, isPending } = useRecentSections();

  function openSection(sectionId: string) {
    navigate({ to: '/app/sections/$sectionId', params: { sectionId } });
  }

  async function addJot(type: SectionType) {
    const created = await createJot.mutateAsync(defaultJot(type));
    openSection(created.id);
  }

  return (
    <div className="mb-10">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-slate-400">Quick jot</span>
        {SECTION_TYPE_ORDER.map((type) => {
          const meta = SECTION_TYPE_META[type];
          return (
            <button
              key={type}
              onClick={() => addJot(type)}
              disabled={createJot.isPending}
              title={`New ${meta.addLabel}`}
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

      {recent && recent.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Recent notes</h2>
          <div
            data-testid="recent-notes"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            {recent.map((s) => (
              <SectionCard
                key={s.id}
                section={s}
                onOpen={() => openSection(s.id)}
                onDelete={() => {
                  if (
                    !isSectionEmpty(s) &&
                    !window.confirm(
                      `Delete this ${s.title || s.type} section? This cannot be undone.`
                    )
                  )
                    return;
                  deleteSection.mutate({ id: s.id, containerId: s.note_container_id ?? '' });
                }}
                onRenameTitle={(title) =>
                  updateSection.mutate({
                    id: s.id,
                    containerId: s.note_container_id ?? '',
                    updates: { title }
                  })
                }
                onToggleChecklistItem={(index, checked) => {
                  const next = (s.checklist_data ?? []).map((it, i) =>
                    i === index ? { ...it, checked } : it
                  );
                  updateSection.mutate({
                    id: s.id,
                    containerId: s.note_container_id ?? '',
                    updates: { checklist_data: next }
                  });
                }}
              />
            ))}
          </div>
        </>
      )}
      {isPending && <p className="text-sm text-slate-400">Loading recent notes…</p>}
    </div>
  );
}
