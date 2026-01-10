// src/routes/api/admin/events/+server.ts
// Admin API for querying event logs (for testing/analytics)
//
// Query params:
//   date      - Filter by date (YYYY-MM-DD format)
//   user_id   - Filter by specific user ID
//   demo_only - If 'true', only show events where user_id is NULL
//   limit     - Max results (default 100, max 1000)
//
// Response ordered by: user_id (nulls first), then created_at

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const GET: RequestHandler = async ({ url }) => {
	// Parse query params
	const dateParam = url.searchParams.get('date');
	const userIdParam = url.searchParams.get('user_id');
	const demoOnly = url.searchParams.get('demo_only') === 'true';
	const limitParam = url.searchParams.get('limit');

	const limit = Math.min(parseInt(limitParam || '100', 10), 1000);

	// Build query
	let query = supabase
		.from('event_log')
		.select('*')
		.order('user_id', { ascending: true, nullsFirst: true })
		.order('created_at', { ascending: true })
		.limit(limit);

	// Apply filters
	if (dateParam) {
		// Filter by date (events created on that day)
		const startOfDay = `${dateParam}T00:00:00.000Z`;
		const endOfDay = `${dateParam}T23:59:59.999Z`;
		query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
	}

	if (demoOnly) {
		// Only demo users (user_id is NULL)
		query = query.is('user_id', null);
	} else if (userIdParam) {
		// Specific user
		query = query.eq('user_id', userIdParam);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Error fetching events:', error);
		return json({ error: error.message }, { status: 500 });
	}

	// Group by user for easier reading
	const grouped = {
		demo_users: data?.filter(e => e.user_id === null) || [],
		authenticated_users: data?.filter(e => e.user_id !== null) || []
	};

	// Summary stats
	const summary = {
		total_events: data?.length || 0,
		demo_events: grouped.demo_users.length,
		auth_events: grouped.authenticated_users.length,
		unique_sessions: new Set(data?.map(e => e.session_id)).size,
		event_types: [...new Set(data?.map(e => e.event_type))].sort()
	};

	return json({
		summary,
		events: data,
		grouped,
		query: {
			date: dateParam,
			user_id: userIdParam,
			demo_only: demoOnly,
			limit
		}
	});
};
