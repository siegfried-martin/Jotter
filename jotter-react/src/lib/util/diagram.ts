/** Number of elements in a stored Excalidraw scene (0 if empty/invalid). */
export function getDiagramElementCount(content: string): number {
  if (!content) return 0;
  try {
    const data = JSON.parse(content);
    return Array.isArray(data.elements) ? data.elements.length : 0;
  } catch {
    return 0;
  }
}
