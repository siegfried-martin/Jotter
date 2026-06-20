import { describe, it, expect } from 'vitest';
import type { NoteSection } from '@/lib/types';
import { sectionToMarkdown, nativeCopyLabel, hasMarkdownCopy } from './sectionClipboard';

// Minimal section factory — only the fields the clipboard code reads matter.
function section(partial: Partial<NoteSection> & Pick<NoteSection, 'type'>): NoteSection {
  return {
    id: 's1',
    note_container_id: 'c1',
    user_id: 'u1',
    title: null,
    content: '',
    sequence: 0,
    meta: {},
    created_at: '',
    updated_at: '',
    ...partial
  } as NoteSection;
}

describe('sectionToMarkdown', () => {
  it('renders a checklist as a GFM task list, with due dates', () => {
    const s = section({
      type: 'checklist',
      checklist_data: [
        { text: 'done thing', checked: true },
        { text: 'todo thing', checked: false, date: '2026-07-01' }
      ]
    });
    expect(sectionToMarkdown(s)).toBe('- [x] done thing\n- [ ] todo thing (due 2026-07-01)');
  });

  it('returns markdown source verbatim', () => {
    const s = section({ type: 'markdown', content: '# Title\n\n- a\n- b' });
    expect(sectionToMarkdown(s)).toBe('# Title\n\n- a\n- b');
  });

  it('converts wysiwyg lines without double-spacing each line', () => {
    // Quill wraps every line in its own <p>; the output must not blank-line-separate them.
    const s = section({
      type: 'wysiwyg',
      content: '<p>line one</p><p>line two</p><p>line three</p>'
    });
    expect(sectionToMarkdown(s)).toBe('line one\nline two\nline three');
  });

  it('preserves an intentional blank line in wysiwyg', () => {
    const s = section({ type: 'wysiwyg', content: '<p>a</p><p><br></p><p>b</p>' });
    expect(sectionToMarkdown(s)).toBe('a\n\nb');
  });
});

describe('copy affordance predicates', () => {
  it('labels the native copy (Draw copies an image)', () => {
    expect(nativeCopyLabel('diagram')).toBe('Copy image');
    expect(nativeCopyLabel('code')).toBe('Copy');
    expect(nativeCopyLabel('markdown')).toBe('Copy');
  });

  it('offers "Copy as Markdown" only for Text, Checklist and Markdown', () => {
    expect(hasMarkdownCopy('wysiwyg')).toBe(true);
    expect(hasMarkdownCopy('checklist')).toBe(true);
    expect(hasMarkdownCopy('markdown')).toBe(true);
    expect(hasMarkdownCopy('code')).toBe(false);
    expect(hasMarkdownCopy('diagram')).toBe(false);
  });
});
