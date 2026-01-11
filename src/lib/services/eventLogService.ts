// src/lib/services/eventLogService.ts
// Unified event logging for analytics and future features (undo, sync, audit)
// See docs/architecture/event-log.md for full documentation

import { supabase, getAuthenticatedUser } from '$lib/supabase';
import { browser } from '$app/environment';

const SESSION_ID_KEY = 'jotter_session_id';

// Event types for type safety
export type EntityType = 'collection' | 'container' | 'section';

export type EventType =
	// Session events
	| 'session.start'
	| 'session.end'
	// Collection events
	| 'collection.created'
	| 'collection.updated'
	| 'collection.deleted'
	| 'collection.reordered'
	// Container events
	| 'container.created'
	| 'container.updated'
	| 'container.deleted'
	| 'container.moved'
	| 'container.reordered'
	// Section events
	| 'section.created'
	| 'section.updated'
	| 'section.deleted'
	| 'section.moved'
	| 'section.reordered'
	// Auth events
	| 'auth.signin_clicked'
	| 'auth.converted'
	| 'auth.signout';

export interface LogEventOptions {
	entityType?: EntityType;
	entityId?: string;
	parentId?: string;
	data?: Record<string, unknown>;
}

/**
 * Get or create a session ID for the current browser session.
 * Session ID is stored in sessionStorage and persists until the tab is closed.
 */
function getSessionId(): string {
	if (!browser) return crypto.randomUUID();

	let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
	if (!sessionId) {
		sessionId = crypto.randomUUID();
		sessionStorage.setItem(SESSION_ID_KEY, sessionId);
	}
	return sessionId;
}

/**
 * Get the referrer domain (not full URL for privacy)
 */
function getReferrerDomain(): string | null {
	if (!browser) return null;
	try {
		const referrer = document.referrer;
		if (!referrer) return null;
		const url = new URL(referrer);
		return url.hostname;
	} catch {
		return null;
	}
}

/**
 * EventLogService - Fire-and-forget event logging
 *
 * Events are logged asynchronously and should never block UI operations.
 * Errors are caught and logged but don't propagate to callers.
 */
export class EventLogService {
	private static sessionId: string | null = null;
	private static userId: string | null = null;
	private static initialized = false;

	/**
	 * Initialize the event log service.
	 * Call this once on app startup to set up session tracking.
	 */
	static async initialize(): Promise<void> {
		if (!browser || this.initialized) return;

		this.sessionId = getSessionId();
		this.initialized = true;

		// Try to get user ID (will be null for demo users)
		try {
			const user = await getAuthenticatedUser(5000); // 5s timeout
			this.userId = user?.id ?? null;
		} catch {
			this.userId = null;
		}

		console.log('📊 EventLogService initialized', {
			sessionId: this.sessionId?.slice(0, 8),
			hasUser: !!this.userId
		});
	}

	/**
	 * Update the user ID (call after auth state changes)
	 */
	static setUserId(userId: string | null): void {
		this.userId = userId;
	}

	/**
	 * Log an event. Fire-and-forget - never throws or blocks.
	 *
	 * @param eventType - The type of event (e.g., 'section.created')
	 * @param options - Optional entity info and event data
	 */
	static log(eventType: EventType, options: LogEventOptions = {}): void {
		if (!browser) return;

		// Ensure we have a session ID
		if (!this.sessionId) {
			this.sessionId = getSessionId();
		}

		// Fire and forget - don't await
		this.logAsync(eventType, options).catch((error) => {
			// Log errors but don't propagate - events should never break the app
			console.warn('📊 Event log failed:', eventType, error);
		});
	}

	/**
	 * Internal async logging implementation
	 */
	private static async logAsync(eventType: EventType, options: LogEventOptions): Promise<void> {
		const event = {
			session_id: this.sessionId,
			user_id: this.userId,
			event_type: eventType,
			entity_type: options.entityType ?? null,
			entity_id: options.entityId ?? null,
			parent_id: options.parentId ?? null,
			event_data: options.data ?? {}
		};

		const { error } = await supabase.from('event_log').insert(event);

		if (error) {
			throw error;
		}
	}

	/**
	 * Log session start event.
	 * Call this once when the app first loads.
	 */
	static logSessionStart(isDemo: boolean): void {
		const referrer = getReferrerDomain();
		this.log('session.start', {
			data: {
				is_demo: isDemo,
				...(referrer && { referrer })
			}
		});
	}

	/**
	 * Log session end event.
	 * Best effort - called on page unload via sendBeacon if possible.
	 */
	static logSessionEnd(durationSeconds: number): void {
		if (!browser || !this.sessionId) return;

		// Use sendBeacon for reliability on page unload
		const event = {
			session_id: this.sessionId,
			user_id: this.userId,
			event_type: 'session.end',
			entity_type: null,
			entity_id: null,
			parent_id: null,
			event_data: { duration_seconds: durationSeconds }
		};

		// Try sendBeacon first (more reliable on unload)
		const beaconUrl = `${import.meta.env.VITE_SUPABASE_URL || ''}/rest/v1/event_log`;
		const beaconSuccess = navigator.sendBeacon?.(
			beaconUrl,
			new Blob([JSON.stringify(event)], { type: 'application/json' })
		);

		// Fall back to regular insert if beacon fails
		if (!beaconSuccess) {
			this.log('session.end', { data: { duration_seconds: durationSeconds } });
		}
	}

	// ============================================
	// Convenience methods for common events
	// ============================================

	static logCollectionCreated(collectionId: string, name: string, color: string): void {
		this.log('collection.created', {
			entityType: 'collection',
			entityId: collectionId,
			data: { name, color }
		});
	}

	static logCollectionUpdated(
		collectionId: string,
		changes: Record<string, { from: unknown; to: unknown }>
	): void {
		this.log('collection.updated', {
			entityType: 'collection',
			entityId: collectionId,
			data: { changes }
		});
	}

	static logCollectionDeleted(collectionId: string, name: string): void {
		this.log('collection.deleted', {
			entityType: 'collection',
			entityId: collectionId,
			data: { name }
		});
	}

	static logContainerCreated(containerId: string, collectionId: string, title: string): void {
		this.log('container.created', {
			entityType: 'container',
			entityId: containerId,
			parentId: collectionId,
			data: { title }
		});
	}

	static logContainerUpdated(
		containerId: string,
		changes: Record<string, { from: unknown; to: unknown }>
	): void {
		this.log('container.updated', {
			entityType: 'container',
			entityId: containerId,
			data: { changes }
		});
	}

	static logContainerDeleted(containerId: string, title: string, sectionCount: number): void {
		this.log('container.deleted', {
			entityType: 'container',
			entityId: containerId,
			data: { title, section_count: sectionCount }
		});
	}

	static logContainerMoved(
		containerId: string,
		fromCollectionId: string,
		toCollectionId: string
	): void {
		this.log('container.moved', {
			entityType: 'container',
			entityId: containerId,
			data: { from_collection: fromCollectionId, to_collection: toCollectionId }
		});
	}

	static logSectionCreated(
		sectionId: string,
		containerId: string,
		type: string,
		language?: string
	): void {
		this.log('section.created', {
			entityType: 'section',
			entityId: sectionId,
			parentId: containerId,
			data: { type, ...(language && { language }) }
		});
	}

	static logSectionUpdated(sectionId: string, type: string, contentLength: number): void {
		this.log('section.updated', {
			entityType: 'section',
			entityId: sectionId,
			data: { type, content_length: contentLength }
		});
	}

	static logSectionDeleted(sectionId: string, type: string): void {
		this.log('section.deleted', {
			entityType: 'section',
			entityId: sectionId,
			data: { type }
		});
	}

	static logSectionMoved(sectionId: string, fromContainerId: string, toContainerId: string): void {
		this.log('section.moved', {
			entityType: 'section',
			entityId: sectionId,
			data: { from_container: fromContainerId, to_container: toContainerId }
		});
	}

	static logSignInClicked(): void {
		this.log('auth.signin_clicked');
	}

	static logAuthConverted(hadCollections: number, hadContainers: number): void {
		this.log('auth.converted', {
			data: { had_collections: hadCollections, had_containers: hadContainers }
		});
	}

	static logSignOut(): void {
		this.log('auth.signout');
	}
}
