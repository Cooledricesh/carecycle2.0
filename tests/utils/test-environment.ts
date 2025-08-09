import { test as baseTest, Page } from '@playwright/test';
import { AuthHelpers } from './auth-helpers';

// Define custom fixture types
type AuthFixtures = {
  authenticatedPage: Page;
  cleanPage: Page;
};

/**
 * Extended test fixtures with authentication utilities
 */
export const test = baseTest.extend<AuthFixtures>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Ensure authentication before running the test
    await AuthHelpers.ensureAuthentication(page);
    await use(page);
  },
  
  // Clean page fixture (no auth required)
  cleanPage: async ({ page }, use) => {
    // Clear any existing auth state for tests that need to start fresh
    await AuthHelpers.clearAuthState(page);
    await use(page);
  }
});

/**
 * Test with authentication required
 * Use this for tests that need a logged-in user
 */
export const authTest = test;

/**
 * Test with no authentication
 * Use this for tests that need to test login flows or public pages
 */
export const noAuthTest = baseTest.extend({
  // Override the storage state for this test
  storageState: async ({}, use) => {
    await use(undefined); // No storage state
  }
});

export { expect } from '@playwright/test';