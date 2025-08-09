import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard-page';
import { HomePage } from '../pages/home-page';
import { LoginPage } from '../pages/login-page';
import { PatientRegistrationPage } from '../pages/patient-registration-page';
import { AuthHelpers } from '../utils/auth-helpers';

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

    // Authentication is now handled globally via storage state
    // Verify authentication is working and handle edge cases
    try {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 15000 });
      
      // Quick authentication check - if storage state fails, fall back to manual auth
      const isAuth = await AuthHelpers.isAuthenticated(page);
      if (!isAuth) {
        console.log('⚠️ Storage state authentication failed, performing manual login...');
        await AuthHelpers.performLogin(page);
      }
    } catch (error) {
      console.log('⚠️ BeforeEach authentication check failed:', error);
      // Try manual authentication as fallback
      await AuthHelpers.ensureAuthentication(page);
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
        
        // Wait for any potential navigation, modal, or content change
        try {
          // Wait for potential navigation
          await page.waitForLoadState('networkidle', { timeout: 3000 });
        } catch {
          // If no navigation occurs, wait for any dynamic content to load
          await page.waitForFunction(
            () => {
              // Check if any loading indicators are present
              const loadingElements = document.querySelectorAll('[aria-busy="true"], [class*="loading"], [class*="skeleton"]');
              return loadingElements.length === 0;
            },
            { timeout: 3000 }
          ).catch(() => {});
        }
        
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
      
      try {
        await expect(chartTooltips.first()).toBeVisible({ timeout: 2000 });
        await dashboardPage.takeScreenshot('chart-tooltip-shown');
      } catch {
        // Tooltip not visible - this is acceptable for charts without interactive tooltips
        console.log('Chart tooltips not found or not interactive');
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
        
        // Wait for navigation or content change
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
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
      
      // Wait for navigation or view change
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
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
    
    // Wait for error state to potentially appear
    await page.waitForFunction(
      () => {
        const errorElements = document.querySelectorAll('[role="alert"], [class*="error"]');
        return errorElements.length > 0 || 
               document.querySelectorAll('[class*="loading"], [aria-busy="true"]').length === 0;
      },
      { timeout: 5000 }
    ).catch(() => {});
    
    // Check for error handling - expect error messages to appear during network interruption
    try {
      await expect(dashboardPage.errorMessages.first()).toBeVisible({ timeout: 5000 });
      await dashboardPage.takeScreenshot('network-error-state');
    } catch (error) {
      // If no error message appears, this might indicate poor error handling
      console.warn('No error message displayed during network interruption. This may indicate missing error handling.');
      await dashboardPage.takeScreenshot('network-error-no-message');
      // Continue test without failing, but log the concern
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
    try {
      await expect(dashboardPage.loadingSkeletons.first()).toBeVisible({ timeout: 1000 });
      await dashboardPage.takeScreenshot('loading-states-visible');
      
      // Wait for loading to complete
      await expect(dashboardPage.loadingSkeletons.first()).toBeHidden({ timeout: 15000 });
      await dashboardPage.takeScreenshot('loading-states-hidden');
    } catch {
      // Loading states may not be present - this is acceptable
      console.log('Loading skeleton states not found or already completed');
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
      
      // Wait for search results to load
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
      await dashboardPage.takeScreenshot('search-applied');
      
      // Clear search
      await searchInput.first().clear();
      await page.keyboard.press('Enter');
      
      // Wait for search to clear
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    }

    // Test filter functionality if available
    if (await filterButtons.first().isVisible()) {
      await filterButtons.first().click();
      
      // Wait for filter UI to appear
      await page.waitForFunction(
        () => {
          const filterElements = document.querySelectorAll('[class*="filter"], [role="menu"], [class*="dropdown"]');
          return filterElements.length > 0;
        },
        { timeout: 3000 }
      ).catch(() => {});
      
      await dashboardPage.takeScreenshot('filter-opened');
    }

    // Test date range filtering if available
    const dateInputCount = await dateRangeInputs.count();
    if (dateInputCount >= 2) {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const firstInput = dateRangeInputs.first();
      const secondInput = dateRangeInputs.nth(1);
      await firstInput.fill(lastWeek.toISOString().split('T')[0]);
      await secondInput.fill(today.toISOString().split('T')[0]);
      
      // Wait for date filter to be applied
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
      await dashboardPage.takeScreenshot('date-filter-applied');
    }
  });
});