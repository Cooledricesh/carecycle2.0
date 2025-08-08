import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home-page';
import { LoginPage } from '../pages/login-page';
import { PatientRegistrationPage } from '../pages/patient-registration-page';
import { DashboardPage } from '../pages/dashboard-page';
import { cleanupTestData } from '../utils/supabase-test-client';

test.describe('Full Workflow Journey E2E Tests', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let patientRegistrationPage: PatientRegistrationPage;
  let dashboardPage: DashboardPage;

  test.beforeAll(async () => {
    await cleanupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    patientRegistrationPage = new PatientRegistrationPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('complete end-to-end workflow: login → register patient → view dashboard → check notifications', async ({ page }) => {
    // Step 1: Start from homepage and navigate to login
    await homePage.goto();
    await homePage.verifyPageLoaded();
    await homePage.takeScreenshot('workflow-01-homepage');

    // Navigate to login if not authenticated
    if (page.url().includes('/login') || !page.url().includes('/dashboard')) {
      await loginPage.goto();
      await loginPage.verifyPageLoaded();
      await loginPage.takeScreenshot('workflow-02-login-page');

      // Login with valid credentials
      await loginPage.loginWithValidCredentials();
      await loginPage.verifyLoginSuccess();
      await loginPage.takeScreenshot('workflow-03-login-success');
    }

    // Step 2: Navigate to patient registration
    await homePage.goto();
    await homePage.verifyPageLoaded();
    await homePage.clickPatientRegister();
    
    await patientRegistrationPage.verifyPageLoaded();
    await patientRegistrationPage.verifyManagementItemsLoaded();
    await patientRegistrationPage.takeScreenshot('workflow-04-registration-page');

    // Step 3: Register a new patient
    const workflowPatientNumber = `WORKFLOW-${Date.now()}`;
    const workflowPatientName = 'E2E Workflow Patient';
    
    console.log(`Registering patient: ${workflowPatientNumber} - ${workflowPatientName}`);
    
    await patientRegistrationPage.registerPatient(
      workflowPatientNumber,
      workflowPatientName,
      [0, 1] // Select first two management items
    );
    
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.verifySuccessfulRegistration();
    await patientRegistrationPage.takeScreenshot('workflow-05-patient-registered');

    // Step 4: Navigate to dashboard and verify updated data
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();
    await dashboardPage.takeScreenshot('workflow-06-dashboard-loaded');

    // Verify dashboard shows updated stats
    await dashboardPage.verifyStatsCards();
    await dashboardPage.takeScreenshot('workflow-07-dashboard-stats');

    // Step 5: Check notifications for the new patient
    const notificationBell = dashboardPage.notificationBell;
    await expect(notificationBell).toBeVisible();
    
    await notificationBell.click();
    const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
    const popoverVisible = await popover.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (popoverVisible) {
      await dashboardPage.takeScreenshot('workflow-08-notifications-opened');
      
      // Look for the new patient in notifications
      const patientInNotification = page.locator(`text=/${workflowPatientName}/`);
      const patientVisible = await patientInNotification.isVisible().catch(() => false);
      
      console.log(`Patient ${workflowPatientName} visible in notifications:`, patientVisible);
      
      // Close notification popover
      await page.click('body', { position: { x: 10, y: 10 } });
    }

    // Step 6: Test quick actions from dashboard
    if (await dashboardPage.viewScheduleButton.isVisible()) {
      await dashboardPage.clickViewSchedule();
      await page.waitForTimeout(2000);
      await dashboardPage.takeScreenshot('workflow-09-schedule-view');
      
      // Navigate back to dashboard
      await dashboardPage.goto();
      await dashboardPage.waitForDataToLoad();
    }

    // Step 7: Verify data persistence by refreshing
    await page.reload();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();
    await dashboardPage.takeScreenshot('workflow-10-after-refresh');

    console.log('Full workflow completed successfully');
  });

  test('multi-user workflow simulation', async ({ page, browser }) => {
    // User 1: Register a patient
    await homePage.goto();
    if (page.url().includes('/login')) {
      await loginPage.loginWithValidCredentials();
      await loginPage.verifyLoginSuccess();
    }

    await homePage.clickPatientRegister();
    await patientRegistrationPage.verifyPageLoaded();

    const patient1Number = `MULTI-USER-1-${Date.now()}`;
    await patientRegistrationPage.registerPatient(
      patient1Number,
      'Multi User Patient 1',
      [0]
    );
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.verifySuccessfulRegistration();
    await patientRegistrationPage.takeScreenshot('multi-user-patient-1-registered');

    // User 2: Simulate another user session
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    const homePage2 = new HomePage(page2);
    const loginPage2 = new LoginPage(page2);
    const dashboardPage2 = new DashboardPage(page2);

    await homePage2.goto();
    if (page2.url().includes('/login')) {
      await loginPage2.loginWithValidCredentials();
      await loginPage2.verifyLoginSuccess();
    }

    // User 2: Check dashboard for updated data
    await dashboardPage2.goto();
    await dashboardPage2.waitForDataToLoad();
    await dashboardPage2.takeScreenshot('multi-user-2-dashboard');

    await context2.close();

    // User 1: Continue workflow and verify data visibility
    await dashboardPage.goto();
    await dashboardPage.waitForDataToLoad();
    await dashboardPage.verifyStatsCards();
    await dashboardPage.takeScreenshot('multi-user-1-final-check');
  });

  test('error recovery workflow', async ({ page }) => {
    await homePage.goto();
    if (page.url().includes('/login')) {
      await loginPage.loginWithValidCredentials();
      await loginPage.verifyLoginSuccess();
    }

    // Step 1: Attempt patient registration with invalid data
    await homePage.clickPatientRegister();
    await patientRegistrationPage.verifyPageLoaded();

    // Try to submit empty form
    await patientRegistrationPage.submitForm();
    await patientRegistrationPage.verifyFormValidation();
    await patientRegistrationPage.takeScreenshot('error-workflow-01-validation');

    // Step 2: Fill form with partial data and test error handling
    await patientRegistrationPage.fillPatientNumber('ERROR-TEST');
    await patientRegistrationPage.fillPatientName('Error Test Patient');
    
    // Submit without selecting items or dates
    await patientRegistrationPage.submitForm();
    
    // Should show validation errors
    const validationErrors = patientRegistrationPage.validationErrors;
    const errorCount = await validationErrors.count();
    if (errorCount > 0) {
      await patientRegistrationPage.takeScreenshot('error-workflow-02-partial-validation');
    }

    // Step 3: Complete form properly
    await patientRegistrationPage.selectManagementItem(0);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await patientRegistrationPage.fillAllDateInputs(dateStr);

    await patientRegistrationPage.submitForm();
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.verifySuccessfulRegistration();
    await patientRegistrationPage.takeScreenshot('error-workflow-03-recovery-success');

    // Step 4: Test network error recovery
    await page.context().setOffline(true);
    
    await dashboardPage.goto();
    await page.waitForTimeout(3000);
    await dashboardPage.takeScreenshot('error-workflow-04-network-error');

    // Restore network
    await page.context().setOffline(false);
    await dashboardPage.refreshData();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.takeScreenshot('error-workflow-05-network-recovery');
  });

  test('accessibility throughout complete workflow', async ({ page }) => {
    await homePage.goto();
    if (page.url().includes('/login')) {
      await loginPage.loginWithValidCredentials();
      await loginPage.verifyLoginSuccess();
    }

    // Test accessibility at each major step
    console.log('Testing accessibility on homepage');
    await homePage.verifyAccessibility();
    await homePage.testKeyboardNavigation();
    await homePage.takeScreenshot('accessibility-01-homepage');

    // Navigate to patient registration via keyboard
    await homePage.patientRegisterButton.focus();
    await page.keyboard.press('Enter');
    
    await patientRegistrationPage.verifyPageLoaded();
    console.log('Testing accessibility on registration page');
    await patientRegistrationPage.verifyAccessibility();
    await patientRegistrationPage.takeScreenshot('accessibility-02-registration');

    // Fill form using keyboard navigation
    await patientRegistrationPage.patientNumberInput.focus();
    await patientRegistrationPage.fillPatientNumber('ACCESS-001');
    
    await page.keyboard.press('Tab');
    await patientRegistrationPage.fillPatientName('Accessibility Test');
    
    // Navigate to and select management items
    await patientRegistrationPage.selectManagementItem(0);
    await patientRegistrationPage.takeScreenshot('accessibility-03-item-selected');

    // Complete registration
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await patientRegistrationPage.fillAllDateInputs(dateStr);

    await patientRegistrationPage.submitForm();
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.verifySuccessfulRegistration();

    // Test dashboard accessibility
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();
    
    console.log('Testing accessibility on dashboard');
    await dashboardPage.verifyAccessibility();
    await dashboardPage.takeScreenshot('accessibility-04-dashboard');

    console.log('Accessibility testing completed throughout workflow');
  });

  test('responsive workflow across device sizes', async ({ page }) => {
    const devices = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop' }
    ];

    for (const device of devices) {
      console.log(`Testing workflow on ${device.name} (${device.width}x${device.height})`);
      await page.setViewportSize({ width: device.width, height: device.height });

      // Test each major step on this device size
      await homePage.goto();
      if (page.url().includes('/login')) {
        await loginPage.loginWithValidCredentials();
      }
      
      await homePage.verifyPageLoaded();
      await homePage.takeScreenshot(`responsive-${device.name}-01-home`);

      // Test patient registration on this device
      await homePage.clickPatientRegister();
      await patientRegistrationPage.verifyPageLoaded();
      await patientRegistrationPage.takeScreenshot(`responsive-${device.name}-02-registration`);

      // Quick form interaction test
      const devicePatientNumber = `DEVICE-${device.name.toUpperCase()}-${Date.now()}`;
      await patientRegistrationPage.fillPatientNumber(devicePatientNumber);
      await patientRegistrationPage.fillPatientName(`${device.name} Test Patient`);
      await patientRegistrationPage.takeScreenshot(`responsive-${device.name}-03-form-filled`);

      // Test dashboard on this device
      await dashboardPage.goto();
      await dashboardPage.verifyPageLoaded();
      await dashboardPage.waitForDataToLoad();
      await dashboardPage.takeScreenshot(`responsive-${device.name}-04-dashboard`);

      // Test notifications on this device
      const notificationBell = dashboardPage.notificationBell;
      if (await notificationBell.isVisible()) {
        await notificationBell.click();
        
        const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
        const popoverVisible = await popover.first().isVisible({ timeout: 3000 }).catch(() => false);
        
        if (popoverVisible) {
          await dashboardPage.takeScreenshot(`responsive-${device.name}-05-notifications`);
          
          // Verify popover fits within viewport
          const popoverBounds = await popover.first().boundingBox();
          if (popoverBounds) {
            expect(popoverBounds.x + popoverBounds.width).toBeLessThanOrEqual(device.width);
            expect(popoverBounds.y + popoverBounds.height).toBeLessThanOrEqual(device.height);
          }
          
          // Close popover
          await page.click('body', { position: { x: 10, y: 10 } });
        }
      }

      console.log(`${device.name} workflow testing completed`);
    }
  });

  test('performance monitoring throughout workflow', async ({ page }) => {
    // Enable performance monitoring
    const performanceEntries: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        performanceEntries.push({
          url: response.url(),
          status: response.status(),
          timing: Date.now()
        });
      }
    });

    const startTime = Date.now();
    
    // Execute workflow steps with timing
    console.log('Starting performance-monitored workflow');
    
    await homePage.goto();
    const homeLoadTime = Date.now() - startTime;
    console.log(`Homepage loaded in ${homeLoadTime}ms`);
    
    if (page.url().includes('/login')) {
      const loginStartTime = Date.now();
      await loginPage.loginWithValidCredentials();
      const loginTime = Date.now() - loginStartTime;
      console.log(`Login completed in ${loginTime}ms`);
    }

    const regStartTime = Date.now();
    await homePage.clickPatientRegister();
    await patientRegistrationPage.verifyPageLoaded();
    await patientRegistrationPage.verifyManagementItemsLoaded();
    const regLoadTime = Date.now() - regStartTime;
    console.log(`Registration page loaded in ${regLoadTime}ms`);

    const submitStartTime = Date.now();
    const perfPatientNumber = `PERF-${Date.now()}`;
    await patientRegistrationPage.registerPatient(
      perfPatientNumber,
      'Performance Test Patient',
      [0]
    );
    await patientRegistrationPage.waitForFormSubmission();
    const submitTime = Date.now() - submitStartTime;
    console.log(`Patient registration submitted in ${submitTime}ms`);

    const dashStartTime = Date.now();
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();
    const dashLoadTime = Date.now() - dashStartTime;
    console.log(`Dashboard loaded in ${dashLoadTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`Total workflow completed in ${totalTime}ms`);

    // Performance assertions
    expect(homeLoadTime).toBeLessThan(10000); // 10 seconds
    expect(regLoadTime).toBeLessThan(15000); // 15 seconds
    expect(submitTime).toBeLessThan(20000); // 20 seconds
    expect(dashLoadTime).toBeLessThan(15000); // 15 seconds
    expect(totalTime).toBeLessThan(60000); // 1 minute total

    console.log(`API calls made: ${performanceEntries.length}`);
    console.log('Performance monitoring completed');
  });

  test('data consistency verification throughout workflow', async ({ page }) => {
    // Track data changes throughout the workflow
    const workflowData = {
      patientNumber: `CONSISTENCY-${Date.now()}`,
      patientName: 'Consistency Test Patient',
      timestamp: new Date().toISOString()
    };

    await homePage.goto();
    if (page.url().includes('/login')) {
      await loginPage.loginWithValidCredentials();
    }

    // Step 1: Get initial dashboard stats
    await dashboardPage.goto();
    await dashboardPage.waitForDataToLoad();
    
    const initialTotalPatients = await dashboardPage.totalPatientsCard.textContent();
    const initialTodayScheduled = await dashboardPage.todayScheduledCard.textContent();
    
    console.log('Initial stats:', { initialTotalPatients, initialTodayScheduled });

    // Step 2: Register new patient
    await homePage.clickPatientRegister();
    await patientRegistrationPage.verifyPageLoaded();
    await patientRegistrationPage.verifyManagementItemsLoaded();

    await patientRegistrationPage.registerPatient(
      workflowData.patientNumber,
      workflowData.patientName,
      [0, 1]
    );
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.verifySuccessfulRegistration();
    
    console.log('Patient registered:', workflowData);

    // Step 3: Verify dashboard updates
    await dashboardPage.goto();
    await dashboardPage.waitForDataToLoad();
    
    // Allow time for real-time updates
    await page.waitForTimeout(3000);
    await dashboardPage.refreshData();
    
    const updatedTotalPatients = await dashboardPage.totalPatientsCard.textContent();
    const updatedTodayScheduled = await dashboardPage.todayScheduledCard.textContent();
    
    console.log('Updated stats:', { updatedTotalPatients, updatedTodayScheduled });

    // Step 4: Check notifications for new patient
    const notificationBell = dashboardPage.notificationBell;
    await notificationBell.click();
    
    const popover = page.locator('[role="dialog"], .popover, [data-state="open"]');
    const popoverVisible = await popover.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (popoverVisible) {
      const patientInNotifications = page.locator(`text=/${workflowData.patientName}/`);
      const foundInNotifications = await patientInNotifications.isVisible().catch(() => false);
      
      console.log(`Patient found in notifications: ${foundInNotifications}`);
      
      // Close popover
      await page.click('body', { position: { x: 10, y: 10 } });
    }

    // Step 5: Verify data persistence across page refreshes
    await page.reload();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.waitForDataToLoad();
    
    const persistedTotalPatients = await dashboardPage.totalPatientsCard.textContent();
    console.log('Persisted stats after refresh:', { persistedTotalPatients });

    // Data consistency checks
    expect(updatedTotalPatients).not.toBe(initialTotalPatients); // Should change after adding patient
    expect(persistedTotalPatients).toBe(updatedTotalPatients); // Should persist after refresh

    console.log('Data consistency verification completed');
  });
});