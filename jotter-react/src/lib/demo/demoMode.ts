// Framework-neutral demo-mode module.
//
// Ported from the Svelte app's `src/lib/stores/demoStore.ts`, with the Svelte
// `writable` store replaced by a tiny localStorage-backed module + pub/sub. This
// keeps the service layer framework-agnostic (the migration doc's Phase 1 task:
// "abstract isDemoMode() out of services"). React components subscribe via the
// `useDemoMode` hook (useSyncExternalStore over `subscribeDemoMode`).

const DEMO_MODE_KEY = 'jotter_demo_mode';
const DEMO_DATA_KEY = 'jotter_demo_data';
export const DEMO_USER_ID = 'demo-user-local';

const hasStorage = (): boolean => typeof localStorage !== 'undefined';

let currentDemoMode = hasStorage() ? localStorage.getItem(DEMO_MODE_KEY) === 'true' : false;

const listeners = new Set<() => void>();
function notify(): void {
  for (const l of listeners) l();
}

/** Subscribe to demo-mode changes (for React's useSyncExternalStore). */
export function subscribeDemoMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Synchronous demo-mode flag — the service-layer entry point. */
export function isDemoMode(): boolean {
  return currentDemoMode;
}

/** Set demo mode on/off (persists to localStorage and notifies subscribers). */
export function setDemoMode(value: boolean): void {
  if (hasStorage()) {
    if (value) localStorage.setItem(DEMO_MODE_KEY, 'true');
    else localStorage.removeItem(DEMO_MODE_KEY);
  }
  currentDemoMode = value;
  notify();
}

/** Initialize demo mode, seeding starter data if none exists. */
export function initDemoMode(): void {
  if (!hasStorage()) return;

  setDemoMode(true);

  if (localStorage.getItem(DEMO_DATA_KEY)) return; // preserve existing demo data

  const now = new Date().toISOString();
  const starterCollection: DemoCollection = {
    id: crypto.randomUUID(),
    name: 'My Notes',
    description: 'Your demo collection',
    user_id: DEMO_USER_ID,
    color: '#3B82F6',
    is_default: true,
    sequence: 0,
    created_at: now,
    updated_at: now
  };

  const starterContainer: DemoContainer = {
    id: crypto.randomUUID(),
    title: 'Welcome to Jotter',
    user_id: DEMO_USER_ID,
    collection_id: starterCollection.id,
    sequence: 0,
    created_at: now,
    updated_at: now
  };

  const starterSection: DemoSection = {
    id: crypto.randomUUID(),
    note_container_id: starterContainer.id,
    user_id: DEMO_USER_ID,
    type: 'wysiwyg',
    title: 'Getting Started',
    content:
      "<h2>Welcome to Jotter!</h2><p>This is your demo workspace. Your notes are saved locally in your browser.</p><p><strong>Try it out:</strong></p><ul><li>Create new notes with the + button</li><li>Drag sections to reorder them</li><li>Use code blocks, checklists, and diagrams</li></ul><p>When you're ready, sign in to sync your notes across devices.</p>",
    sequence: 0,
    meta: {},
    checklist_data: null,
    created_at: now,
    updated_at: now
  };

  const demoData: DemoData = {
    collections: [starterCollection],
    containers: [starterContainer],
    sections: [starterSection],
    preferences: {
      id: crypto.randomUUID(),
      user_id: DEMO_USER_ID,
      theme: 'light',
      default_editor: 'wysiwyg',
      auto_save_delay: 2000,
      keyboard_shortcuts: {},
      last_visited_collection_id: starterCollection.id,
      last_visited_container_id: starterContainer.id,
      created_at: now,
      updated_at: now
    },
    meta: { createdAt: now, lastModified: now, version: 1 }
  };

  localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));
}

/** Exit demo mode, optionally clearing the local demo data. */
export function exitDemoMode(clearData = false): void {
  if (!hasStorage()) return;
  setDemoMode(false);
  if (clearData) localStorage.removeItem(DEMO_DATA_KEY);
}

/** Whether any demo data exists in localStorage. */
export function hasDemoData(): boolean {
  return hasStorage() && localStorage.getItem(DEMO_DATA_KEY) !== null;
}

/** Read the raw demo data blob from localStorage. */
export function getDemoData(): DemoData | null {
  if (!hasStorage()) return null;
  const data = localStorage.getItem(DEMO_DATA_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as DemoData;
  } catch (e) {
    console.error('Failed to parse demo data:', e);
    return null;
  }
}

/** Persist the demo data blob (stamps lastModified). */
export function saveDemoData(data: DemoData): void {
  if (!hasStorage()) return;
  data.meta.lastModified = new Date().toISOString();
  localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
}

// ===== Demo data shapes (ported verbatim) =====

export interface DemoData {
  collections: DemoCollection[];
  containers: DemoContainer[];
  sections: DemoSection[];
  preferences: DemoPreferences;
  meta: { createdAt: string; lastModified: string; version: number };
}

export interface DemoCollection {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  color: string;
  is_default: boolean;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface DemoContainer {
  id: string;
  title: string;
  user_id: string;
  collection_id: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface DemoSection {
  id: string;
  note_container_id: string;
  user_id: string;
  type: string;
  title: string | null;
  content: string;
  sequence: number;
  meta: Record<string, unknown>;
  checklist_data: unknown;
  created_at: string;
  updated_at: string;
}

export interface DemoPreferences {
  id: string;
  user_id: string;
  theme: string;
  default_editor: string;
  auto_save_delay: number;
  keyboard_shortcuts: Record<string, unknown>;
  last_visited_collection_id?: string;
  last_visited_container_id?: string;
  created_at: string;
  updated_at: string;
}
