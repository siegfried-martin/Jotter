import { describe, it, expect } from 'vitest';
import { trackForType, isCrdtType, isLwwType } from './sectionTrack';

describe('section track classifier', () => {
  it('routes code and wysiwyg to the CRDT track', () => {
    expect(trackForType('code')).toBe('crdt');
    expect(trackForType('wysiwyg')).toBe('crdt');
    expect(isCrdtType('code')).toBe(true);
    expect(isLwwType('wysiwyg')).toBe(false);
  });

  it('routes checklist and diagram to the LWW track', () => {
    expect(trackForType('checklist')).toBe('lww');
    expect(trackForType('diagram')).toBe('lww');
    expect(isLwwType('checklist')).toBe(true);
    expect(isCrdtType('diagram')).toBe(false);
  });
});
