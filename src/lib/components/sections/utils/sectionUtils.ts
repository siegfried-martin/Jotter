// src/lib/components/sections/utils/sectionUtils.ts

export function copyToClipboard(text: string): void {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy text to clipboard:', err);
      fallbackCopyToClipboard(text);
    });
  } else {
    fallbackCopyToClipboard(text);
  }
}

/**
 * Copy HTML content as rich text to clipboard.
 * When pasting into rich text editors (Word, Google Docs, etc.), formatting is preserved.
 * When pasting into plain text contexts, falls back to plain text.
 */
export function copyHtmlToClipboard(html: string): void {
  // Convert HTML to plain text for fallback
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';

  // Use the Clipboard API with multiple formats
  if (navigator.clipboard && navigator.clipboard.write) {
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([plainText], { type: 'text/plain' });

    const clipboardItem = new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob
    });

    navigator.clipboard.write([clipboardItem]).catch(err => {
      console.error('Failed to copy rich text to clipboard:', err);
      // Fall back to plain text copy
      copyToClipboard(plainText);
    });
  } else {
    // Fallback for browsers without ClipboardItem support
    copyToClipboard(plainText);
  }
}

function fallbackCopyToClipboard(text: string): void {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }

  document.body.removeChild(textArea);
}