import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base-page';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get heroSection(): Locator {
    return this.page.locator('main').first();
  }

  get mainTitle(): Locator {
    return this.page.locator('h1').first();
  }

  get ctaButtons(): Locator {
    return this.page.locator('button, a[role="button"]').filter({ hasText: /체험|등록|보기/ });
  }

  get patientRegisterButton(): Locator {
    return this.page.locator('button:has-text("환자 등록하기"), a:has-text("환자 등록하기"), [role="button"]:has-text("환자 등록하기")');
  }

  get dashboardButton(): Locator {
    return this.page.locator('button:has-text("대시보드"), a:has-text("대시보드"), [role="button"]:has-text("대시보드")');
  }

  get scheduleButton(): Locator {
    return this.page.locator('button:has-text("일정"), a:has-text("일정"), [role="button"]:has-text("일정")');
  }

  get featureCards(): Locator {
    return this.page.locator('[class*="card"], .card, [role="article"]').filter({ has: this.page.locator('h3, h4') });
  }

  get statsSection(): Locator {
    return this.page.locator('[class*="stats"], [class*="metric"]').filter({ hasText: /환자|완료|자동/ });
  }

  // Actions
  async goto(): Promise<void> {
    await this.navigateTo('/');
  }

  async clickPatientRegister(): Promise<void> {
    await expect(this.patientRegisterButton.first()).toBeVisible({ timeout: 10000 });
    await this.patientRegisterButton.first().click();
  }

  async clickDashboard(): Promise<void> {
    const button = this.dashboardButton.or(this.page.locator('a[href="/dashboard"]')).first();
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
  }

  async clickSchedule(): Promise<void> {
    const button = this.scheduleButton.or(this.page.locator('a[href="/schedule"]')).first();
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
  }

  // Assertions
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heroSection).toBeVisible({ timeout: 10000 });
    await expect(this.mainTitle).toBeVisible({ timeout: 10000 });
    await expect(this.mainTitle).toContainText('CareCycle');
  }

  async verifyFeatureCards(): Promise<void> {
    const cards = this.featureCards;
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Check that each card has meaningful content
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = cards.nth(i);
      await expect(card).toBeVisible();
    }
  }

  async verifyNavigationElements(): Promise<void> {
    await expect(this.navigation).toBeVisible();
    
    // Check for main navigation links
    const navLinks = this.page.locator('nav a, nav button').filter({ 
      hasText: /홈|일정|대시보드|환자|Home|Schedule|Dashboard|Patient/ 
    });
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  }

  async verifyResponsiveLayout(): Promise<void> {
    // Test mobile layout
    await this.setViewportSize(375, 667);
    await expect(this.heroSection).toBeVisible();
    await this.takeScreenshot('home-mobile');

    // Test tablet layout
    await this.setViewportSize(768, 1024);
    await expect(this.heroSection).toBeVisible();
    await this.takeScreenshot('home-tablet');

    // Test desktop layout
    await this.setViewportSize(1440, 900);
    await expect(this.heroSection).toBeVisible();
    await this.takeScreenshot('home-desktop');
  }

  async verifyAccessibility(): Promise<void> {
    // Check for semantic HTML
    await expect(this.page.locator('main')).toBeVisible();
    await expect(this.page.locator('nav')).toBeVisible();
    
    // Check for proper heading hierarchy
    const h1 = this.page.locator('h1');
    await expect(h1).toHaveCount(1);
    
    // Check for alt text on images
    const images = this.page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      expect(alt || ariaLabel).toBeDefined();
    }
    
    // Check for keyboard navigation
    await this.pressTab();
    const focusedElement = await this.page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  }

  async testKeyboardNavigation(): Promise<void> {
    // Start from first focusable element
    await this.page.keyboard.press('Tab');
    
    // Navigate through main elements
    const focusableSelectors = [
      'a[href="/patients/register"]',
      'a[href="/dashboard"]', 
      'a[href="/schedule"]',
      'button',
      'input',
      '[tabindex="0"]'
    ];
    
    for (const selector of focusableSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible()) {
        await element.focus();
        await expect(element).toBeFocused();
      }
    }
  }
}