import { chromium, FullConfig } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Global setup for Playwright tests
 * This file handles authentication once at the beginning of the test suite
 * and saves the authentication state for reuse across all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 Starting global authentication setup...');
  
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  
  // Check if auth file already exists and is recent (less than 1 hour old)
  const storageStatePath = path.join(process.cwd(), 'tests', 'storage', 'auth.json');
  if (fs.existsSync(storageStatePath)) {
    const stats = fs.statSync(storageStatePath);
    const fileAge = Date.now() - stats.mtime.getTime();
    const oneHour = 60 * 60 * 1000;
    
    if (fileAge < oneHour) {
      console.log('✅ Recent authentication file found, skipping setup');
      return;
    } else {
      console.log('⏰ Authentication file is older than 1 hour, refreshing...');
    }
  }
  
  const browser = await chromium.launch({
    headless: process.env.CI ? true : false, // Show browser in local development
  });
  
  const context = await browser.newContext({
    baseURL
  });
  
  // Set timeout for slow authentication
  context.setDefaultTimeout(30000);
  
  const page = await context.newPage();
  
  try {
    // Initialize login page
    const loginPage = new LoginPage(page);
    
    console.log('🚀 Navigating to application...');
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if already authenticated by looking for login redirect
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login') || currentUrl.includes('auth')) {
      console.log('🔐 Authentication required, proceeding with login...');
      
      // Perform login
      await loginPage.verifyPageLoaded();
      console.log('✅ Login page loaded successfully');
      
      await loginPage.loginWithValidCredentials();
      console.log('📝 Login credentials submitted');
      
      // Wait for successful authentication
      await loginPage.verifyLoginSuccess();
      console.log('🎉 Authentication successful');
      
      // Wait for any post-login redirects to complete
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Verify we're on a protected page (dashboard, home, etc.)
      const finalUrl = page.url();
      console.log(`📍 Post-auth URL: ${finalUrl}`);
      
      if (finalUrl.includes('/login')) {
        throw new Error('❌ Authentication failed: still on login page');
      }
    } else {
      console.log('✅ Already authenticated or no auth required');
    }
    
    // Ensure storage directory exists
    const storageDir = path.join(process.cwd(), 'tests', 'storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    // Save the authentication state
    await context.storageState({ path: storageStatePath });
    console.log(`💾 Authentication state saved to: ${storageStatePath}`);
    
    // Verify the storage state was saved properly
    if (fs.existsSync(storageStatePath)) {
      const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
      const cookieCount = storageState.cookies?.length || 0;
      const localStorageCount = storageState.origins?.length || 0;
      console.log(`📊 Storage state contains: ${cookieCount} cookies, ${localStorageCount} origins`);
    }
    
    console.log('🎯 Global authentication setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global authentication setup failed:', error);
    
    // Take a screenshot for debugging
    const screenshotPath = path.join(process.cwd(), 'tests', 'screenshots', 'global-setup-error.png');
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`📸 Error screenshot saved to: ${screenshotPath}`);
    
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;