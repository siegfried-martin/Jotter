import type { NoteSection } from '@/lib/types';

/**
 * Whether wysiwyg HTML is visually empty. A cleared contentEditable (or Quill)
 * leaves residual markup like a break tag, which is not the empty string but
 * renders blank, so a naive equality check against '' misses it.
 */
export function isWysiwygEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  // Embedded media counts as content even without text.
  if (/<(img|svg|canvas|video|iframe|table|input)\b/i.test(html)) return false;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .trim();
  return text === '';
}

/** Whether a section has no meaningful content (used for delete-empty-on-cancel + previews). */
export function isSectionEmpty(section: NoteSection): boolean {
  if (section.type === 'checklist') return (section.checklist_data?.length ?? 0) === 0;
  if (section.type === 'wysiwyg') return isWysiwygEmpty(section.content);
  // code, diagram
  return !section.content || section.content.trim() === '';
}
