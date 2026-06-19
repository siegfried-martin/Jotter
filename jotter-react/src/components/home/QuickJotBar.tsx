import { useNavigate } from '@tanstack/react-router';
import type { CreateNoteSection, NoteSection } from '@/lib/types';
import { useCreateUnparentedSection } from '@/lib/data/useSections';
import { SECTION_TYPE_META, SECTION_TYPE_ORDER } from '@/lib/util/sectionTypeStyle';

type SectionType = NoteSection['type'];

function defaultJot(type: SectionType): Omit<CreateNoteSection, 'note_container_id' | 'sequence'> {
  return {
    type,
    content: '',
    meta: type === 'code' ? { language: 'plaintext' } : {},
    checklist_data: type === 'checklist' ? [] : undefined
  };
}

/** Create an unparented section of any type and jump straight into the editor. */
export function QuickJotBar() {
  const navigate = useNavigate();
  const createJot = useCreateUnparentedSection();

  async function addJot(type: SectionType) {
    const created = await createJot.mutateAsync(defaultJot(type));
    navigate({ to: '/app/sections/$sectionId', params: { sectionId: created.id } });
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2">
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
  );
}
