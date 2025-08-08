import { Page, expect, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common navigation elements
  get navigation(): Locator {
    return this.page.locator('nav, [role="navigation"]').first();
  }

  get notificationBell(): Locator {
    return this.page.locator('nav button[aria-label*="알림"], nav .notification-bell');
  }

  get themeToggle(): Locator {
    return this.page.locator('button[aria-label*="모드"]');
  }

  get userAvatar(): Locator {
    return this.page.locator('[role="img"], .avatar').last();
  }

  // Common methods
  async waitForPageLoad(timeout = 30000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
    await this.page.waitForSelector('main', { timeout: 10000 });
  }

  async navigateTo(path: string, waitForLoad = true): Promise<void> {
    await this.page.goto(path, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    if (waitForLoad) {
      await this.waitForPageLoad();
    }
  }

  async clickNavLink(linkText: string): Promise<void> {
    const link = this.page.locator(`nav a:has-text("${linkText}"), nav button:has-text("${linkText}")`);
    await expect(link.first()).toBeVisible();
    await link.first().click();
  }

  async waitForToast(expectedText?: string, timeout = 5000): Promise<boolean> {
    const toastSelector = expectedText 
      ? `[role="status"]:has-text("${expectedText}"), [role="alert"]:has-text("${expectedText}")`
      : '[role="status"], [role="alert"]';
    
    try {
      await this.page.waitForSelector(toastSelector, { state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async takeScreenshot(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${name}-${timestamp}.png`;
    await this.page.screenshot({ 
      path: `tests/screenshots/${fileName}`,
      fullPage: false 
    });
    return fileName;
  }

  async checkForConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    this.page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    return errors;
  }

  async waitForNetworkIdle(timeout = 5000): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch {
      // Network might not be completely idle, but continue
    }
  }

  // Accessibility helpers
  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  // Responsive helpers
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  async testResponsive(): Promise<void> {
    const viewports = [
      { width: 320, height: 568 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1440, height: 900 }  // Desktop
    ];

    for (const viewport of viewports) {
      await this.setViewportSize(viewport.width, viewport.height);
      await this.page.waitForTimeout(1000); // Allow layout to settle
      
      // Take screenshot for each viewport
      await this.takeScreenshot(`responsive-${viewport.width}x${viewport.height}`);
    }
  }
}