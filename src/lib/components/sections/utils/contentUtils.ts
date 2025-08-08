// src/lib/components/notes/utils/contentUtils.ts

export function truncateContent(content: string, maxLength: number = 150): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

export function getDiagramElementCount(content: string): number {
  try {
    const data = JSON.parse(content);
    return data.elements?.length || 0;
  } catch {
    return 0;
  }
}

export function copyToClipboard(content: string): void {
  navigator.clipboard.writeText(content);
  // TODO: Show toast notification
}