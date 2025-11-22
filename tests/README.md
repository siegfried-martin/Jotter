# Jotter Testing

## Setup

### Install Playwright (Already Done)
```bash
npm install -D @playwright/test
npx playwright install
```

### Install Browser Dependencies (WSL/Linux)
```bash
sudo npx playwright install-deps
```

Or manually:
```bash
sudo apt-get install libnspr4 libnss3 libasound2t64
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (helpful for debugging)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/smoke.spec.ts
```

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests
│   ├── helpers/           # Test utilities and helpers
│   │   └── auth.ts        # Authentication helpers
│   ├── smoke.spec.ts      # Basic smoke tests
│   └── container-drag-drop.spec.ts  # Container DnD regression test
└── README.md              # This file
```

## Authentication for Tests

The app uses **Google OAuth**, but tests support two authentication modes:

### Mode 1: Mock Auth (Default - Fast & Automated) ⚡

Perfect for AI agents and rapid development. No manual login required!

**First Time Setup:**
1. Log in to your app manually once
2. Extract real auth tokens:
   ```bash
   npx playwright test tests/e2e/extract-tokens.spec.ts --headed
   ```
3. Copy the tokens to `.env.test`:
   ```bash
   TEST_ACCESS_TOKEN=eyJhbGc...
   TEST_REFRESH_TOKEN=v2_abc...
   TEST_USER_ID=uuid-here
   TEST_USER_EMAIL=your-email@example.com
   ```
4. Run tests normally:
   ```bash
   npm run test:e2e
   ```

Tests will inject these tokens and run fully automated!

### Mode 2: Real OAuth (Optional - Comprehensive) 🔐

For end-to-end validation including the full OAuth flow.

**Setup:**
```bash
npx playwright test --project=oauth-setup --headed
```

Complete Google OAuth manually, then run:
```bash
npx playwright test --project=chromium-oauth
```

**When to use:**
- Mock auth: Daily development, AI agents, CI/CD
- Real OAuth: Final validation, security testing

## Writing Tests

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/app/feature');
    await expect(page.locator('.element')).toBeVisible();
  });
});
```

## Coverage Goals

- [ ] Authentication flows
- [ ] Collection CRUD operations
- [ ] Container CRUD operations
- [ ] Container drag & drop (BUG-DRAG-001 regression test)
- [ ] Section CRUD operations
- [ ] Section drag & drop
- [ ] Checklist checkbox persistence (BUG-CHECKBOX-001 regression test)
- [ ] All editor types (code, rich text, diagram, checklist)

## CI/CD Integration

Tests are configured to run in CI with the `test` script:
```bash
npm test  # Runs both unit tests and E2E tests
```
