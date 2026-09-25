import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['src/**/*.test.ts'], environment: 'node' } },
      {
        // Runs against the jotter-dev Supabase project as the e2e user (see tests/harness.ts;
        // credentials from ../jotter-react/.env.*). Seeds its own data and removes it afterwards.
        test: {
          name: 'integration',
          include: ['tests/**/*.int.test.ts'],
          environment: 'node',
          testTimeout: 30_000,
          hookTimeout: 60_000
        }
      }
    ]
  }
});
