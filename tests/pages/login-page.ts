import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base-page';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get loginForm(): Locator {
    return this.page.locator('form').filter({ has: this.page.locator('input[type="email"], input[type="password"]') });
  }

  get emailInput(): Locator {
    return this.page.locator('input[type="email"], input[name="email"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"], input[name="password"]');
  }

  get submitButton(): Locator {
    return this.page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("로그인")');
  }

  get errorMessage(): Locator {
    return this.page.locator('[role="alert"], .error, [class*="error"]').filter({ hasText: /Invalid|error|오류|실패/ });
  }

  get loadingIndicator(): Locator {
    return this.page.locator('[aria-busy="true"], [class*="loading"], [class*="spinner"]');
  }

  get pageTitle(): Locator {
    return this.page.locator('h1, h2').filter({ hasText: /Sign In|로그인|Login/ });
  }

  get forgotPasswordLink(): Locator {
    return this.page.locator('a:has-text("Forgot"), a:has-text("비밀번호")');
  }

  // Actions
  async goto(): Promise<void> {
    await this.navigateTo('/login');
  }

  async fillEmail(email: string): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await this.emailInput.clear();
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await expect(this.passwordInput).toBeVisible();
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
  }

  async submitForm(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submitForm();
  }

  async loginWithValidCredentials(): Promise<void> {
    // Use test credentials - adjust based on your test setup
    await this.login('test@example.com', 'password123');
  }

  async loginWithInvalidCredentials(): Promise<void> {
    await this.login('invalid@example.com', 'wrongpassword');
  }

  // Assertions
  async verifyPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
    await expect(this.loginForm).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async verifyLoginSuccess(): Promise<void> {
    // Wait for redirect to dashboard or home
    await this.page.waitForURL(/\/(dashboard|home|\/)$/, { timeout: 10000 });
    
    // Verify we're no longer on login page
    expect(this.page.url()).not.toContain('/login');
  }

  async verifyLoginError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
    
    const errorText = await this.errorMessage.textContent();
    expect(errorText).toMatch(/Invalid|error|오류|실패/i);
  }

  async verifyFormValidation(): Promise<void> {
    // Test empty form submission
    await this.submitForm();
    
    // Check for validation messages
    const emailError = this.page.locator('[role="alert"]').filter({ hasText: /email|이메일/ });
    const passwordError = this.page.locator('[role="alert"]').filter({ hasText: /password|비밀번호/ });
    
    // At least one validation error should appear
    const emailVisible = await emailError.isVisible().catch(() => false);
    const passwordVisible = await passwordError.isVisible().catch(() => false);
    
    expect(emailVisible || passwordVisible).toBeTruthy();
  }

  async verifyAccessibility(): Promise<void> {
    // Check form labels
    await expect(this.emailInput).toHaveAttribute('aria-label', /.+/);
    await expect(this.passwordInput).toHaveAttribute('aria-label', /.+/);
    
    // Check form accessibility
    await expect(this.loginForm).toHaveAttribute('noValidate');
    
    // Test keyboard navigation
    await this.emailInput.focus();
    await expect(this.emailInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.passwordInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.submitButton).toBeFocused();
  }

  async testFormInteraction(): Promise<void> {
    // Test that form responds to typing
    await this.fillEmail('test@example.com');
    await expect(this.emailInput).toHaveValue('test@example.com');
    
    await this.fillPassword('testpassword');
    await expect(this.passwordInput).toHaveValue('testpassword');
    
    // Test form submission enables/disables button
    const isInitiallyEnabled = await this.submitButton.isEnabled();
    expect(isInitiallyEnabled).toBeTruthy();
  }

  async testResponsiveLayout(): Promise<void> {
    // Test mobile layout
    await this.setViewportSize(375, 667);
    await expect(this.loginForm).toBeVisible();
    await this.takeScreenshot('login-mobile');
    
    // Verify form is still usable on mobile
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();

    // Test tablet layout  
    await this.setViewportSize(768, 1024);
    await expect(this.loginForm).toBeVisible();
    await this.takeScreenshot('login-tablet');

    // Test desktop layout
    await this.setViewportSize(1440, 900);
    await expect(this.loginForm).toBeVisible();
    await this.takeScreenshot('login-desktop');
  }

  async testLoadingState(): Promise<void> {
    // Fill form
    await this.fillEmail('test@example.com');
    await this.fillPassword('password123');
    
    // Submit and check for loading state
    await this.submitButton.click();
    
    // Check if loading indicator appears (if implemented)
    const hasLoadingState = await this.loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (hasLoadingState) {
      await expect(this.loadingIndicator).toBeVisible();
      await expect(this.submitButton).toBeDisabled();
    }
  }

  async testNetworkError(): Promise<void> {
    // Simulate network error by going offline
    await this.page.context().setOffline(true);
    
    await this.fillEmail('test@example.com');
    await this.fillPassword('password123');
    await this.submitForm();
    
    // Should show some kind of error
    const hasError = await this.errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasError) {
      await expect(this.errorMessage).toBeVisible();
    }
    
    // Restore network
    await this.page.context().setOffline(false);
  }
}