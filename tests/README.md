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

Tests require a test user account. Set up environment variables:

```bash
# Create .env.test
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
```

Or create a test account in your Supabase project specifically for testing.

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
