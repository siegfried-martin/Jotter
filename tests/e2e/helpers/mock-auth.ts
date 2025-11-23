import { Page } from '@playwright/test';

/**
 * Mock authentication by injecting real Supabase session
 * Uses TEST_ACCESS_TOKEN and TEST_REFRESH_TOKEN from .env.test
 */

export async function mockAuth(page: Page) {
  const accessToken = process.env.TEST_ACCESS_TOKEN;
  const refreshToken = process.env.TEST_REFRESH_TOKEN;
  const userId = process.env.TEST_USER_ID;
  const userEmail = process.env.TEST_USER_EMAIL;
  const projectRef = process.env.SUPABASE_PROJECT_REF;

  if (!accessToken || !refreshToken) {
    throw new Error('TEST_ACCESS_TOKEN and TEST_REFRESH_TOKEN must be set in .env.test');
  }

  const mockSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: userId || 'test-user-id',
      email: userEmail || 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  };

  // Navigate to app first to initialize page
  await page.goto('/');

  // Inject session into Supabase localStorage
  await page.evaluate(({ session, projectRef }) => {
    const supabaseKey = projectRef
      ? `sb-${projectRef}-auth-token`
      : Object.keys(localStorage).find(key =>
          key.startsWith('sb-') && key.endsWith('-auth-token')
        );

    if (supabaseKey) {
      localStorage.setItem(supabaseKey, JSON.stringify(session));
      console.log('✅ Injected real auth session into', supabaseKey);
    } else {
      console.error('❌ Could not determine Supabase auth key');
    }
  }, { session: mockSession, projectRef });

  // Reload to apply the session
  await page.reload();

  // Wait for redirect to /app (can be /app or /app/something)
  await page.waitForURL(/\/app/, { timeout: 10000 });
  console.log('✅ Mock auth complete - authenticated with real tokens');
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
