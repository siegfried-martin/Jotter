import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

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
