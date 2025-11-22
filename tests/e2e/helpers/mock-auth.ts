import { Page } from '@playwright/test';

/**
 * Mock authentication by injecting Supabase session directly into localStorage
 * This bypasses Google OAuth for faster automated testing
 *
 * To set up:
 * 1. Create a test user in Supabase (can be done via Dashboard or admin API)
 * 2. Get the user's access_token and refresh_token
 * 3. Set environment variables or hardcode for test user
 */

interface MockAuthOptions {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  email?: string;
}

export async function mockAuth(page: Page, options: MockAuthOptions = {}) {
  const mockSession = {
    access_token: options.accessToken || process.env.TEST_ACCESS_TOKEN || 'mock-access-token',
    refresh_token: options.refreshToken || process.env.TEST_REFRESH_TOKEN || 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: options.userId || process.env.TEST_USER_ID || 'mock-user-id',
      email: options.email || process.env.TEST_USER_EMAIL || 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  };

  // Navigate to app first
  await page.goto('/');

  // Inject mock session into Supabase's localStorage format
  const projectRef = process.env.SUPABASE_PROJECT_REF;

  await page.evaluate(({ session, projectRef }) => {
    // Construct the Supabase localStorage key
    // Format: sb-{project-ref}-auth-token
    const supabaseKey = projectRef
      ? `sb-${projectRef}-auth-token`
      : Object.keys(localStorage).find(key =>
          key.startsWith('sb-') && key.endsWith('-auth-token')
        );

    if (supabaseKey) {
      localStorage.setItem(supabaseKey, JSON.stringify(session));
      console.log('✓ Injected auth session into', supabaseKey);
    } else {
      console.error('❌ Could not determine Supabase auth key');
      console.error('Set SUPABASE_PROJECT_REF in .env.test');
    }
  }, { session: mockSession, projectRef });

  // Reload to apply auth
  await page.reload();
  await page.waitForURL('/app/**', { timeout: 5000 }).catch(() => {
    console.warn('Mock auth may not have worked - app did not redirect to /app');
  });
}

/**
 * Get real auth tokens for testing (one-time setup)
 * Run this helper to extract tokens from a real login session
 */
export async function extractRealAuthTokens(page: Page) {
  await page.goto('/app');

  const tokens = await page.evaluate(() => {
    const supabaseKey = Object.keys(localStorage).find(key =>
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );

    if (supabaseKey) {
      const session = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        userId: session.user?.id,
        email: session.user?.email,
      };
    }
    return null;
  });

  console.log('Real auth tokens:', tokens);
  console.log('\nAdd these to your .env.test:');
  console.log(`TEST_ACCESS_TOKEN=${tokens?.accessToken}`);
  console.log(`TEST_REFRESH_TOKEN=${tokens?.refreshToken}`);
  console.log(`TEST_USER_ID=${tokens?.userId}`);
  console.log(`TEST_USER_EMAIL=${tokens?.email}`);

  return tokens;
}
