import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { HomePage } from '../pages/home-page';
import { DashboardPage } from '../pages/dashboard-page';

test.describe('Login Journey E2E Tests', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('complete login flow - valid credentials', async ({ page }) => {
    // Navigate to login page
    await loginPage.goto();
    await loginPage.verifyPageLoaded();
    await loginPage.takeScreenshot('login-page-loaded');

    // Test form interaction before login
    await loginPage.testFormInteraction();

    // Attempt login with valid credentials
    await loginPage.loginWithValidCredentials();
    await loginPage.waitForNetworkIdle();

    // Verify successful redirect
    await loginPage.verifyLoginSuccess();
    await loginPage.takeScreenshot('login-success-redirect');

    // Verify we're on dashboard or homepage
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(dashboard|home|\/)$/);

    // Verify user is authenticated (check for logout option or user menu)
    const hasUserAvatar = await loginPage.userAvatar.isVisible().catch(() => false);
    const hasLogoutOption = await page.locator('text=/로그아웃|logout/i').isVisible().catch(() => false);
    
    expect(hasUserAvatar || hasLogoutOption).toBeTruthy();
  });

  test('login flow - invalid credentials', async ({ page }) => {
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    // Attempt login with invalid credentials
    await loginPage.loginWithInvalidCredentials();
    await loginPage.waitForNetworkIdle();

    // Verify error is displayed
    await loginPage.verifyLoginError();
    await loginPage.takeScreenshot('login-error-displayed');

    // Verify we stay on login page
    expect(page.url()).toContain('/login');
  });

  test('form validation', async ({ page }) => {
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    // Test form validation
    await loginPage.verifyFormValidation();
    await loginPage.takeScreenshot('form-validation-errors');
  });

  test('login accessibility', async ({ page }) => {
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    // Test accessibility features
    await loginPage.verifyAccessibility();
    
    // Test keyboard navigation
    await loginPage.emailInput.focus();
    await expect(loginPage.emailInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(loginPage.passwordInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(loginPage.submitButton).toBeFocused();
    
    // Test form submission with Enter key
    await loginPage.emailInput.focus();
    await loginPage.fillEmail('test@example.com');
    await page.keyboard.press('Tab');
    await loginPage.fillPassword('password123');
    await page.keyboard.press('Enter');
    
    await loginPage.waitForNetworkIdle();
  });

  test('responsive login design', async ({ page }) => {
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    // Test responsive layout
    await loginPage.testResponsiveLayout();
  });

  test('login loading states', async ({ page }) => {
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    // Test loading state
    await loginPage.testLoadingState();
  });

  test('network error handling', async ({ page }) => {
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    // Test network error handling
    await loginPage.testNetworkError();
  });

  test('login from homepage navigation', async ({ page }) => {
    // Start on homepage
    await homePage.goto();
    await homePage.verifyPageLoaded();

    // Navigate to login via navigation
    const loginLink = page.locator('a[href="/login"], button:has-text("로그인"), button:has-text("Login")');
    
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await loginPage.verifyPageLoaded();
      
      // Complete login flow
      await loginPage.loginWithValidCredentials();
      await loginPage.verifyLoginSuccess();
    }
  });

  test('logout functionality', async ({ page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.loginWithValidCredentials();
    await loginPage.verifyLoginSuccess();

    // Look for logout option
    const logoutButton = page.locator('button:has-text("로그아웃"), button:has-text("Logout"), a:has-text("로그아웃")');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await loginPage.waitForNetworkIdle();
      
      // Verify redirect to login or home
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(login|home|\/)$/);
    }
  });

  test('session persistence', async ({ page, context }) => {
    // Login and verify session
    await loginPage.goto();
    await loginPage.loginWithValidCredentials();
    await loginPage.verifyLoginSuccess();

    // Navigate to another page
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();

    // Refresh page and verify session persists
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be authenticated
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('login error recovery', async ({ page }) => {
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    // First attempt with invalid credentials
    await loginPage.loginWithInvalidCredentials();
    await loginPage.verifyLoginError();

    // Clear form and try with valid credentials
    await loginPage.emailInput.clear();
    await loginPage.passwordInput.clear();
    
    await loginPage.loginWithValidCredentials();
    await loginPage.verifyLoginSuccess();
  });

  test('login with different browsers/contexts', async ({ page, browser }) => {
    // Test login in current context
    await loginPage.goto();
    await loginPage.loginWithValidCredentials();
    await loginPage.verifyLoginSuccess();

    // Create new context (simulate private browsing)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    const newLoginPage = new LoginPage(newPage);

    // Should require login again in new context
    await newLoginPage.goto();
    await newLoginPage.verifyPageLoaded();

    // Verify we're on login page (not automatically logged in)
    expect(newPage.url()).toContain('/login');

    await newContext.close();
  });
});