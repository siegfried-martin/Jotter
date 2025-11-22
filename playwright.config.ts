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
    // Mock auth setup (default - fast, automated)
    {
      name: 'mock-auth-setup',
      testMatch: /auth-mock\.setup\.ts/,
    },
    // Real OAuth setup (optional - comprehensive but manual)
    {
      name: 'oauth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Test projects with mock auth (default)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use mock auth by default (fast, automated)
        storageState: 'playwright/.auth/mock-user.json',
      },
      dependencies: ['mock-auth-setup'],
    },
    // Test projects with real OAuth (optional, run manually)
    {
      name: 'chromium-oauth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['oauth-setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
