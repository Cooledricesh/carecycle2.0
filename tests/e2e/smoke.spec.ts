import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    // Set up error detection
    const errors: Error[] = [];
    const failedRequests: string[] = [];
    
    // Listen for page errors
    page.on('pageerror', (error) => {
      errors.push(error);
      console.error('Page error:', error.message);
    });
    
    // Listen for failed network requests
    page.on('requestfailed', (request) => {
      // Ignore expected failures like canceled requests or aborted fetches
      const failure = request.failure();
      if (failure && !failure.errorText.includes('net::ERR_ABORTED')) {
        failedRequests.push(`${request.method()} ${request.url()}: ${failure.errorText}`);
        console.error('Request failed:', request.url(), failure.errorText);
      }
    });
    
    // Navigate to homepage
    const response = await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Check if page loads with success status
    expect(response).toBeDefined();
    expect(response?.status()).toBeLessThan(400);
    
    // Wait for and verify meaningful accessibility landmarks
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible({ timeout: 10000 });
    
    // Check for runtime errors
    expect(errors).toHaveLength(0);
    
    // Check for critical network failures (excluding analytics/tracking)
    const criticalFailures = failedRequests.filter(req => 
      !req.includes('analytics') && 
      !req.includes('tracking') && 
      !req.includes('gtag') &&
      !req.includes('clarity')
    );
    expect(criticalFailures).toHaveLength(0);
  });
  
  test('login page loads successfully', async ({ page }) => {
    // Set up error detection
    const errors: Error[] = [];
    const failedRequests: string[] = [];
    
    // Listen for page errors
    page.on('pageerror', (error) => {
      errors.push(error);
      console.error('Page error:', error.message);
    });
    
    // Listen for failed network requests
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      if (failure && !failure.errorText.includes('net::ERR_ABORTED')) {
        failedRequests.push(`${request.method()} ${request.url()}: ${failure.errorText}`);
        console.error('Request failed:', request.url(), failure.errorText);
      }
    });
    
    // Navigate to login page
    const response = await page.goto('/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Verify HTTP status code
    expect(response).toBeDefined();
    expect(response?.status()).toBeLessThan(400);
    
    // Verify current URL
    expect(page.url()).toContain('/login');
    
    // Check for main accessibility landmark
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    
    // Check for runtime errors
    expect(errors).toHaveLength(0);
    
    // Check for critical network failures
    const criticalFailures = failedRequests.filter(req => 
      !req.includes('analytics') && 
      !req.includes('tracking') && 
      !req.includes('gtag') &&
      !req.includes('clarity')
    );
    expect(criticalFailures).toHaveLength(0);
  });
});