// src/routes/app/collections/[collection_id]/edit/[section_id]/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  return {
    collection_id: params.collection_id,
    section_id: params.section_id
  };
};