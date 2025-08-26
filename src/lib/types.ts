export interface ChecklistItem {
  text: string;
  checked: boolean;
  date?: string; // ISO date string, optional
}

// Collection interfaces
export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_default: boolean;
  user_id: string;
  sequence: number; // Add sequence support
  created_at: string;
  updated_at: string;
}

export interface CreateCollection {
  name: string;
  description?: string;
  color?: string;
  is_default?: boolean;
  sequence?: number; // Optional - will be auto-assigned if not provided
}

export interface UpdateCollection {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  is_default?: boolean;
  sequence?: number;
}

// Note interfaces
export interface NoteContainer {
  id: string;
  title: string;
  sequence: number; // Add sequence support
  created_at: string;
  updated_at: string;
}

export interface NoteSection {
  id: string;
  note_container_id: string;
  type: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
  title?: string | null; // NEW: Optional title field
  content: string;
  sequence: number;
  meta: Record<string, any>;
  checklist_data?: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

// Create interfaces
export interface CreateNoteContainer {
  title: string;
  sequence?: number; // Optional - will be auto-assigned if not provided
}

export interface CreateNoteSection {
  note_container_id: string;
  type: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
  title?: string | null; // NEW: Optional title field
  content: string;
  sequence?: number; // Optional - will be auto-assigned if not provided
  meta?: Record<string, any>;
  checklist_data?: ChecklistItem[];
}

// Update interfaces
export interface UpdateNoteContainer {
  id: string;
  title?: string;
  sequence?: number;
}

export interface UpdateNoteSection {
  id: string;
  type?: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
  title?: string | null; // NEW: Optional title field
  content?: string;
  sequence?: number;
  meta?: Record<string, any>;
  checklist_data?: ChecklistItem[];
}

// Sequence management types
export interface SequenceUpdate {
  id: string;
  sequence: number;
}

export interface ReorderRequest {
  fromIndex: number;
  toIndex: number;
  items: SequenceUpdate[];
}

// ===== NEW: CACHE SYSTEM TYPES =====

/**
 * Cache entry for sections of a specific container
 */
export interface CachedSections {
  sections: NoteSection[];
  lastFetched: number;
  lastModified: string; // Server's updated_at timestamp for staleness detection
  isStale: boolean;
  version?: number; // For conflict resolution in multi-user scenarios
}

/**
 * Cache storage for all section data
 */
export interface SectionCache {
  [containerId: string]: CachedSections;
}

/**
 * Collection-level cache metadata
 */
export interface CollectionCacheEntry {
  recentContainers: string[];  // Container IDs ordered by recency
  lastUpdated: number;         // When we last fetched container list
  preloadedCount: number;      // How many containers we successfully preloaded
  serverTimestamp?: string;    // For server sync comparison
}

/**
 * Collection cache storage
 */
export interface CollectionCache {
  [collectionId: string]: CollectionCacheEntry;
}

/**
 * Cache configuration and behavior
 */
export interface CachePolicy {
  maxAge: number;              // Cache TTL in milliseconds
  preloadCount: number;        // How many recent containers to preload
  staleWhileRevalidate: boolean; // Serve stale data while fetching fresh
  maxCacheSize: number;        // Maximum number of containers to cache
  batchSize: number;           // Concurrent preload batch size
}

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStats {
  totalCachedContainers: number;
  totalCachedSections: number;
  collectionsWithCache: number;
  staleCacheCount: number;
  cacheHitRate?: number;       // For future analytics
  totalCacheSize: number;      // Memory usage estimation
}

// ===== FUTURE: REAL-TIME COLLABORATION TYPES =====

/**
 * Server sync event for polling/WebSocket updates
 */
export interface SyncEvent {
  type: 'container_updated' | 'section_updated' | 'section_deleted' | 'container_deleted';
  containerId: string;
  sectionId?: string;
  timestamp: string;
  userId?: string;             // Who made the change
  data?: Partial<NoteContainer | NoteSection>; // Updated data
}

/**
 * Polling configuration
 */
export interface PollingConfig {
  enabled: boolean;
  interval: number;            // Polling interval in milliseconds
  maxRetries: number;
  backoffMultiplier: number;
}

/**
 * WebSocket configuration for future use
 */
export interface WebSocketConfig {
  enabled: boolean;
  url: string;
  reconnectAttempts: number;
  heartbeatInterval: number;
}

/**
 * Real-time sync configuration
 */
export interface SyncConfig {
  polling?: PollingConfig;
  websocket?: WebSocketConfig;
  conflictResolution: 'server_wins' | 'client_wins' | 'merge' | 'prompt_user';
}