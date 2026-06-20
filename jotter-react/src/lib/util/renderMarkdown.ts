import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

// One shared parser. The `default` preset is CommonMark + GFM-ish extras (tables,
// strikethrough). We allow raw HTML in the source (html: true) because real Markdown
// permits it — safety comes from sanitizing the *output* with DOMPurify below, not from
// crippling the parser. linkify autolinks bare URLs; typographer does smart quotes/dashes.
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

let hookInstalled = false;

/**
 * Render Markdown source to sanitized HTML, safe to inject via dangerouslySetInnerHTML.
 *
 * Sections are public-by-default (sharing), so untrusted Markdown can reach other users —
 * the DOMPurify pass strips scripts/event handlers/javascript: URLs while keeping ordinary
 * formatting. External links get target/rel hardening so they can't reach back via opener.
 */
export function renderMarkdown(source: string): string {
  if (!source?.trim()) return '';

  // Harden anchors once: open in a new tab and sever the opener reference. Installed lazily
  // so importing this module in a non-DOM context (tests) doesn't touch DOMPurify eagerly.
  if (!hookInstalled) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.getAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    });
    hookInstalled = true;
  }

  return DOMPurify.sanitize(md.render(source), { ADD_ATTR: ['target'] });
}
