import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard-page';
import { HomePage } from '../pages/home-page';
import { LoginPage } from '../pages/login-page';
import { PatientRegistrationPage } from '../pages/patient-registration-page';

test.describe('Dashboard Journey E2E Tests', () => {
  let dashboardPage: DashboardPage;
  let homePage: HomePage;
  let loginPage: LoginPage;
  let patientRegistrationPage: PatientRegistrationPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    patientRegistrationPage = new PatientRegistrationPage(page);

    // Ensure user is authenticated
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/login')) {
      await loginPage.loginWithValidCredentials();
      await loginPage.verifyLoginSuccess();
    }
  });

  test('complete dashboard navigation from homepage', async ({ page }) => {
    // Start from homepage
    await homePage.goto();
    await homePage.verifyPageLoaded();
    await homePage.takeScreenshot('homepage-before-dashboard');

    // Navigate to dashboard
    await homePage.clickDashboard();
    
    // Verify dashboard loads
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.takeScreenshot('dashboard-loaded');

    // Wait for data to load
    await dashboardPage.waitForDataToLoad();
    await dashboardPage.takeScreenshot('dashboard-data-loaded');
  });

  test('dashboard stats cards functionality', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();

    // Verify stats cards
    await dashboardPage.verifyStatsCards();
    await dashboardPage.takeScreenshot('stats-cards-verified');

    // Test stats card interactions
    const statsCards = dashboardPage.statsCards;
    const cardCount = await statsCards.count();

    for (let i = 0; i < Math.min(cardCount, 4); i++) {
      const card = statsCards.nth(i);
      await card.hover();
      await dashboardPage.takeScreenshot(`stats-card-${i}-hovered`);
      
      // Check if card has any interactive elements
      const clickableElements = card.locator('button, a[role="button"]');
      const clickableCount = await clickableElements.count();
      
      if (clickableCount > 0) {
        const firstClickable = clickableElements.first();
        await firstClickable.click();
        await page.waitForTimeout(1000);
        await dashboardPage.takeScreenshot(`stats-card-${i}-clicked`);
      }
    }
  });

  test('dashboard charts and visualizations', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();

    // Verify charts are displayed
    await dashboardPage.verifyChartsAndVisualizations();
    await dashboardPage.takeScreenshot('charts-verified');

    // Test chart interactions (if any)
    const weeklyChart = dashboardPage.weeklyTrendChart;
    if (await weeklyChart.isVisible()) {
      await weeklyChart.hover();
      await dashboardPage.takeScreenshot('chart-hovered');

      // Check for chart tooltips or interactive elements
      const chartTooltips = page.locator('[role="tooltip"], .tooltip, [class*="tooltip"]');
      const tooltipVisible = await chartTooltips.first().isVisible({ timeout: 2000 }).catch(() => false);
      
      if (tooltipVisible) {
        await dashboardPage.takeScreenshot('chart-tooltip-shown');
      }
    }
  });

  test('recent activity and upcoming schedules', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();

    // Verify recent activity section
    await dashboardPage.verifyRecentActivity();
    await dashboardPage.takeScreenshot('recent-activity-verified');

    // Verify upcoming schedules section
    await dashboardPage.verifyUpcomingSchedules();
    await dashboardPage.takeScreenshot('upcoming-schedules-verified');

    // Test "View All" buttons if present
    const viewAllButtons = page.locator('button:has-text("전체 보기"), a:has-text("전체 보기"), button:has-text("View All")');
    const viewAllCount = await viewAllButtons.count();

    for (let i = 0; i < viewAllCount; i++) {
      const button = viewAllButtons.nth(i);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(2000);
        await dashboardPage.takeScreenshot(`view-all-${i}-clicked`);
        
        // Navigate back to dashboard
        await dashboardPage.goto();
        await dashboardPage.waitForDataToLoad();
      }
    }
  });

  test('quick actions functionality', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();

    // Verify quick actions section
    await dashboardPage.verifyQuickActions();
    await dashboardPage.takeScreenshot('quick-actions-verified');

    // Test "New Patient" quick action
    if (await dashboardPage.newPatientButton.isVisible()) {
      await dashboardPage.clickNewPatient();
      
      // Should navigate to patient registration
      await patientRegistrationPage.verifyPageLoaded();
      await dashboardPage.takeScreenshot('new-patient-navigation');
      
      // Navigate back to dashboard
      await dashboardPage.goto();
      await dashboardPage.waitForDataToLoad();
    }

    // Test "View Schedule" quick action
    if (await dashboardPage.viewScheduleButton.isVisible()) {
      await dashboardPage.clickViewSchedule();
      await page.waitForTimeout(2000);
      await dashboardPage.takeScreenshot('view-schedule-navigation');
      
      // Navigate back to dashboard
      await dashboardPage.goto();
      await dashboardPage.waitForDataToLoad();
    }
  });

  test('dashboard data refresh and real-time updates', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();

    // Verify initial data state
    await dashboardPage.verifyDataRefresh();
    await dashboardPage.takeScreenshot('initial-data-state');

    // Test refresh functionality
    await dashboardPage.refreshData();
    await dashboardPage.takeScreenshot('after-refresh');

    // Verify real-time updates capability
    await dashboardPage.verifyRealTimeUpdates();
  });

  test('dashboard responsive design', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();

    // Test responsive layout
    await dashboardPage.testResponsiveLayout();

    // Test mobile interactions
    await dashboardPage.setViewportSize(375, 667);
    
    // Verify stats cards are still accessible on mobile
    await dashboardPage.verifyStatsCards();
    
    // Test mobile navigation
    const mobileMenuToggle = page.locator('[aria-label*="메뉴"], .menu-toggle, [class*="menu-toggle"]');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await dashboardPage.takeScreenshot('mobile-menu-opened');
    }
  });

  test('dashboard accessibility features', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();

    // Test accessibility features
    await dashboardPage.verifyAccessibility();

    // Test keyboard navigation through dashboard elements
    await page.keyboard.press('Tab');
    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    await dashboardPage.takeScreenshot('first-tab-focus');

    // Navigate through multiple elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      focusedElement = page.locator(':focus');
      
      if (await focusedElement.isVisible()) {
        const tagName = await focusedElement.evaluate(el => el.tagName);
        console.log(`Tab ${i + 1}: Focused on ${tagName}`);
      }
    }

    // Test ARIA labels and screen reader support
    const ariaLabels = page.locator('[aria-label], [aria-labelledby]');
    const labelCount = await ariaLabels.count();
    console.log(`Found ${labelCount} elements with ARIA labels`);
    
    expect(labelCount).toBeGreaterThan(0);
  });

  test('dashboard error states and recovery', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();

    // Test error states
    await dashboardPage.testErrorStates();

    // Simulate network interruption
    await page.context().setOffline(true);
    await dashboardPage.refreshData();
    await page.waitForTimeout(3000);
    
    // Check for error handling
    const hasNetworkError = await dashboardPage.errorMessages.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (hasNetworkError) {
      await dashboardPage.takeScreenshot('network-error-state');
    }

    // Restore network and verify recovery
    await page.context().setOffline(false);
    await dashboardPage.refreshData();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.takeScreenshot('network-recovered');
  });

  test('dashboard navigation integration', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();

    // Test navigation to different sections
    const navigationLinks = page.locator('nav a, nav button').filter({ 
      hasText: /홈|일정|환자|Home|Schedule|Patient/ 
    });
    
    const linkCount = await navigationLinks.count();
    
    for (let i = 0; i < Math.min(linkCount, 3); i++) {
      const link = navigationLinks.nth(i);
      const linkText = await link.textContent();
      
      console.log(`Testing navigation link: ${linkText}`);
      await link.click();
      await page.waitForLoadState('networkidle');
      await dashboardPage.takeScreenshot(`navigation-${i}-${linkText?.replace(/\s+/g, '-')}`);
      
      // Navigate back to dashboard
      await dashboardPage.goto();
      await dashboardPage.verifyPageLoaded();
    }
  });

  test('dashboard performance and loading states', async ({ page }) => {
    // Clear cache and reload
    await page.context().clearCookies();
    
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();

    // Measure loading performance
    const loadStartTime = Date.now();
    await dashboardPage.waitForDataToLoad();
    const loadEndTime = Date.now();
    const loadDuration = loadEndTime - loadStartTime;

    console.log(`Dashboard data loaded in ${loadDuration}ms`);
    expect(loadDuration).toBeLessThan(30000); // Should load within 30 seconds

    // Test loading states
    const hasLoadingStates = await dashboardPage.loadingSkeletons.first().isVisible({ timeout: 1000 }).catch(() => false);
    
    if (hasLoadingStates) {
      await dashboardPage.takeScreenshot('loading-states-visible');
      
      // Wait for loading to complete
      await expect(dashboardPage.loadingSkeletons.first()).toBeHidden({ timeout: 15000 });
      await dashboardPage.takeScreenshot('loading-states-hidden');
    }
  });

  test('dashboard data filtering and search', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();

    // Look for search or filter functionality
    const searchInput = page.locator('input[type="search"], input[placeholder*="검색"], input[placeholder*="Search"]');
    const filterButtons = page.locator('button:has-text("필터"), button:has-text("Filter")');
    const dateRangeInputs = page.locator('input[type="date"]');

    // Test search functionality if available
    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill('test');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      await dashboardPage.takeScreenshot('search-applied');
      
      // Clear search
      await searchInput.first().clear();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Test filter functionality if available
    if (await filterButtons.first().isVisible()) {
      await filterButtons.first().click();
      await page.waitForTimeout(1000);
      await dashboardPage.takeScreenshot('filter-opened');
    }

    // Test date range filtering if available
    const dateInputCount = await dateRangeInputs.count();
    if (dateInputCount >= 2) {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      await dateRangeInputs.first().fill(lastWeek.toISOString().split('T')[0]);
      await dateRangeInputs.nth(1).fill(today.toISOString().split('T')[0]);
      await page.waitForTimeout(2000);
      await dashboardPage.takeScreenshot('date-filter-applied');
    }
  });
});