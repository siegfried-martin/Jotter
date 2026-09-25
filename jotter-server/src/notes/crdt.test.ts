import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { applyCrdtEdit, fragmentToHtml } from './crdt';

const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');
const load = (ydoc: string) => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Buffer.from(ydoc, 'base64'));
  return doc;
};

describe('applyCrdtEdit — plain text (code / markdown)', () => {
  it('seeds a legacy section from content, then appends on a new line', () => {
    const r = applyCrdtEdit(
      { type: 'code', content: 'a = 1', ydoc: null },
      { mode: 'append', body: 'b = 2' }
    );
    expect(r.content).toBe('a = 1\nb = 2');
    expect(load(r.ydoc).getText('content').toString()).toBe('a = 1\nb = 2');
  });

  it('starts appended markdown as a new paragraph', () => {
    const r = applyCrdtEdit(
      { type: 'markdown', content: '# Notes\n', ydoc: null },
      { mode: 'append', body: '- item' }
    );
    expect(r.content).toBe('# Notes\n\n- item');
  });

  it('replace swaps the whole body', () => {
    const first = applyCrdtEdit(
      { type: 'markdown', content: 'old', ydoc: null },
      { mode: 'append', body: 'more' }
    );
    const r = applyCrdtEdit(
      { type: 'markdown', content: first.content, ydoc: first.ydoc },
      { mode: 'replace', body: 'new' }
    );
    expect(r.content).toBe('new');
  });

  it('merges with a concurrent edit made in an editor from the same snapshot', () => {
    // An editor and the server both start from the same saved snapshot.
    const base = new Y.Doc();
    base.getText('content').insert(0, 'line one');
    const snapshot = b64(Y.encodeStateAsUpdate(base));

    const editor = load(snapshot);
    editor.getText('content').insert(0, 'EDITOR ');

    const server = applyCrdtEdit(
      { type: 'code', content: 'line one', ydoc: snapshot },
      { mode: 'append', body: 'CLAUDE' }
    );
    // The editor receives the live broadcast delta, and vice versa: both converge.
    Y.applyUpdate(editor, server.update);
    const merged = load(server.ydoc);
    Y.applyUpdate(merged, Y.encodeStateAsUpdate(editor));
    expect(editor.getText('content').toString()).toBe('EDITOR line one\nCLAUDE');
    expect(merged.getText('content').toString()).toBe('EDITOR line one\nCLAUDE');
  });

  it('broadcast delta applies to an editor holding the previous state', () => {
    const base = new Y.Doc();
    base.getText('content').insert(0, 'x');
    const snapshot = b64(Y.encodeStateAsUpdate(base));
    const editor = load(snapshot);
    const r = applyCrdtEdit(
      { type: 'code', content: 'x', ydoc: snapshot },
      { mode: 'append', body: 'y' }
    );
    Y.applyUpdate(editor, r.update);
    expect(editor.getText('content').toString()).toBe('x\ny');
  });
});

describe('applyCrdtEdit — rich text (wysiwyg)', () => {
  it('seeds from the HTML mirror and appends rendered Markdown', () => {
    const r = applyCrdtEdit(
      { type: 'wysiwyg', content: '<p>hello</p>', ydoc: null },
      { mode: 'append', body: 'Some **bold** text\n\n- one\n- two' }
    );
    expect(r.content).toBe(
      '<p>hello</p><p>Some <strong>bold</strong> text</p><ul><li><p>one</p></li><li><p>two</p></li></ul>'
    );
    expect(fragmentToHtml(load(r.ydoc).getXmlFragment('richtext'))).toBe(r.content);
  });

  it('replaces a blank editor paragraph instead of appending after it', () => {
    const blank = new Y.Doc();
    blank.getXmlFragment('richtext').insert(0, [new Y.XmlElement('paragraph')]);
    const r = applyCrdtEdit(
      { type: 'wysiwyg', content: '', ydoc: b64(Y.encodeStateAsUpdate(blank)) },
      { mode: 'append', body: 'first' }
    );
    expect(r.content).toBe('<p>first</p>');
  });

  it('keeps headings, links, code blocks and tables that the editor schema supports', () => {
    const r = applyCrdtEdit(
      { type: 'wysiwyg', content: '', ydoc: null },
      {
        mode: 'replace',
        body: '## Plan\n\nSee [docs](https://x.test)\n\n```js\nlet a\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |'
      }
    );
    expect(r.content).toContain('<h2>Plan</h2>');
    expect(r.content).toContain('href="https://x.test"');
    expect(r.content).toContain('<pre><code class="language-js">let a</code></pre>');
    expect(r.content).toContain('<table');
  });
});
