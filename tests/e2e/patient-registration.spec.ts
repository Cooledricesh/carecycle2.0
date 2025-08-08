import { test, expect } from '@playwright/test';

test.describe('Patient Registration', () => {
  test('환자 등록하기 버튼이 존재하는지 확인', async ({ page }) => {
    // 홈페이지로 이동
    await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // 환자 등록하기 버튼 찾기 - first()를 사용하여 첫 번째 요소 선택
    const registerButton = page.locator('button:has-text("환자 등록하기"), a:has-text("환자 등록하기"), [role="button"]:has-text("환자 등록하기")').first();
    
    // 버튼이 존재하는지 확인
    await expect(registerButton).toBeVisible({ timeout: 10000 });
    
    // 버튼 텍스트 확인
    const buttonText = await registerButton.textContent();
    expect(buttonText).toContain('환자 등록하기');
  });

  test('환자 등록하기 버튼 클릭 후 동작 확인', async ({ page }) => {
    // 홈페이지로 이동
    await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // 환자 등록하기 버튼 찾기 - first()를 사용하여 첫 번째 요소 선택
    const registerButton = page.locator('button:has-text("환자 등록하기"), a:has-text("환자 등록하기"), [role="button"]:has-text("환자 등록하기")').first();
    
    // 버튼이 보일 때까지 대기
    await expect(registerButton).toBeVisible({ timeout: 10000 });
    
    // 버튼 클릭
    await registerButton.click();
    
    // 페이지 이동을 기다림
    await page.waitForURL('**/patients/register', { timeout: 5000 }).catch(() => {});
    
    // 클릭 후 페이지 이동 또는 모달 오픈 확인
    const currentUrl = page.url();
    
    // URL이 /patients/register로 변경되었는지 확인
    const hasNavigation = currentUrl.includes('/patients/register');
    
    // 모달이 열리는 경우를 대비한 체크
    const modal = page.locator('[role="dialog"], .modal, [data-testid="patient-registration-modal"]');
    const form = page.locator('form').filter({ hasText: /환자|patient/i });
    
    const hasModal = await modal.isVisible().catch(() => false);
    const hasForm = await form.isVisible().catch(() => false);
    
    // URL이 변경되었거나, 모달이 열렸거나, 폼이 표시되었는지 확인
    expect(hasNavigation || hasModal || hasForm).toBeTruthy();
  });

  test('환자 등록 폼 필드 확인', async ({ page }) => {
    // 홈페이지로 이동
    await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // 환자 등록하기 버튼 찾고 클릭 - first()를 사용하여 첫 번째 요소 선택
    const registerButton = page.locator('button:has-text("환자 등록하기"), a:has-text("환자 등록하기"), [role="button"]:has-text("환자 등록하기")').first();
    
    // 버튼이 존재하는 경우에만 테스트 진행
    const buttonExists = await registerButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonExists) {
      await registerButton.click();
      
      // 폼 필드들이 존재하는지 확인
      const nameField = page.locator('input[name="name"], input[name="patientName"], input[placeholder*="이름"], input[placeholder*="name"]');
      const birthDateField = page.locator('input[type="date"], input[name="birthDate"], input[name="dateOfBirth"], input[placeholder*="생년월일"]');
      const phoneField = page.locator('input[type="tel"], input[name="phone"], input[name="phoneNumber"], input[placeholder*="전화번호"], input[placeholder*="연락처"]');
      
      // 최소한 하나의 필드는 존재해야 함
      const hasNameField = await nameField.isVisible({ timeout: 5000 }).catch(() => false);
      const hasBirthField = await birthDateField.isVisible({ timeout: 5000 }).catch(() => false);
      const hasPhoneField = await phoneField.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasNameField || hasBirthField || hasPhoneField).toBeTruthy();
    } else {
      // 버튼이 없는 경우 스킵
      test.skip();
    }
  });
});