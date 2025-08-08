import { Page, expect } from '@playwright/test';

// Wait for element and get text content
export async function getElementText(page: Page, selector: string): Promise<string> {
  await page.waitForSelector(selector, { timeout: 5000 });
  const element = page.locator(selector);
  return await element.textContent() || '';
}

// Check if element is visible with retry
export async function isElementVisible(page: Page, selector: string, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

// Click element with retry
export async function clickElement(page: Page, selector: string) {
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
  await page.click(selector);
}

// Fill input field
export async function fillInput(page: Page, selector: string, value: string) {
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
  await page.fill(selector, value);
}

// Toggle switch element
export async function toggleSwitch(page: Page, selector: string) {
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
  await page.click(selector);
}

// Wait for network idle
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Network might not be completely idle, but continue
  }
}

// Get notification count from bell icon
export async function getNotificationCount(page: Page): Promise<number> {
  const badge = page.locator('[aria-label*="알림"] .badge, [aria-label*="알림"] + span');
  const isVisible = await badge.isVisible().catch(() => false);
  
  if (!isVisible) {
    return 0;
  }
  
  const text = await badge.textContent() || '0';
  return parseInt(text.replace(/\D/g, ''), 10) || 0;
}

// Format date for display
export function formatDateForDisplay(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  };
  return date.toLocaleDateString('ko-KR', options);
}

// Calculate days until due
export function calculateDaysUntilDue(dueDate: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '내일';
  if (diffDays === 2) return '모레';
  return `${diffDays}일 후`;
}

// Take screenshot with timestamp
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${name}-${timestamp}.png`;
  await page.screenshot({ 
    path: `tests/screenshots/${fileName}`,
    fullPage: false 
  });
  return fileName;
}

// Check for console errors
export async function checkForConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  
  return errors;
}

// Wait for toast notification
export async function waitForToast(page: Page, text?: string, timeout = 5000) {
  const toastSelector = text 
    ? `[role="status"]:has-text("${text}"), [role="alert"]:has-text("${text}")`
    : '[role="status"], [role="alert"]';
  
  try {
    await page.waitForSelector(toastSelector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

// Dismiss toast notification
export async function dismissToast(page: Page) {
  const closeButton = page.locator('[role="status"] button, [role="alert"] button').first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
}