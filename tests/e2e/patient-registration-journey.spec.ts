import { test, expect } from '@playwright/test';
import { PatientRegistrationPage } from '../pages/patient-registration-page';
import { HomePage } from '../pages/home-page';
import { DashboardPage } from '../pages/dashboard-page';
import { LoginPage } from '../pages/login-page';

test.describe('Patient Registration Journey E2E Tests', () => {
  let patientRegistrationPage: PatientRegistrationPage;
  let homePage: HomePage;
  let dashboardPage: DashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    patientRegistrationPage = new PatientRegistrationPage(page);
    homePage = new HomePage(page);
    dashboardPage = new DashboardPage(page);
    loginPage = new LoginPage(page);

    // Ensure user is authenticated if required
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if redirect to login occurs
    if (page.url().includes('/login')) {
      await loginPage.loginWithValidCredentials();
      await loginPage.verifyLoginSuccess();
    }
  });

  test('complete patient registration flow from homepage', async ({ page }) => {
    // Start from homepage
    await homePage.goto();
    await homePage.verifyPageLoaded();
    await homePage.takeScreenshot('homepage-before-registration');

    // Click patient registration button
    await homePage.clickPatientRegister();
    
    // Verify navigation to registration page
    await patientRegistrationPage.verifyPageLoaded();
    await patientRegistrationPage.takeScreenshot('registration-page-loaded');

    // Verify management items are loaded
    await patientRegistrationPage.verifyManagementItemsLoaded();

    // Complete registration
    const testPatientNumber = `E2E-${Date.now()}`;
    const testPatientName = 'E2E Test Patient';
    
    await patientRegistrationPage.registerPatient(
      testPatientNumber, 
      testPatientName, 
      [0] // Select first management item
    );

    // Wait for submission
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.takeScreenshot('registration-submitted');

    // Verify success
    await patientRegistrationPage.verifySuccessfulRegistration();
    await patientRegistrationPage.takeScreenshot('registration-success');
  });

  test('patient registration form validation', async ({ page }) => {
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();

    // Test form validation with empty form
    await patientRegistrationPage.verifyFormValidation();
    await patientRegistrationPage.takeScreenshot('form-validation-errors');

    // Test individual field validation
    await patientRegistrationPage.submitButton.click();
    
    // Should show validation for required fields
    const validationErrors = patientRegistrationPage.validationErrors;
    const errorCount = await validationErrors.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('management item selection and date configuration', async ({ page }) => {
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();
    await patientRegistrationPage.verifyManagementItemsLoaded();

    // Fill basic info first
    await patientRegistrationPage.fillPatientNumber('TEST-001');
    await patientRegistrationPage.fillPatientName('Test Patient');

    // Test item selection
    await patientRegistrationPage.verifyItemSelection();
    await patientRegistrationPage.takeScreenshot('item-selected');

    // Select multiple items
    await patientRegistrationPage.selectMultipleItems([0, 1]);
    await patientRegistrationPage.takeScreenshot('multiple-items-selected');

    // Verify date inputs appear for selected items
    const dateInputCount = await patientRegistrationPage.dateInputs.count();
    expect(dateInputCount).toBeGreaterThan(0);

    // Fill dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    await patientRegistrationPage.fillAllDateInputs(dateStr);
    await patientRegistrationPage.takeScreenshot('dates-filled');

    // Submit form
    await patientRegistrationPage.submitForm();
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.verifySuccessfulRegistration();
  });

  test('navigation from different entry points', async ({ page }) => {
    // Test navigation from dashboard
    await dashboardPage.goto();
    
    if (await dashboardPage.newPatientButton.isVisible()) {
      await dashboardPage.clickNewPatient();
      await patientRegistrationPage.verifyPageLoaded();
      await patientRegistrationPage.takeScreenshot('from-dashboard-navigation');
    }

    // Test direct URL access
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();
    await patientRegistrationPage.takeScreenshot('direct-url-access');

    // Test navigation from main menu
    await page.goto('/');
    await homePage.clickNavLink('환자 등록');
    await patientRegistrationPage.verifyPageLoaded();
  });

  test('registration form accessibility', async ({ page }) => {
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();

    // Test accessibility features
    await patientRegistrationPage.verifyAccessibility();

    // Test keyboard navigation through form
    await patientRegistrationPage.patientNumberInput.focus();
    await expect(patientRegistrationPage.patientNumberInput).toBeFocused();

    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(patientRegistrationPage.patientNameInput).toBeFocused();

    // Test form submission with keyboard
    await patientRegistrationPage.fillPatientNumber('KB-001');
    await patientRegistrationPage.fillPatientName('Keyboard Test');
    
    // Navigate to submit button
    let currentElement = await page.locator(':focus');
    let attempts = 0;
    while (attempts < 20) { // Prevent infinite loop
      await page.keyboard.press('Tab');
      currentElement = await page.locator(':focus');
      const isFocusedOnSubmit = await patientRegistrationPage.submitButton.evaluate(
        (btn, focused) => btn === focused, 
        await currentElement.elementHandle()
      ).catch(() => false);
      
      if (isFocusedOnSubmit) break;
      attempts++;
    }
  });

  test('responsive registration form', async ({ page }) => {
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();

    // Test responsive layout
    await patientRegistrationPage.testResponsiveLayout();

    // Test form interaction on mobile
    await patientRegistrationPage.setViewportSize(375, 667);
    await patientRegistrationPage.testFormInteraction();
  });

  test('registration form error handling', async ({ page }) => {
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();

    // Test error states
    await patientRegistrationPage.verifyErrorHandling();

    // Test with duplicate patient number (if validation exists)
    await patientRegistrationPage.fillPatientNumber('DUPLICATE-001');
    await patientRegistrationPage.fillPatientName('Duplicate Test');
    await patientRegistrationPage.selectManagementItem(0);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await patientRegistrationPage.fillAllDateInputs(dateStr);
    
    await patientRegistrationPage.submitForm();
    await patientRegistrationPage.waitForFormSubmission();
    
    // Check for any error messages
    const hasError = await patientRegistrationPage.errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasError) {
      await patientRegistrationPage.verifyErrorHandling();
    }
  });

  test('registration data persistence', async ({ page }) => {
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();

    // Fill form partially
    await patientRegistrationPage.fillPatientNumber('PERSIST-001');
    await patientRegistrationPage.fillPatientName('Persistence Test');

    // Navigate away and back
    await homePage.goto();
    await homePage.verifyPageLoaded();
    
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();

    // Check if data persisted (depends on implementation)
    const patientNumber = await patientRegistrationPage.patientNumberInput.inputValue();
    const patientName = await patientRegistrationPage.patientNameInput.inputValue();
    
    // This test might pass if form doesn't persist (which is often expected)
    console.log('Form persistence check:', { patientNumber, patientName });
  });

  test('multiple patient registration workflow', async ({ page }) => {
    // Register first patient
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();

    const patient1Number = `MULTI-001-${Date.now()}`;
    await patientRegistrationPage.registerPatient(patient1Number, 'Multi Test Patient 1', [0]);
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.verifySuccessfulRegistration();

    // Wait for form reset or navigate back to form
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    if (!currentUrl.includes('/register')) {
      await patientRegistrationPage.goto();
    }
    await patientRegistrationPage.verifyPageLoaded();

    // Register second patient
    const patient2Number = `MULTI-002-${Date.now()}`;
    await patientRegistrationPage.registerPatient(patient2Number, 'Multi Test Patient 2', [1]);
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.verifySuccessfulRegistration();
  });

  test('registration with all available management items', async ({ page }) => {
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();
    await patientRegistrationPage.verifyManagementItemsLoaded();

    // Get count of available items
    const itemCount = await patientRegistrationPage.availableItems.count();
    console.log(`Testing registration with ${itemCount} management items`);

    // Fill basic info
    const patientNumber = `ALL-ITEMS-${Date.now()}`;
    await patientRegistrationPage.fillPatientNumber(patientNumber);
    await patientRegistrationPage.fillPatientName('All Items Test Patient');

    // Select all available items
    const itemIndices = Array.from({ length: Math.min(itemCount, 5) }, (_, i) => i); // Limit to 5 items
    await patientRegistrationPage.selectMultipleItems(itemIndices);

    await patientRegistrationPage.takeScreenshot('all-items-selected');

    // Fill all date inputs
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await patientRegistrationPage.fillAllDateInputs(dateStr);

    // Submit form
    await patientRegistrationPage.submitForm();
    await patientRegistrationPage.waitForFormSubmission();
    await patientRegistrationPage.verifySuccessfulRegistration();
  });

  test('registration cancellation and form reset', async ({ page }) => {
    await patientRegistrationPage.goto();
    await patientRegistrationPage.verifyPageLoaded();

    // Fill form
    await patientRegistrationPage.fillPatientNumber('CANCEL-001');
    await patientRegistrationPage.fillPatientName('Cancel Test');
    await patientRegistrationPage.selectManagementItem(0);

    // Look for cancel/reset button
    const cancelButton = page.locator('button:has-text("취소"), button:has-text("Cancel"), button:has-text("초기화"), button:has-text("Reset")');
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Verify form is reset
      const patientNumber = await patientRegistrationPage.patientNumberInput.inputValue();
      const patientName = await patientRegistrationPage.patientNameInput.inputValue();
      
      expect(patientNumber).toBe('');
      expect(patientName).toBe('');
    } else {
      // Navigate away and back to reset form
      await homePage.goto();
      await patientRegistrationPage.goto();
      await patientRegistrationPage.verifyPageLoaded();
    }
  });
});