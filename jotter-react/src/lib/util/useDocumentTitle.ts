import { useEffect } from 'react';

/**
 * Set the browser tab title to "<page> - Jotter" (just "Jotter" when blank),
 * matching the prod per-page title convention. Each route calls this with its
 * own page name; routes unmount as you navigate so there's nothing to restore.
 */
export function useDocumentTitle(page: string | null | undefined) {
  useEffect(() => {
    const name = page?.trim();
    document.title = name ? `${name} - Jotter` : 'Jotter';
  }, [page]);
}
