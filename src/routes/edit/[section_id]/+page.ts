// src/routes/edit/[section_id]/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	return {
		section_id: params.section_id
	};
};