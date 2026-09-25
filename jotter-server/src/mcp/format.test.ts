import { describe, expect, it } from 'vitest';
import type { NoteSection } from '../shared';
import { Links, MAX_BODY_CHARS, formatSection, formatSectionList, sectionBody } from './format';

const links = new Links('https://jotter.test');

function section(partial: Partial<NoteSection> & Pick<NoteSection, 'type'>): NoteSection {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    note_container_id: null,
    user_id: 'u1',
    title: 'Plan',
    content: '',
    sequence: 0,
    meta: {},
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-20T12:00:00Z',
    ...partial
  };
}

describe('sectionBody', () => {
  it('fences code with its language, dropping "plaintext"', () => {
    expect(
      sectionBody(section({ type: 'code', content: 'x = 1', meta: { language: 'python' } }))
    ).toBe('```python\nx = 1\n```');
    expect(
      sectionBody(section({ type: 'code', content: 'hi', meta: { language: 'plaintext' } }))
    ).toBe('```\nhi\n```');
  });

  it('uses a longer fence when the code itself contains a fence', () => {
    expect(sectionBody(section({ type: 'code', content: '```js\n```' }))).toMatch(/^````\n/);
  });

  it('describes drawings instead of dumping the Excalidraw JSON', () => {
    const content = JSON.stringify({ elements: [{}, {}] });
    expect(sectionBody(section({ type: 'diagram', content }))).toContain('2 elements');
  });

  it('converts rich text and checklists to Markdown', () => {
    expect(sectionBody(section({ type: 'wysiwyg', content: '<p><strong>Hi</strong></p>' }))).toBe(
      '**Hi**'
    );
    expect(
      sectionBody(
        section({
          type: 'checklist',
          checklist_data: [
            { text: 'ship', checked: true },
            { text: 'test', checked: false }
          ]
        })
      )
    ).toBe('- [x] ship\n- [ ] test');
  });
});

describe('formatSection', () => {
  it('includes metadata, location, and the Jotter link', () => {
    const out = formatSection(
      section({ type: 'markdown', content: '# Hello' }),
      { collection: { id: 'c', name: 'Work' }, container: { id: 'n', title: 'Sprint' } },
      links
    );
    expect(out).toContain('# Plan');
    expect(out).toContain('**Location:** Work › Sprint');
    expect(out).toContain('https://jotter.test/app/sections/11111111-1111-4111-8111-111111111111');
    expect(out.endsWith('# Hello')).toBe(true);
  });

  it('labels unfiled notes and truncates huge bodies', () => {
    const out = formatSection(
      section({ type: 'markdown', content: 'x'.repeat(MAX_BODY_CHARS + 10) }),
      null,
      links
    );
    expect(out).toContain('Unfiled');
    expect(out).toContain('Truncated');
  });
});

describe('formatSectionList', () => {
  it('returns the empty message for no results', () => {
    expect(formatSectionList('h', [], links, 'nothing')).toBe('nothing');
  });

  it('lists title, friendly type, and link', () => {
    const out = formatSectionList(
      'Results:',
      [
        {
          id: 'abc',
          type: 'wysiwyg',
          title: null,
          note_container_id: null,
          updated_at: '2026-09-20T00:00:00Z'
        }
      ],
      links,
      ''
    );
    expect(out).toContain('**Untitled** (text, updated 2026-09-20) · unfiled');
    expect(out).toContain('https://jotter.test/app/sections/abc');
  });
});
