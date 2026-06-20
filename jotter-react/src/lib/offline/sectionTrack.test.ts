import { describe, it, expect } from 'vitest';
import { trackForType, isCrdtType, isLwwType } from './sectionTrack';

describe('section track classifier', () => {
  it('routes code, wysiwyg and markdown to the CRDT track', () => {
    expect(trackForType('code')).toBe('crdt');
    expect(trackForType('wysiwyg')).toBe('crdt');
    expect(trackForType('markdown')).toBe('crdt');
    expect(isCrdtType('code')).toBe(true);
    expect(isCrdtType('markdown')).toBe(true);
    expect(isLwwType('wysiwyg')).toBe(false);
  });

  it('routes checklist, diagram, table and timeline to the LWW track', () => {
    expect(trackForType('checklist')).toBe('lww');
    expect(trackForType('diagram')).toBe('lww');
    expect(trackForType('table')).toBe('lww');
    expect(trackForType('timeline')).toBe('lww');
    expect(isLwwType('checklist')).toBe(true);
    expect(isLwwType('table')).toBe(true);
    expect(isLwwType('timeline')).toBe(true);
    expect(isCrdtType('diagram')).toBe(false);
    expect(isCrdtType('table')).toBe(false);
    expect(isCrdtType('timeline')).toBe(false);
  });
});
