import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:5174';
export const AUTH_STATE = path.resolve('playwright/.auth/state.json');

function loadEnvTest() {
  const p = path.resolve('.env.test');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

/**
 * Authenticate the E2E user against the real jotter-dev Supabase project and persist
 * the session as Playwright storage state. We sign in through the app's own
 * `window.__SUPABASE_CLIENT__`, so supabase-js writes the session to localStorage in
 * exactly the format the app reads back.
 */
export default async function globalSetup(_config: FullConfig) {
  loadEnvTest();
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('E2E_EMAIL / E2E_PASSWORD missing (.env.test)');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(BASE_URL + '/');
  await page.waitForFunction(
    () => Boolean((window as unknown as Record<string, unknown>).__SUPABASE_CLIENT__),
    null,
    {
      timeout: 15000
    }
  );

  const error = await page.evaluate(
    async ({ email, password }) => {
      const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    { email, password }
  );
  if (error) throw new Error('E2E sign-in failed: ' + error);

  fs.mkdirSync(path.dirname(AUTH_STATE), { recursive: true });
  await page.context().storageState({ path: AUTH_STATE });
  await browser.close();
}
