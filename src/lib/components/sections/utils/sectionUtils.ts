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