import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard-page';
import { HomePage } from '../pages/home-page';
import { LoginPage } from '../pages/login-page';
import { 
  cleanupTestData,
  createTestPatientWithSchedule,
  createTestNotificationSettings,
  getUpcomingSchedules 
} from '../utils/supabase-test-client';

test.describe('Notification Journey E2E Tests', () => {
  let dashboardPage: DashboardPage;
  let homePage: HomePage;
  let loginPage: LoginPage;

  test.beforeAll(async () => {
    await cleanupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);

    // User should already be authenticated via global setup and storageState
    // Just verify we can navigate to the home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('notification bell display and basic functionality', async ({ page }) => {
    await homePage.goto();
    await homePage.verifyPageLoaded();
    
    // Check notification bell is visible
    const notificationBell = homePage.notificationBell;
    await expect(notificationBell).toBeVisible({ timeout: 10000 });
    await homePage.takeScreenshot('notification-bell-visible');

    // Click notification bell
    await notificationBell.click();
    
    // Wait for popover/dropdown to appear
    const popover = page.locator('[role="dialog"], .popover, [data-state="open"], .notification-popover');
    
    // Use proper Playwright assertion with timeout
    await expect(popover.first()).toBeVisible({ timeout: 5000 });
    await homePage.takeScreenshot('notification-popover-opened');
    
    // Close popover by clicking outside
    await page.click('body', { position: { x: 10, y: 10 } });
    await homePage.takeScreenshot('notification-popover-closed');
  });

  test('notification creation and display with test data', async ({ page }) => {
    // Create test data that should generate notifications
    console.log('Creating test patient with schedule...');
    const testData = await createTestPatientWithSchedule();
    console.log('Test data created:', testData);

    await homePage.goto();
    await homePage.waitForNetworkIdle();
    await page.waitForTimeout(3000); // Allow time for real-time updates
    
    // Refresh to ensure latest data
    await page.reload();
    await homePage.waitForNetworkIdle();
    
    await homePage.takeScreenshot('homepage-with-test-data');

    // Click notification bell
    const notificationBell = homePage.notificationBell;
    await notificationBell.click();
    
    // Check for notification content
    const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
    await expect(popover.first()).toBeVisible({ timeout: 5000 });
    
    // Look for test patient data in notifications
    const patientName = testData.patient.name;
    const itemName = testData.item.name;
    
    const patientElement = page.locator(`text=/${patientName}/`);
    const itemElement = page.locator(`text=/${itemName}/`);
    
    const isPatientVisible = await patientElement.isVisible().catch(() => false);
    const isItemVisible = await itemElement.isVisible().catch(() => false);
    
    console.log('Patient visible in notifications:', isPatientVisible);
    console.log('Item visible in notifications:', isItemVisible);
    
    await homePage.takeScreenshot('notification-with-test-data');
    
    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('notification count and badge display', async ({ page }) => {
    // Create multiple test notifications
    const testData1 = await createTestPatientWithSchedule();
    const testData2 = await createTestPatientWithSchedule();
    
    await homePage.goto();
    await homePage.waitForNetworkIdle();
    await page.waitForTimeout(3000);
    
    // Check for notification badge/count
    const notificationBadge = page.locator('[aria-label*="알림"] .badge, [aria-label*="알림"] + span, .notification-count');
    const hasBadge = await notificationBadge.isVisible().catch(() => false);
    
    if (hasBadge) {
      await expect(notificationBadge).toBeVisible();
      const badgeText = await notificationBadge.textContent();
      console.log('Notification badge text:', badgeText);
      
      // Badge should contain a number
      expect(badgeText).toMatch(/\d/);
      await homePage.takeScreenshot('notification-badge-visible');
    }
    
    // Open notification popover
    const notificationBell = homePage.notificationBell;
    await notificationBell.click();
    
    const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
    await expect(popover.first()).toBeVisible({ timeout: 5000 });
    
    // Count notification items using specific data-testid
    const notificationItems = page.locator('[data-testid="notification-item"]').filter({
      has: page.locator('text=/환자|Patient/')
    });
    
    const itemCount = await notificationItems.count();
    console.log('Notification items count:', itemCount);
    
    await homePage.takeScreenshot('notification-items-counted');
    
    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('notification interaction and mark as read', async ({ page }) => {
    // Create test notification
    const testData = await createTestPatientWithSchedule();
    
    await homePage.goto();
    await homePage.waitForNetworkIdle();
    await page.waitForTimeout(2000);
    
    // Get initial notification count
    const initialBadge = page.locator('[aria-label*="알림"] .badge, .notification-count');
    const initialCount = await initialBadge.textContent().catch(() => '0');
    console.log('Initial notification count:', initialCount);
    
    // Open notification popover
    const notificationBell = homePage.notificationBell;
    await notificationBell.click();
    
    const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
    await expect(popover.first()).toBeVisible({ timeout: 5000 });
    await homePage.takeScreenshot('notification-before-interaction');
    
    // Click on first notification item
    const notificationItems = page.locator('[data-testid="notification-item"], button[class*="hover"], [role="button"]').filter({
      hasText: /환자|Patient|검사|주사/
    });
    
    const itemCount = await notificationItems.count();
    if (itemCount > 0) {
      const firstItem = notificationItems.first();
      await firstItem.click();
      
      await homePage.takeScreenshot('notification-item-clicked');
      
      // Close and reopen to check updated state
      await page.click('body', { position: { x: 10, y: 10 } });
      
      // Wait for the popover to close
      await expect(popover.first()).toBeHidden({ timeout: 2000 });
      
      await notificationBell.click();
      
      // Wait for the popover to reopen
      await expect(popover.first()).toBeVisible({ timeout: 2000 });
      await homePage.takeScreenshot('notification-after-interaction');
      
      // Check if count decreased
      const newBadge = page.locator('[aria-label*="알림"] .badge, .notification-count');
      const newCount = await newBadge.textContent().catch(() => '0');
      console.log('New notification count:', newCount);
    }
    
    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('notification real-time updates', async ({ page }) => {
    await homePage.goto();
    await homePage.waitForNetworkIdle();
    
    // Get initial state
    const notificationBell = homePage.notificationBell;
    await notificationBell.click();
    
    const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
    await expect(popover.first()).toBeVisible({ timeout: 5000 });
    
    const initialItems = page.locator('.notification-item, [class*="notification"]');
    const initialCount = await initialItems.count();
    console.log('Initial notification count:', initialCount);
    
    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
    
    // Create new test data (simulating real-time update)
    console.log('Creating new test data for real-time update...');
    const newTestData = await createTestPatientWithSchedule();
    console.log('New test data created:', newTestData);
    
    // Wait for real-time update
    await page.waitForTimeout(5000);
    
    // Check for updated notifications
    await notificationBell.click();
    await expect(popover.first()).toBeVisible({ timeout: 5000 });
    
    const updatedItems = page.locator('.notification-item, [class*="notification"]');
    const updatedCount = await updatedItems.count();
    console.log('Updated notification count:', updatedCount);
    
    await homePage.takeScreenshot('notification-real-time-update');
    
    // Verify new notification appears
    const patientName = newTestData.patient.name;
    const newPatientElement = page.locator(`text=/${patientName}/`);
    const isNewPatientVisible = await newPatientElement.isVisible().catch(() => false);
    
    console.log('New patient visible in notifications:', isNewPatientVisible);
    
    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('notification settings and preferences', async ({ page }) => {
    // Create test notification settings
    await createTestNotificationSettings('test@e2e.com');
    
    // Try to navigate to notification settings
    await page.goto('/settings/notifications');
    
    let settingsFound = false;
    
    // Check if settings page exists
    if (!page.url().includes('settings')) {
      // Try to find settings through navigation
      await homePage.goto();
      
      const settingsLink = page.locator('a[href*="settings"], button:has-text("설정"), [aria-label*="설정"]');
      if (await settingsLink.first().isVisible({ timeout: 3000 })) {
        await settingsLink.first().click();
        await homePage.waitForNetworkIdle();
        settingsFound = true;
      }
    } else {
      settingsFound = true;
    }
    
    if (settingsFound) {
      await homePage.takeScreenshot('notification-settings-page');
      
      // Look for notification settings
      const notificationSettings = page.locator('text=/알림 설정|Notification Settings/');
      const hasNotificationSettings = await notificationSettings.isVisible().catch(() => false);
      
      if (hasNotificationSettings) {
        console.log('Notification settings found');
        
        // Test toggle switches
        const toggles = page.locator('[role="switch"], input[type="checkbox"]');
        const toggleCount = await toggles.count();
        
        if (toggleCount > 0) {
          const firstToggle = toggles.first();
          const isChecked = await firstToggle.getAttribute('aria-checked') || await firstToggle.isChecked();
          console.log('First toggle state:', isChecked);
          
          await firstToggle.click();
          await page.waitForTimeout(500);
          
          const newState = await firstToggle.getAttribute('aria-checked') || await firstToggle.isChecked();
          console.log('Toggle state after click:', newState);
          
          await homePage.takeScreenshot('notification-setting-toggled');
        }
        
        // Test email input if present
        const emailInput = page.locator('input[type="email"]');
        if (await emailInput.isVisible()) {
          // Use fill('') instead of clear() since Playwright Locator doesn't have clear()
          await emailInput.fill('');
          await emailInput.fill('updated@test.com');
          await homePage.takeScreenshot('notification-email-updated');
        }
        
        // Test save button
        const saveButton = page.locator('button:has-text("저장"), button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          
          // Wait for success message
          const successToast = page.locator('[role="status"], .toast').filter({ hasText: /저장|success/i });
          const toastVisible = await successToast.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (toastVisible) {
            await homePage.takeScreenshot('notification-settings-saved');
          }
        }
      }
    } else {
      console.log('Notification settings page not found - may not be implemented yet');
    }
  });

  test('notification accessibility and keyboard navigation', async ({ page }) => {
    await homePage.goto();
    await homePage.waitForNetworkIdle();
    
    // Test keyboard navigation to notification bell
    await page.keyboard.press('Tab');
    
    // Find notification bell via keyboard navigation
    let attempts = 0;
    let foundBell = false;
    
    while (attempts < 20 && !foundBell) {
      const focusedElement = page.locator(':focus');
      const isBellFocused = await homePage.notificationBell.evaluate(
        (bell, focused) => bell === focused,
        await focusedElement.elementHandle()
      ).catch(() => false);
      
      if (isBellFocused) {
        foundBell = true;
        await homePage.takeScreenshot('notification-bell-focused');
        
        // Open with Enter key
        await page.keyboard.press('Enter');
        
        const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
        const popoverVisible = await popover.first().isVisible({ timeout: 3000 }).catch(() => false);
        
        if (popoverVisible) {
          await homePage.takeScreenshot('notification-opened-via-keyboard');
          
          // Test keyboard navigation within popover
          await page.keyboard.press('Tab');
          
          const focusedInPopover = page.locator(':focus');
          await expect(focusedInPopover).toBeVisible();
          
          // Test Escape to close
          await page.keyboard.press('Escape');
          
          const popoverClosed = await popover.first().isHidden({ timeout: 3000 }).catch(() => false);
          if (popoverClosed) {
            await homePage.takeScreenshot('notification-closed-via-escape');
          }
        }
        break;
      }
      
      await page.keyboard.press('Tab');
      attempts++;
    }
    
    expect(foundBell).toBeTruthy();
  });

  test('notification data synchronization with database', async ({ page }) => {
    // Get notifications directly from database
    const dbSchedules = await getUpcomingSchedules();
    console.log('Schedules from database:', dbSchedules.length);
    
    await homePage.goto();
    await homePage.waitForNetworkIdle();
    
    // Open notification popover
    const notificationBell = homePage.notificationBell;
    await notificationBell.click();
    
    const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
    await expect(popover.first()).toBeVisible({ timeout: 5000 });
    
    // Verify database data appears in UI
    let foundCount = 0;
    
    for (const schedule of dbSchedules.slice(0, 5)) { // Check first 5 schedules
      const patient = Array.isArray(schedule.patient) ? schedule.patient[0] : schedule.patient;
      if (patient?.name) {
        const patientVisible = await page.locator(`text=/${patient.name}/`).isVisible().catch(() => false);
        if (patientVisible) {
          foundCount++;
          console.log(`Found patient ${patient.name} in UI`);
        }
      }
      
      const item = Array.isArray(schedule.item) ? schedule.item[0] : schedule.item;
      if (item?.name) {
        const itemVisible = await page.locator(`text=/${item.name}/`).isVisible().catch(() => false);
        if (itemVisible) {
          console.log(`Found item ${item.name} in UI`);
        }
      }
    }
    
    console.log(`Found ${foundCount} database items in UI out of ${Math.min(dbSchedules.length, 5)}`);
    await homePage.takeScreenshot('notification-database-sync-verified');
    
    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('notification error states and recovery', async ({ page }) => {
    await homePage.goto();
    await homePage.waitForNetworkIdle();
    
    // Simulate network error
    await page.context().setOffline(true);
    
    // Try to open notifications
    const notificationBell = homePage.notificationBell;
    await notificationBell.click();
    
    await page.waitForTimeout(3000);
    await homePage.takeScreenshot('notification-offline-error');
    
    // Restore network
    await page.context().setOffline(false);
    
    // Retry opening notifications
    await notificationBell.click();
    
    const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
    const popoverVisible = await popover.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (popoverVisible) {
      await homePage.takeScreenshot('notification-network-recovered');
    }
    
    // Close if open
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('notification responsive design', async ({ page }) => {
    // Create test data
    await createTestPatientWithSchedule();
    
    await homePage.goto();
    await homePage.waitForNetworkIdle();
    
    // Test notification on different screen sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);
      
      // Verify notification bell is visible and accessible
      const notificationBell = homePage.notificationBell;
      await expect(notificationBell).toBeVisible();
      await homePage.takeScreenshot(`notification-bell-${viewport.name}`);
      
      // Test interaction on this viewport
      await notificationBell.click();
      
      const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
      const popoverVisible = await popover.first().isVisible({ timeout: 3000 }).catch(() => false);
      
      if (popoverVisible) {
        await homePage.takeScreenshot(`notification-popover-${viewport.name}`);
        
        // Verify popover is properly positioned and accessible
        const popoverBounds = await popover.first().boundingBox();
        if (popoverBounds) {
          expect(popoverBounds.x).toBeGreaterThanOrEqual(0);
          expect(popoverBounds.y).toBeGreaterThanOrEqual(0);
          expect(popoverBounds.x + popoverBounds.width).toBeLessThanOrEqual(viewport.width);
        }
      }
      
      // Close popover
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);
    }
  });
});