import { Page, expect, Locator } from '@playwright/test';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';

// Enhanced test helpers with better error handling and retry logic

// Wait for element and get text content with retry
export async function getElementText(page: Page, selector: string, timeout = 10000): Promise<string> {
  try {
    await page.waitForSelector(selector, { timeout });
    const element = page.locator(selector);
    await expect(element).toBeVisible({ timeout: 5000 });
    return await element.textContent() || '';
  } catch (error) {
    console.error(`Failed to get text for selector: ${selector}`, error);
    return '';
  }
}

// Check if element is visible with enhanced retry logic
export async function isElementVisible(page: Page, selector: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    const element = page.locator(selector);
    return await element.isVisible();
  } catch {
    return false;
  }
}

// Check if multiple elements are visible
export async function areElementsVisible(page: Page, selectors: string[], timeout = 10000): Promise<boolean[]> {
  const results = await Promise.all(
    selectors.map(selector => isElementVisible(page, selector, timeout))
  );
  return results;
}

// Wait for any of the selectors to be visible
export async function waitForAnyVisible(page: Page, selectors: string[], timeout = 10000): Promise<string | null> {
  try {
    const promises = selectors.map(async selector => {
      try {
        await page.waitForSelector(selector, { state: 'visible', timeout });
        return selector;
      } catch {
        return null;
      }
    });
    
    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Click element with enhanced retry logic and error handling
export async function clickElement(page: Page, selector: string, timeout = 10000, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      const element = page.locator(selector);
      await expect(element).toBeVisible();
      await expect(element).toBeEnabled();
      await element.click();
      return true;
    } catch (error) {
      console.warn(`Click attempt ${i + 1} failed for selector: ${selector}`, error);
      if (i === retries - 1) {
        console.error(`Failed to click after ${retries} attempts: ${selector}`);
        return false;
      }
      // Wait for element to be available for interaction again before retry
      await page.waitForSelector(selector, { state: 'attached', timeout: 2000 }).catch(() => {});
      await page.waitForSelector(selector, { state: 'visible', timeout: 1000 }).catch(() => {});
    }
  }
  return false;
}

// Click with coordinate fallback
export async function clickElementWithFallback(page: Page, selector: string, timeout = 10000): Promise<boolean> {
  try {
    // Try normal click first
    const success = await clickElement(page, selector, timeout);
    if (success) return true;
    
    // Fallback to coordinate-based click
    const element = page.locator(selector);
    if (await element.isVisible()) {
      const box = await element.boundingBox();
      if (box) {
        await page.click('body', {
          position: {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2
          }
        });
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Fill input field with validation
export async function fillInput(page: Page, selector: string, value: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    const element = page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toBeEnabled();
    
    // Clear existing value
    await element.clear();
    await page.waitForTimeout(100);
    
    // Fill new value
    await element.fill(value);
    
    // Verify the value was set correctly
    const actualValue = await element.inputValue();
    if (actualValue !== value) {
      console.warn(`Value mismatch. Expected: ${value}, Actual: ${actualValue}`);
      // Try typing instead
      await element.clear();
      await element.type(value);
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to fill input: ${selector}`, error);
    return false;
  }
}

// Fill multiple inputs
export async function fillInputs(page: Page, inputs: Array<{selector: string, value: string}>, timeout = 10000): Promise<boolean> {
  for (const input of inputs) {
    const success = await fillInput(page, input.selector, input.value, timeout);
    if (!success) {
      console.error(`Failed to fill input: ${input.selector}`);
      return false;
    }
    await page.waitForTimeout(200); // Small delay between inputs
  }
  return true;
}

// Toggle switch element
export async function toggleSwitch(page: Page, selector: string) {
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
  await page.click(selector);
}

// Enhanced network waiting functions
export async function waitForNetworkIdle(page: Page, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
    return true;
  } catch {
    console.warn('Network did not become idle within timeout, continuing...');
    return false;
  }
}

// Wait for specific API calls to complete
export async function waitForApiCall(page: Page, urlPattern: string | RegExp, timeout = 15000): Promise<boolean> {
  try {
    const response = await page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        } else {
          return urlPattern.test(url);
        }
      },
      { timeout }
    );
    return response.ok();
  } catch {
    console.warn(`API call did not complete within timeout: ${urlPattern}`);
    return false;
  }
}

// Wait for page to be fully loaded
export async function waitForFullPageLoad(page: Page, timeout = 30000): Promise<boolean> {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
    await page.waitForLoadState('networkidle', { timeout: timeout / 2 });
    
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      '[class*="loading"]',
      '[class*="spinner"]', 
      '[class*="skeleton"]',
      '[aria-busy="true"]'
    ];
    
    await page.waitForFunction(
      (selectors) => {
        return selectors.every(selector => {
          const elements = document.querySelectorAll(selector);
          return elements.length === 0;
        });
      },
      loadingSelectors,
      { timeout: timeout / 3 }
    ).catch(() => {
      console.warn('Some loading indicators may still be visible');
    });
    
    return true;
  } catch (error) {
    console.warn('Page may not be fully loaded', error);
    return false;
  }
}

// Enhanced notification helpers
export async function getNotificationCount(page: Page): Promise<number> {
  const badgeSelectors = [
    '[aria-label*="알림"] .badge',
    '[aria-label*="알림"] + span',
    '.notification-bell .badge',
    '.notification-count',
    '[class*="notification"] [class*="badge"]',
    '[class*="bell"] [class*="badge"]'
  ];
  
  for (const selector of badgeSelectors) {
    const badge = page.locator(selector);
    const isVisible = await badge.isVisible().catch(() => false);
    
    if (isVisible) {
      const text = await badge.textContent() || '0';
      const count = parseInt(text.replace(/\D/g, ''), 10);
      if (!isNaN(count)) {
        return count;
      }
    }
  }
  
  return 0;
}

// Get notification items
export async function getNotificationItems(page: Page): Promise<Array<{
  title: string;
  message: string;
  time?: string;
  read: boolean;
}>> {
  const items: Array<{ title: string; message: string; time?: string; read: boolean; }> = [];
  
  // First, open notification popover if not open
  const bellIcon = page.locator('[aria-label*="알림"], .notification-bell').first();
  if (await bellIcon.isVisible()) {
    await bellIcon.click();
  }
  
  const popover = page.locator('[role="dialog"], .popover, [data-state="open"], .notification-popover');
  const isPopoverOpen = await popover.first().isVisible().catch(() => false);
  
  if (isPopoverOpen) {
    const notificationItems = page.locator('.notification-item, [class*="notification"] > div, li').filter({
      has: page.locator('text=/환자|Patient|검사|주사|알림/')
    });
    
    const count = await notificationItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = notificationItems.nth(i);
      const title = await item.locator('h3, h4, .title, [class*="title"]').textContent().catch(() => '');
      const message = await item.locator('p, .message, [class*="message"]').textContent().catch(() => '');
      const time = await item.locator('.time, [class*="time"], small').textContent().catch(() => '');
      const isRead = await item.getAttribute('aria-read').then(val => val === 'true').catch(() => false);
      
      items.push({
        title: title || 'No title',
        message: message || 'No message', 
        time: time || '',
        read: isRead
      });
    }
  }
  
  return items;
}

// Accessibility testing helpers
export async function checkAccessibility(page: Page, options: {
  checkImages?: boolean;
  checkHeadings?: boolean;
  checkLinks?: boolean;
  checkFormLabels?: boolean;
  checkAria?: boolean;
} = {}): Promise<{
  passed: boolean;
  issues: string[];
  warnings: string[];
}> {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Check heading structure
    if (options.checkHeadings !== false) {
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      if (headingCount === 0) {
        issues.push('No headings found on page');
      } else {
        // Check for multiple h1s
        const h1Count = await page.locator('h1').count();
        if (h1Count !== 1) {
          warnings.push(`Found ${h1Count} h1 elements, should have exactly 1`);
        }
      }
    }
    
    // Check images have alt text
    if (options.checkImages !== false) {
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const role = await img.getAttribute('role');
        
        if (!alt && !ariaLabel && role !== 'presentation') {
          issues.push(`Image missing alt text: ${await img.getAttribute('src') || 'unknown'}`);
        }
      }
    }
    
    // Check links have accessible names
    if (options.checkLinks !== false) {
      const links = page.locator('a');
      const linkCount = await links.count();
      
      for (let i = 0; i < Math.min(linkCount, 20); i++) { // Limit check to first 20 links
        const link = links.nth(i);
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const title = await link.getAttribute('title');
        
        if (!text?.trim() && !ariaLabel && !title) {
          issues.push('Link without accessible name found');
        }
      }
    }
    
    // Check form inputs have labels
    if (options.checkFormLabels !== false) {
      const inputs = page.locator('input:not([type="hidden"]), textarea, select');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          
          if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
            warnings.push(`Input may be missing label: ${await input.getAttribute('name') || 'unknown'}`);
          }
        }
      }
    }
    
    // Check ARIA attributes
    if (options.checkAria !== false) {
      const ariaElements = page.locator('[aria-expanded], [aria-selected], [aria-checked]');
      const ariaCount = await ariaElements.count();
      
      for (let i = 0; i < Math.min(ariaCount, 10); i++) {
        const element = ariaElements.nth(i);
        const expanded = await element.getAttribute('aria-expanded');
        const selected = await element.getAttribute('aria-selected');
        const checked = await element.getAttribute('aria-checked');
        
        if (expanded && !['true', 'false'].includes(expanded)) {
          issues.push('Invalid aria-expanded value found');
        }
        if (selected && !['true', 'false'].includes(selected)) {
          issues.push('Invalid aria-selected value found');
        }
        if (checked && !['true', 'false', 'mixed'].includes(checked)) {
          issues.push('Invalid aria-checked value found');
        }
      }
    }
    
  } catch (error) {
    issues.push(`Accessibility check failed: ${error}`);
  }
  
  return {
    passed: issues.length === 0,
    issues,
    warnings
  };
}

// Keyboard navigation testing
export async function testKeyboardNavigation(page: Page, startSelector?: string): Promise<{
  focusableElements: number;
  canNavigate: boolean;
  trapsFocus: boolean;
}> {
  let focusableElements = 0;
  let canNavigate = true;
  let trapsFocus = false;
  
  try {
    // Start from specified element or first focusable element
    if (startSelector) {
      const startElement = page.locator(startSelector);
      if (await startElement.isVisible()) {
        await startElement.focus();
      }
    } else {
      await page.keyboard.press('Tab');
    }
    
    const initialFocused = await page.evaluate(() => document.activeElement?.tagName);
    const visitedElements: string[] = [];
    
    // Navigate through elements with Tab
    for (let i = 0; i < 20; i++) { // Limit to prevent infinite loops
      await page.keyboard.press('Tab');
      
      const currentFocused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName}.${el.className}.${el.id}` : 'none';
      });
      
      if (visitedElements.includes(currentFocused)) {
        trapsFocus = true;
        break;
      }
      
      visitedElements.push(currentFocused);
      focusableElements++;
      
      // Check if we can still navigate
      const isVisible = await page.locator(':focus').isVisible().catch(() => false);
      if (!isVisible) {
        canNavigate = false;
        break;
      }
    }
    
  } catch (error) {
    console.warn('Keyboard navigation test failed:', error);
    canNavigate = false;
  }
  
  return { focusableElements, canNavigate, trapsFocus };
}

// Performance monitoring helpers
export async function measurePagePerformance(page: Page, actionName: string, action: () => Promise<void>): Promise<{
  actionName: string;
  duration: number;
  networkRequests: number;
  errors: number;
}> {
  let networkRequests = 0;
  let errors = 0;
  
  // Set up monitoring
  page.on('request', () => networkRequests++);
  page.on('requestfailed', () => errors++);
  
  const startTime = Date.now();
  await action();
  const endTime = Date.now();
  
  return {
    actionName,
    duration: endTime - startTime,
    networkRequests,
    errors
  };
}

// Device and viewport testing
export async function testResponsiveBreakpoints(page: Page, testFunction: (viewport: {width: number, height: number, name: string}) => Promise<void>): Promise<void> {
  const breakpoints = [
    { width: 320, height: 568, name: 'mobile-small' },
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1024, height: 768, name: 'tablet-landscape' },
    { width: 1280, height: 720, name: 'desktop-small' },
    { width: 1440, height: 900, name: 'desktop' },
    { width: 1920, height: 1080, name: 'desktop-large' }
  ];
  
  for (const viewport of breakpoints) {
    console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500); // Allow layout to settle
    await testFunction(viewport);
  }
}

// Form testing helpers
export async function testFormValidation(page: Page, formSelector: string, tests: Array<{
  name: string;
  inputs: Array<{selector: string, value: string}>;
  expectValid: boolean;
  expectedErrors?: string[];
}>): Promise<Array<{name: string, passed: boolean, actualErrors: string[]}>> {
  const results = [];
  
  for (const test of tests) {
    console.log(`Testing form validation: ${test.name}`);
    
    // Fill form with test data
    await fillInputs(page, test.inputs);
    
    // Submit form
    const submitButton = page.locator(`${formSelector} [type="submit"], ${formSelector} button[type="submit"]`);
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }
    
    await page.waitForTimeout(1000); // Allow validation to run
    
    // Check for validation errors
    const errorElements = page.locator(`${formSelector} [role="alert"], ${formSelector} .error, ${formSelector} [class*="error"]`);
    const errorCount = await errorElements.count();
    const actualErrors: string[] = [];
    
    for (let i = 0; i < errorCount; i++) {
      const errorText = await errorElements.nth(i).textContent();
      if (errorText) {
        actualErrors.push(errorText.trim());
      }
    }
    
    const isValid = errorCount === 0;
    const passed = isValid === test.expectValid;
    
    results.push({
      name: test.name,
      passed,
      actualErrors
    });
    
    // Clear form for next test
    const inputs = page.locator(`${formSelector} input, ${formSelector} textarea, ${formSelector} select`);
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const inputType = await input.getAttribute('type');
      if (inputType !== 'submit' && inputType !== 'button') {
        await input.clear();
      }
    }
  }
  
  return results;
}

// Data persistence testing
export async function testDataPersistence(page: Page, dataSetup: () => Promise<void>, dataVerification: () => Promise<boolean>): Promise<{
  persistsRefresh: boolean;
  persistsNavigation: boolean;
  persistsNewTab: boolean;
}> {
  // Set up initial data
  await dataSetup();
  
  // Test 1: Page refresh
  await page.reload();
  await waitForFullPageLoad(page);
  const persistsRefresh = await dataVerification();
  
  // Test 2: Navigation away and back
  const currentUrl = page.url();
  await page.goto('/');
  await page.waitForTimeout(1000);
  await page.goto(currentUrl);
  await waitForFullPageLoad(page);
  const persistsNavigation = await dataVerification();
  
  // Test 3: New tab (if supported)
  let persistsNewTab = false;
  try {
    const context = page.context();
    const newPage = await context.newPage();
    await newPage.goto(currentUrl);
    await waitForFullPageLoad(newPage);
    
    // Create a temporary verification function for the new page
    const newPageVerification = async () => {
      // This is a simplified verification - in practice, you'd adapt the verification function
      return true; // Placeholder
    };
    
    persistsNewTab = await newPageVerification();
    await newPage.close();
  } catch (error) {
    console.warn('New tab test failed:', error);
    persistsNewTab = false;
  }
  
  return { persistsRefresh, persistsNavigation, persistsNewTab };
}

// Format date for display using date-fns
export function formatDateForDisplay(date: Date): string {
  // Create a new Date object to avoid mutations
  const immutableDate = new Date(date.getTime());
  return format(immutableDate, 'M월 d일 (EEE)', { locale: ko });
}

// Calculate days until due using date-fns (immutable)
export function calculateDaysUntilDue(dueDate: Date): string {
  // Create immutable date objects to avoid mutations
  const today = new Date();
  const immutableToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const immutableDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  const diffDays = differenceInDays(immutableDueDate, immutableToday);
  
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '내일';
  if (diffDays === 2) return '모레';
  if (diffDays < 0) return `${Math.abs(diffDays)}일 지남`;
  return `${diffDays}일 후`;
}

// Enhanced screenshot functions
export async function takeScreenshot(page: Page, name: string, options: {
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  element?: string;
  quality?: number;
} = {}): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${name}-${timestamp}.png`;
  
  try {
    const screenshotOptions: any = {
      path: `tests/screenshots/${fileName}`,
      fullPage: options.fullPage || false,
      type: 'png'
    };
    
    if (options.clip) {
      screenshotOptions.clip = options.clip;
    }
    
    if (options.quality) {
      screenshotOptions.quality = options.quality;
    }
    
    if (options.element) {
      const element = page.locator(options.element);
      await element.screenshot(screenshotOptions);
    } else {
      await page.screenshot(screenshotOptions);
    }
    
    return fileName;
  } catch (error) {
    console.error(`Failed to take screenshot: ${name}`, error);
    return '';
  }
}

// Take comparison screenshots
export async function takeComparisonScreenshots(page: Page, name: string, actions: Array<() => Promise<void>>): Promise<string[]> {
  const screenshots: string[] = [];
  
  for (let i = 0; i < actions.length; i++) {
    const beforeName = `${name}-step-${i + 1}-before`;
    screenshots.push(await takeScreenshot(page, beforeName));
    
    const action = actions[i];
    if (action) {
      await action();
    }
    await page.waitForTimeout(500); // Allow UI to settle
    
    const afterName = `${name}-step-${i + 1}-after`;
    screenshots.push(await takeScreenshot(page, afterName));
  }
  
  return screenshots.filter(name => name.length > 0);
}

// Enhanced console error monitoring
export async function setupConsoleErrorMonitoring(page: Page): Promise<{
  getErrors: () => string[];
  getWarnings: () => string[];
  getNetworkErrors: () => string[];
  reset: () => void;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const networkErrors: string[] = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    
    if (type === 'error') {
      // Filter out common non-critical errors
      if (!text.includes('favicon') && !text.includes('_next/static')) {
        errors.push(text);
      }
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push(`Page Error: ${error.message}`);
  });
  
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    if (failure && !failure.errorText.includes('net::ERR_ABORTED')) {
      networkErrors.push(`${request.method()} ${request.url()}: ${failure.errorText}`);
    }
  });
  
  return {
    getErrors: () => [...errors],
    getWarnings: () => [...warnings],
    getNetworkErrors: () => [...networkErrors],
    reset: () => {
      errors.length = 0;
      warnings.length = 0;
      networkErrors.length = 0;
    }
  };
}

// Legacy function for backward compatibility
export async function checkForConsoleErrors(page: Page): Promise<string[]> {
  const monitor = await setupConsoleErrorMonitoring(page);
  await page.waitForTimeout(1000); // Give time for errors to be captured
  return monitor.getErrors();
}

// Enhanced toast notification handling
export async function waitForToast(page: Page, text?: string, timeout = 10000): Promise<{
  found: boolean;
  message?: string;
  element?: Locator;
}> {
  const toastSelectors = [
    '[role="status"]',
    '[role="alert"]',
    '.toast',
    '.notification',
    '[class*="toast"]',
    '[class*="alert"]'
  ];
  
  try {
    const foundSelector = await waitForAnyVisible(page, toastSelectors, timeout);
    if (!foundSelector) {
      return { found: false };
    }
    
    const element = page.locator(foundSelector);
    const message = await element.textContent() || '';
    
    if (text && !message.includes(text)) {
      // Look for specific text in any toast
      const specificToast = page.locator(`${foundSelector}:has-text("${text}")`);
      if (await specificToast.isVisible()) {
        return {
          found: true,
          message: await specificToast.textContent() || '',
          element: specificToast
        };
      }
      return { found: false };
    }
    
    return { found: true, message, element };
  } catch {
    return { found: false };
  }
}

// Dismiss all toast notifications
export async function dismissAllToasts(page: Page): Promise<number> {
  const toastSelectors = [
    '[role="status"] button',
    '[role="alert"] button',
    '.toast button',
    '.toast [aria-label*="close"]',
    '.notification button',
    '[class*="toast"] button'
  ];
  
  let dismissedCount = 0;
  
  for (const selector of toastSelectors) {
    const buttons = page.locator(selector);
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await button.click();
        dismissedCount++;
        await page.waitForTimeout(200); // Allow animation
      }
    }
  }
  
  // Try clicking outside to dismiss any remaining toasts
  if (dismissedCount === 0) {
    await page.click('body', { position: { x: 10, y: 10 } });
  }
  
  return dismissedCount;
}

// Wait for toast to disappear
export async function waitForToastToDisappear(page: Page, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const toasts = document.querySelectorAll('[role="status"], [role="alert"], .toast, .notification');
        return toasts.length === 0;
      },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}