// Polyfill IndexedDB for unit tests so the offline outbox runs under Node/vitest.
import 'fake-indexeddb/auto';
