import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base-page';

export class PatientRegistrationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get pageTitle(): Locator {
    return this.page.locator('h1').filter({ hasText: /환자 등록|Patient Registration/ });
  }

  get registrationForm(): Locator {
    return this.page.locator('form').filter({ 
      has: this.page.locator('input[name="patientNumber"], input[name="name"]') 
    });
  }

  get patientNumberInput(): Locator {
    return this.page.locator('input[name="patientNumber"], input[placeholder*="환자 번호"], input[placeholder*="Patient Number"]');
  }

  get patientNameInput(): Locator {
    return this.page.locator('input[name="name"], input[name="patientName"], input[placeholder*="이름"], input[placeholder*="name"]');
  }

  get managementItemsSection(): Locator {
    return this.page.locator('text=/관리 항목|Management Items/').locator('..');
  }

  get itemCheckboxes(): Locator {
    return this.page.locator('input[type="checkbox"], [role="checkbox"]').filter({ 
      has: this.page.locator('+ *').filter({ hasText: /검사|주사|test|injection/ }) 
    });
  }

  get dateInputsSection(): Locator {
    return this.page.locator('text=/최초 시행일|First Date/').locator('..');
  }

  get dateInputs(): Locator {
    return this.page.locator('input[type="date"]');
  }

  get submitButton(): Locator {
    return this.page.locator('button[type="submit"], button:has-text("등록"), button:has-text("Register")');
  }

  get successMessage(): Locator {
    return this.page.locator('[role="alert"], .toast, .notification').filter({ 
      hasText: /성공|success|등록되었습니다|registered/ 
    });
  }

  get errorMessage(): Locator {
    return this.page.locator('[role="alert"], .error').filter({ 
      hasText: /오류|error|실패|failed/ 
    });
  }

  get validationErrors(): Locator {
    return this.page.locator('[class*="error"], [role="alert"]').filter({ hasText: /required|필수|입력/ });
  }

  get loadingIndicator(): Locator {
    return this.page.locator('[aria-busy="true"], [class*="loading"], [class*="spinner"]');
  }

  get availableItems(): Locator {
    return this.page.locator('[class*="card"], .item, .checkbox-card').filter({ 
      has: this.page.locator('text=/검사|주사|test|injection/') 
    });
  }

  get selectedItemsCount(): Locator {
    return this.page.locator('text=/선택됨|selected/');
  }

  // Actions
  async goto(): Promise<void> {
    await this.navigateTo('/patients/register');
  }

  async fillPatientNumber(patientNumber: string): Promise<void> {
    await expect(this.patientNumberInput).toBeVisible();
    await this.patientNumberInput.clear();
    await this.patientNumberInput.fill(patientNumber);
  }

  async fillPatientName(name: string): Promise<void> {
    await expect(this.patientNameInput).toBeVisible();
    await this.patientNameInput.clear();
    await this.patientNameInput.fill(name);
  }

  async selectManagementItem(itemIndex: number = 0): Promise<void> {
    const items = this.availableItems;
    const itemCount = await items.count();
    
    if (itemCount > itemIndex) {
      const item = items.nth(itemIndex);
      await expect(item).toBeVisible();
      await item.click();
    }
  }

  async selectMultipleItems(indices: number[]): Promise<void> {
    for (const index of indices) {
      await this.selectManagementItem(index);
      
      // Wait for UI to update by checking for date inputs to appear
      // (since selecting items should make date inputs visible)
      try {
        await expect(this.dateInputs.nth(index)).toBeVisible({ timeout: 3000 });
      } catch {
        // If the specific date input doesn't appear, at least ensure the UI has settled
        await this.page.waitForFunction(
          () => !document.querySelector('[class*="loading"], [class*="spinner"]'),
          { timeout: 2000 }
        );
      }
    }
  }

  async fillFirstDate(itemIndex: number, date: string): Promise<void> {
    const dateInputs = this.dateInputs;
    const inputCount = await dateInputs.count();
    
    if (inputCount > itemIndex) {
      const dateInput = dateInputs.nth(itemIndex);
      await expect(dateInput).toBeVisible();
      await dateInput.fill(date);
    }
  }

  async fillAllDateInputs(date: string): Promise<void> {
    // Wait for date inputs to appear after item selection
    await expect(this.dateInputs.first()).toBeVisible({ timeout: 5000 });
    
    const dateInputs = this.dateInputs;
    const inputCount = await dateInputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const dateInput = dateInputs.nth(i);
      await expect(dateInput).toBeVisible();
      await dateInput.fill(date);
    }
  }

  async submitForm(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  async registerPatient(patientNumber: string, name: string, itemIndices: number[] = [0], date: string = ''): Promise<void> {
    await this.fillPatientNumber(patientNumber);
    await this.fillPatientName(name);
    await this.selectMultipleItems(itemIndices);
    
    // Use tomorrow's date if no date provided
    let dateToUse = date;
    if (!dateToUse) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateToUse = tomorrow.toISOString().split('T')[0] || '';
    }
    
    await this.fillAllDateInputs(dateToUse);
    await this.submitForm();
  }

  async waitForFormSubmission(): Promise<void> {
    // Wait for loading state or network activity to complete
    try {
      // First, check if there's a loading indicator and wait for it to disappear
      const hasLoading = await this.loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (hasLoading) {
        await expect(this.loadingIndicator).toBeHidden({ timeout: 10000 });
      }
      
      // Additionally, wait for network requests to settle
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
      
    } catch (networkError) {
      // If networkidle fails, fall back to waiting for either success or error message
      await this.page.waitForFunction(
        () => {
          const successElement = document.querySelector('[role="alert"], .toast, .notification');
          const errorElement = document.querySelector('[role="alert"], .error');
          
          if (successElement) {
            const successText = successElement.textContent || '';
            if (/성공|success|등록되었습니다|registered/i.test(successText)) {
              return true;
            }
          }
          
          if (errorElement) {
            const errorText = errorElement.textContent || '';
            if (/오류|error|실패|failed/i.test(errorText)) {
              return true;
            }
          }
          
          return false;
        },
        { timeout: 10000 }
      );
    }
  }

  // Assertions
  async verifyPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
    await expect(this.registrationForm).toBeVisible();
    await expect(this.patientNumberInput).toBeVisible();
    await expect(this.patientNameInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async verifyManagementItemsLoaded(): Promise<void> {
    await expect(this.managementItemsSection).toBeVisible();
    
    // Wait for items to load (they might be loaded via API)
    await this.page.waitForFunction(
      () => {
        const items = document.querySelectorAll('[class*="card"], .item, .checkbox-card');
        const skeletons = document.querySelectorAll('[class*="skeleton"]');
        return items.length > 0 || skeletons.length === 0;
      },
      { timeout: 10000 }
    );
    
    const itemCount = await this.availableItems.count();
    expect(itemCount).toBeGreaterThan(0);
  }

  async verifyItemSelection(): Promise<void> {
    // Select first item
    await this.selectManagementItem(0);
    
    // Verify selection feedback
    const hasSelectionFeedback = await this.selectedItemsCount.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasSelectionFeedback) {
      await expect(this.selectedItemsCount).toBeVisible();
    }
    
    // Verify date inputs appear
    await expect(this.dateInputs.first()).toBeVisible({ timeout: 5000 });
  }

  async verifyFormValidation(): Promise<void> {
    // Try to submit empty form
    await this.submitButton.click();
    
    // Should show validation errors
    const hasValidationErrors = await this.validationErrors.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasValidationErrors).toBeTruthy();
  }

  async verifySuccessfulRegistration(): Promise<void> {
    // Wait for success message
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
    
    // Wait for either form reset or navigation away from form
    try {
      // Option 1: Wait for form fields to be reset (both empty)
      await this.page.waitForFunction(
        () => {
          const patientNumberInput = document.querySelector('input[name="patientNumber"], input[placeholder*="환자 번호"], input[placeholder*="Patient Number"]') as HTMLInputElement;
          const patientNameInput = document.querySelector('input[name="name"], input[name="patientName"], input[placeholder*="이름"], input[placeholder*="name"]') as HTMLInputElement;
          
          // Return true if both fields are empty (form was reset)
          return patientNumberInput?.value === '' && patientNameInput?.value === '';
        },
        { timeout: 5000 }
      );
      
      // Verify both input fields are actually empty after form reset
      await expect(this.patientNumberInput).toHaveValue('');
      await expect(this.patientNameInput).toHaveValue('');
      
    } catch (resetError) {
      // Option 2: Check if we were redirected away from the registration form
      const currentUrl = this.page.url();
      const isOnRegistrationPage = currentUrl.includes('/register') || currentUrl.includes('/patients');
      
      if (isOnRegistrationPage) {
        // If still on registration page but form wasn't reset, this is an error
        throw new Error(`Form was not reset after successful registration. Current URL: ${currentUrl}`);
      }
      
      // If we're on a different page (e.g., redirected to patient list), that's also success
      console.log(`Successfully redirected after registration to: ${currentUrl}`);
    }
  }

  async verifyErrorHandling(): Promise<void> {
    // This would test error states - could be triggered by invalid data
    const hasError = await this.errorMessage.isVisible().catch(() => false);
    
    if (hasError) {
      await expect(this.errorMessage).toBeVisible();
      
      const errorText = await this.errorMessage.textContent();
      expect(errorText).toMatch(/오류|error|실패|failed/i);
    }
  }

  async verifyAccessibility(): Promise<void> {
    // Check form labels
    const requiredFields = [this.patientNumberInput, this.patientNameInput];
    
    for (const field of requiredFields) {
      const hasLabel = await field.getAttribute('aria-label') || 
                       await this.page.locator(`label[for="${await field.getAttribute('id')}"]`).isVisible().catch(() => false);
      expect(hasLabel).toBeTruthy();
    }
    
    // Test keyboard navigation
    await this.patientNumberInput.focus();
    await expect(this.patientNumberInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.patientNameInput).toBeFocused();
  }

  async testResponsiveLayout(): Promise<void> {
    // Test mobile layout
    await this.setViewportSize(375, 667);
    await expect(this.registrationForm).toBeVisible();
    await this.takeScreenshot('patient-registration-mobile');
    
    // Verify form is still usable on mobile
    await expect(this.patientNumberInput).toBeVisible();
    await expect(this.patientNameInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();

    // Test tablet layout
    await this.setViewportSize(768, 1024);
    await expect(this.registrationForm).toBeVisible();
    await this.takeScreenshot('patient-registration-tablet');

    // Test desktop layout
    await this.setViewportSize(1440, 900);
    await expect(this.registrationForm).toBeVisible();
    await this.takeScreenshot('patient-registration-desktop');
  }

  async testFormInteraction(): Promise<void> {
    // Test basic form interaction
    await this.fillPatientNumber('P001');
    await expect(this.patientNumberInput).toHaveValue('P001');
    
    await this.fillPatientName('Test Patient');
    await expect(this.patientNameInput).toHaveValue('Test Patient');
    
    // Test item selection
    await this.selectManagementItem(0);
    
    // Verify date input appears
    await expect(this.dateInputs.first()).toBeVisible({ timeout: 3000 });
    
    // Test date input
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0] || '';
    
    await this.fillFirstDate(0, dateStr);
    await expect(this.dateInputs.first()).toHaveValue(dateStr);
  }

  async testCompleteWorkflow(): Promise<void> {
    const testPatientNumber = `TEST-${Date.now()}`;
    const testPatientName = 'E2E Test Patient';
    
    // Complete the registration process
    await this.registerPatient(testPatientNumber, testPatientName, [0, 1]);
    await this.waitForFormSubmission();
    
    // Verify success
    await this.verifySuccessfulRegistration();
  }
}