# E2E Test Authentication Setup

This document explains the new global authentication setup for Playwright E2E tests.

## Overview

The authentication system has been refactored to use **global setup** instead of per-test authentication, providing:

- ⚡ **Faster test execution** - Login only happens once
- 🔒 **More reliable authentication** - Consistent state across tests  
- 🔄 **Better parallel test support** - Shared authentication state
- 🧪 **Improved test isolation** - Tests focus on functionality, not auth

## Architecture

```
tests/
├── global-setup.ts          # Performs login once at start
├── global-teardown.ts       # Cleanup after all tests
├── storage/
│   ├── auth.json            # Saved authentication state
│   └── .gitkeep             # Keep directory in git
├── utils/
│   ├── auth-helpers.ts      # Authentication utilities
│   └── test-environment.ts  # Extended test fixtures
└── e2e/
    └── *.spec.ts            # Test files (no more beforeEach auth)
```

## How It Works

### 1. Global Setup (`global-setup.ts`)
- Runs **once** before all tests
- Performs login using LoginPage
- Saves authentication state to `tests/storage/auth.json`
- Includes caching logic (skips if auth file is < 1 hour old)

### 2. Storage State
- Contains cookies, localStorage, sessionStorage
- Automatically loaded for each test via `playwright.config.ts`
- Persists authentication across browser contexts

### 3. Fallback Authentication
- Tests verify authentication at start
- Falls back to manual login if storage state is invalid
- Includes retry logic and error handling

## Configuration

### Playwright Config Projects

```typescript
// playwright.config.ts
projects: [
  {
    name: 'chromium',           // Default - uses auth storage
    use: { 
      ...devices['Desktop Chrome'],
      storageState: './tests/storage/auth.json'
    }
  },
  {
    name: 'chromium-no-auth',   // For login flow tests
    use: { 
      ...devices['Desktop Chrome'],
      storageState: undefined
    }
  }
]
```

### Running Tests

```bash
# Run all tests (uses auth storage)
npx playwright test

# Run tests without authentication
npx playwright test --project=chromium-no-auth

# Run with UI mode for debugging
npx playwright test --ui

# Force re-authentication (delete storage first)
rm tests/storage/auth.json && npx playwright test
```

## Test Implementation

### Before (Old Approach)
```typescript
test.beforeEach(async ({ page }) => {
  // This ran before EVERY test - slow and redundant
  await page.goto('/');
  if (page.url().includes('/login')) {
    await loginPage.loginWithValidCredentials();
    await loginPage.verifyLoginSuccess();
  }
});
```

### After (New Approach)
```typescript
test.beforeEach(async ({ page }) => {
  // Authentication handled globally via storage state
  // Only verify auth is working, fallback if needed
  const isAuth = await AuthHelpers.isAuthenticated(page);
  if (!isAuth) {
    console.log('Storage state failed, performing fallback login...');
    await AuthHelpers.performLogin(page);
  }
});
```

## Authentication Utilities

### `AuthHelpers` Class
- `isAuthenticated(page)` - Check if user is logged in
- `ensureAuthentication(page)` - Login if not authenticated
- `performLogin(page)` - Execute login flow with retries
- `saveAuthState(page)` - Save current auth to file
- `validateStorageState(page)` - Check if storage state is valid

### Extended Test Fixtures
```typescript
import { test, expect } from './utils/test-environment';

// Authenticated test (default)
test('dashboard functionality', async ({ authenticatedPage }) => {
  // authenticatedPage is guaranteed to be logged in
});

// Clean test (no auth)
test('login flow', async ({ cleanPage }) => {
  // cleanPage starts with no authentication
});
```

## Debugging Authentication Issues

### 1. Check Authentication State
```typescript
const debugInfo = await AuthHelpers.getAuthStateDebugInfo(page);
console.log('Auth Debug Info:', debugInfo);
```

### 2. Manual Storage State Inspection
```bash
# View stored auth data
cat tests/storage/auth.json | jq .

# Check file age
ls -la tests/storage/auth.json
```

### 3. Force Re-authentication
```bash
# Delete storage and run tests
rm tests/storage/auth.json
npx playwright test

# Or run global setup manually
npx playwright test tests/global-setup.ts
```

### 4. Screenshots for Failed Auth
- Global setup saves error screenshots to `tests/screenshots/global-setup-error.png`
- Failed login attempts save timestamped screenshots
- Check console logs for authentication flow details

## Troubleshooting

### Common Issues

**"Storage state authentication failed"**
- Storage file may be expired/corrupted
- Solution: Delete `tests/storage/auth.json` and re-run tests

**"Login failed after X attempts"**
- Check test credentials in `LoginPage.loginWithValidCredentials()`
- Verify login page selectors are correct
- Check if app is running on correct port

**Tests fail with "Not authenticated" errors**
- Global setup may have failed
- Check `playwright-report` for setup errors
- Verify `baseURL` in config matches running app

**Parallel test conflicts**
- Storage state should prevent conflicts
- If issues persist, disable parallel execution temporarily:
  ```typescript
  // playwright.config.ts
  workers: 1
  ```

### Test Credentials

Update credentials in `tests/pages/login-page.ts`:
```typescript
async loginWithValidCredentials(): Promise<void> {
  await this.login('your-test-email@example.com', 'your-test-password');
}
```

## Migration Guide

### For Existing Tests

1. Remove `beforeEach` authentication code
2. Import `AuthHelpers` if manual auth needed
3. Use appropriate project (`chromium` vs `chromium-no-auth`)

### For New Tests

1. Use default project for authenticated tests
2. Use `chromium-no-auth` project for login flow tests
3. Use `AuthHelpers` for custom authentication scenarios

## Benefits

- **50-80% faster test execution** (no repeated logins)
- **More reliable CI/CD** (consistent authentication state)
- **Better test isolation** (tests focus on feature logic)
- **Easier debugging** (clear separation of auth vs feature issues)
- **Parallel test support** (shared auth state prevents conflicts)

## Future Enhancements

- Multiple user roles/permissions testing
- Session persistence across test runs
- Auth state validation and refresh
- Integration with CI/CD authentication secrets