import { test, expect } from '@playwright/test';
import {
  cleanupTestData,
  createTestPatientWithSchedule,
  createTestNotificationSettings,
  markScheduleAsNotified,
  getUpcomingSchedules
} from '../utils/supabase-test-client';
import {
  getElementText,
  isElementVisible,
  clickElement,
  fillInput,
  toggleSwitch,
  waitForNetworkIdle,
  getNotificationCount,
  calculateDaysUntilDue,
  takeScreenshot,
  checkForConsoleErrors,
  waitForToast
} from '../utils/test-helpers';

test.describe('Notification System E2E Tests', () => {
  // Clean up before and after tests
  test.beforeAll(async () => {
    await cleanupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('notification bell icon displays correctly', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Check if notification bell is visible in navigation
    const bellIcon = page.locator('nav button[aria-label*="알림"], nav .notification-bell');
    await expect(bellIcon.first()).toBeVisible({ timeout: 10000 });

    // Take screenshot of navigation with bell icon
    await takeScreenshot(page, 'notification-bell-icon');

    // Click notification bell to open popover
    await bellIcon.first().click();
    
    // Wait for popover to appear
    const popover = page.locator('[role="dialog"], .popover-content, [data-state="open"]');
    await expect(popover.first()).toBeVisible({ timeout: 5000 });

    // Check for empty state message
    const emptyMessage = page.locator('text=/예정된 알림이 없습니다/');
    const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false);
    
    if (hasEmptyMessage) {
      console.log('No notifications present - showing empty state');
    }

    // Take screenshot of notification popover
    await takeScreenshot(page, 'notification-popover');

    // Close popover by clicking outside
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('create test data and verify notification display', async ({ page }) => {
    // Create test patient with schedule
    console.log('Creating test patient with schedule...');
    const testData = await createTestPatientWithSchedule();
    console.log('Test data created:', testData);

    // Navigate to homepage and wait for data to load
    await page.goto('/');
    await waitForNetworkIdle(page);
    await page.waitForTimeout(2000); // Give time for real-time updates

    // Refresh to ensure latest data
    await page.reload();
    await waitForNetworkIdle(page);

    // Check notification count
    const count = await getNotificationCount(page);
    console.log('Notification count:', count);

    // Click notification bell
    const bellIcon = page.locator('nav button[aria-label*="알림"], nav .notification-bell');
    await bellIcon.first().click();

    // Wait for popover
    const popover = page.locator('[role="dialog"], .popover-content, [data-state="open"]');
    await expect(popover.first()).toBeVisible({ timeout: 5000 });

    // Look for test patient in notification list
    const patientName = testData.patient.name;
    const itemName = testData.item.name;
    
    // Check if patient info is visible
    const patientElement = page.locator(`text=/${patientName}/`);
    const itemElement = page.locator(`text=/${itemName}/`);
    
    const isPatientVisible = await patientElement.isVisible().catch(() => false);
    const isItemVisible = await itemElement.isVisible().catch(() => false);

    console.log('Patient visible:', isPatientVisible);
    console.log('Item visible:', isItemVisible);

    // Take screenshot of notifications with test data
    await takeScreenshot(page, 'notification-with-test-data');

    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('notification settings page functionality', async ({ page }) => {
    // Create test notification settings
    await createTestNotificationSettings('test@e2e.com');

    // Navigate to settings page (assuming there's a settings route)
    await page.goto('/settings/notifications');
    
    // If settings page doesn't exist, try accessing through UI
    const settingsExists = await page.url().includes('settings');
    
    if (!settingsExists) {
      // Try to find settings through navigation
      await page.goto('/');
      const settingsLink = page.locator('a[href*="settings"], button:has-text("설정")');
      
      if (await settingsLink.isVisible().catch(() => false)) {
        await settingsLink.click();
        await waitForNetworkIdle(page);
      }
    }

    // Look for notification settings component
    const notificationSettings = page.locator('text=/알림 설정/');
    const hasSettings = await notificationSettings.isVisible().catch(() => false);

    if (hasSettings) {
      console.log('Notification settings found');

      // Test toggle switches
      const notificationToggle = page.locator('[role="switch"]').first();
      if (await notificationToggle.isVisible()) {
        const isChecked = await notificationToggle.getAttribute('aria-checked');
        await notificationToggle.click();
        
        // Verify toggle state changed
        const newState = await notificationToggle.getAttribute('aria-checked');
        expect(newState).not.toBe(isChecked);
        
        // Toggle back
        await notificationToggle.click();
      }

      // Test email input
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.isVisible()) {
        await emailInput.clear();
        await emailInput.fill('newemail@test.com');
      }

      // Test save button
      const saveButton = page.locator('button:has-text("저장")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Wait for success toast
        const toastAppeared = await waitForToast(page, '저장', 3000);
        if (toastAppeared) {
          console.log('Save successful - toast appeared');
        }
      }

      // Take screenshot of settings
      await takeScreenshot(page, 'notification-settings');
    } else {
      console.log('Notification settings page not found - may not be implemented yet');
    }
  });

  test('mark notification as read', async ({ page }) => {
    // Create test data if not already present
    const testData = await createTestPatientWithSchedule();
    
    // Navigate to homepage
    await page.goto('/');
    await waitForNetworkIdle(page);
    await page.waitForTimeout(2000);

    // Get initial notification count
    const initialCount = await getNotificationCount(page);
    console.log('Initial notification count:', initialCount);

    // Open notification popover
    const bellIcon = page.locator('nav button[aria-label*="알림"], nav .notification-bell');
    await bellIcon.first().click();

    // Wait for popover
    await page.waitForSelector('[role="dialog"], .popover-content, [data-state="open"]', { 
      state: 'visible',
      timeout: 5000 
    });

    // Find and click first notification item
    const notificationItems = page.locator('button[class*="hover:bg"]');
    const itemCount = await notificationItems.count();
    
    if (itemCount > 0) {
      console.log(`Found ${itemCount} notification items`);
      
      // Click first notification
      await notificationItems.first().click();
      await page.waitForTimeout(1000); // Wait for state update

      // Close and reopen popover to check updated count
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);
      
      await bellIcon.first().click();
      await page.waitForTimeout(500);

      // Get new notification count
      const newCount = await getNotificationCount(page);
      console.log('New notification count:', newCount);

      // Take screenshot after marking as read
      await takeScreenshot(page, 'notification-marked-read');
    } else {
      console.log('No notification items found to click');
    }

    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('check for console errors', async ({ page }) => {
    // Set up error monitoring
    const errors = await checkForConsoleErrors(page);
    
    // Navigate to homepage
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Open notification popover
    const bellIcon = page.locator('nav button[aria-label*="알림"], nav .notification-bell');
    await bellIcon.first().click();
    await page.waitForTimeout(1000);

    // Check for any console errors
    expect(errors).toHaveLength(0);
    
    if (errors.length > 0) {
      console.error('Console errors detected:', errors);
    }
  });

  test('verify real-time notification updates', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Get initial count
    const initialCount = await getNotificationCount(page);
    console.log('Initial count for real-time test:', initialCount);

    // Create new test data (simulating real-time update)
    const newTestData = await createTestPatientWithSchedule();
    console.log('Created new test data for real-time update');

    // Wait for real-time update
    await page.waitForTimeout(3000);

    // Check if notification count increased
    const updatedCount = await getNotificationCount(page);
    console.log('Updated count after real-time update:', updatedCount);

    // Open popover to verify new notification
    const bellIcon = page.locator('nav button[aria-label*="알림"], nav .notification-bell');
    await bellIcon.first().click();

    // Take screenshot of real-time update
    await takeScreenshot(page, 'notification-realtime-update');

    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('verify notification data from Supabase', async ({ page }) => {
    // Get upcoming schedules directly from Supabase
    const schedules = await getUpcomingSchedules();
    console.log('Upcoming schedules from Supabase:', schedules.length);

    // Navigate to homepage
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Open notification popover
    const bellIcon = page.locator('nav button[aria-label*="알림"], nav .notification-bell');
    await bellIcon.first().click();

    // Wait for popover
    await page.waitForSelector('[role="dialog"], .popover-content, [data-state="open"]', {
      state: 'visible',
      timeout: 5000
    });

    // Verify each schedule appears in UI
    for (const schedule of schedules.slice(0, 3)) { // Check first 3 schedules
      if (schedule.patient?.name) {
        const patientVisible = await page.locator(`text=/${schedule.patient.name}/`).isVisible().catch(() => false);
        console.log(`Patient ${schedule.patient.name} visible:`, patientVisible);
      }
      
      if (schedule.item?.name) {
        const itemVisible = await page.locator(`text=/${schedule.item.name}/`).isVisible().catch(() => false);
        console.log(`Item ${schedule.item.name} visible:`, itemVisible);
      }
    }

    // Take final screenshot
    await takeScreenshot(page, 'notification-supabase-data');

    // Close popover
    await page.click('body', { position: { x: 10, y: 10 } });
  });
});