import { test, expect } from '@playwright/test';

test('Homepage renders and has navigation links', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveTitle(/CareCycle/i);

  // Check for key links exposed on the landing page
  const hrefs = ['/patients/register', '/schedule', '/dashboard'];
  for (const href of hrefs) {
    const candidate = page.locator(`a[href="${href}"]`);
    const count = await candidate.count();
    expect(count).toBeGreaterThan(0);
  }
});


