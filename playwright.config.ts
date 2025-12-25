import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export default defineConfig({
  testDir: './tests/e2e',
  // Disable parallelism to prevent hitting the 12 collection limit
  // Each test file creates its own collection, so serial execution is safer
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests serially to avoid collection limit issues
  reporter: 'html',
  // Run cleanup before tests (set SKIP_CLEANUP=1 to skip when debugging)
  globalSetup: './tests/e2e/global-setup.ts',
  // Increase timeout for tests that create sections and do page reloads
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Mock auth setup (fast, automated)
    {
      name: 'mock-auth-setup',
      testMatch: /auth-mock\.setup\.ts/,
    },
    // Test projects with mock auth
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use mock auth (fast, automated, no manual login required)
        storageState: 'playwright/.auth/mock-user.json',
      },
      dependencies: ['mock-auth-setup'],
    },
    // Note: Real OAuth setup (auth.setup.ts) and chromium-oauth project have been removed
    // from default config. They required manual Google login and aren't suitable for
    // automated testing. The mock auth approach above provides full test coverage.
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
