import { defineConfig, devices } from '@playwright/test';
import { AUTH_STATE } from './tests/global-setup';

// E2E runs against the REAL jotter-dev Supabase project (authenticated), so DB-layer
// issues — RLS, foreign keys, triggers, grants — actually surface. Demo mode is only
// covered by a separate smoke test since it never touches Supabase.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1, // shared dev DB — keep serial to avoid cross-test data races for now
  retries: 0,
  reporter: 'list',
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5174',
    storageState: AUTH_STATE,
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
