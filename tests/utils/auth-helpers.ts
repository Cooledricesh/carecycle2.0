import { Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import * as fs from 'fs';
import * as path from 'path';

export interface AuthState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

export class AuthHelpers {
  /**
   * Check if a user is currently authenticated by examining the page state
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    try {
      const currentUrl = page.url();
      
      // If we're on login page, definitely not authenticated
      if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
        return false;
      }
      
      // Try to access a protected route to verify authentication
      await page.goto('/dashboard', { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      
      const finalUrl = page.url();
      
      // If redirected to login, not authenticated
      if (finalUrl.includes('/login') || finalUrl.includes('/auth')) {
        return false;
      }
      
      // Look for authentication indicators
      const authIndicators = [
        // User avatar or profile button
        '[data-testid="user-avatar"], .user-avatar, [aria-label*="user"], [aria-label*="profile"]',
        // Logout button
        'button:has-text("로그아웃"), button:has-text("Logout"), button:has-text("Sign Out")',
        // User menu or dropdown
        '[data-testid="user-menu"], .user-menu, [role="button"][aria-expanded]',
        // Dashboard specific elements that require auth
        '[data-testid="dashboard"], .dashboard, main:has([data-testid="stats"])'
      ];
      
      for (const selector of authIndicators) {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
        if (isVisible) {
          console.log(`✅ Authentication confirmed via selector: ${selector}`);
          return true;
        }
      }
      
      console.log('⚠️ No clear authentication indicators found');
      return false;
      
    } catch (error) {
      console.log(`❌ Authentication check failed: ${error}`);
      return false;
    }
  }
  
  /**
   * Perform login if not already authenticated
   */
  static async ensureAuthentication(page: Page): Promise<void> {
    const isAuth = await this.isAuthenticated(page);
    
    if (isAuth) {
      console.log('✅ User already authenticated');
      return;
    }
    
    console.log('🔐 User not authenticated, performing login...');
    await this.performLogin(page);
  }
  
  /**
   * Perform login using the login page
   */
  static async performLogin(page: Page, retries = 3): Promise<void> {
    const loginPage = new LoginPage(page);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Login attempt ${attempt}/${retries}`);
        
        // Navigate to login page if not already there
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 });
        }
        
        // Verify login page loaded
        await loginPage.verifyPageLoaded();
        
        // Perform login
        await loginPage.loginWithValidCredentials();
        
        // Wait for login success
        await loginPage.verifyLoginSuccess();
        
        // Verify authentication worked
        const isNowAuth = await this.isAuthenticated(page);
        if (isNowAuth) {
          console.log(`✅ Login successful on attempt ${attempt}`);
          return;
        } else {
          throw new Error('Authentication verification failed after login');
        }
        
      } catch (error) {
        console.log(`❌ Login attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          // Take a screenshot for debugging on final failure
          const screenshotPath = path.join(process.cwd(), 'tests', 'screenshots', `login-failure-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`📸 Login failure screenshot saved to: ${screenshotPath}`);
          throw new Error(`Login failed after ${retries} attempts: ${error}`);
        }
        
        // Wait before retry
        await page.waitForTimeout(2000);
      }
    }
  }
  
  /**
   * Save current authentication state to file
   */
  static async saveAuthState(page: Page, filePath?: string): Promise<string> {
    const defaultPath = path.join(process.cwd(), 'tests', 'storage', 'auth.json');
    const savePath = filePath || defaultPath;
    
    // Ensure directory exists
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save storage state
    await page.context().storageState({ path: savePath });
    
    // Verify save was successful
    if (fs.existsSync(savePath)) {
      const stats = fs.statSync(savePath);
      console.log(`💾 Auth state saved (${stats.size} bytes) to: ${savePath}`);
      return savePath;
    } else {
      throw new Error(`Failed to save auth state to: ${savePath}`);
    }
  }
  
  /**
   * Load authentication state from file
   */
  static async loadAuthState(filePath?: string): Promise<AuthState | null> {
    const defaultPath = path.join(process.cwd(), 'tests', 'storage', 'auth.json');
    const loadPath = filePath || defaultPath;
    
    if (!fs.existsSync(loadPath)) {
      console.log(`⚠️ Auth state file not found: ${loadPath}`);
      return null;
    }
    
    try {
      const content = fs.readFileSync(loadPath, 'utf-8');
      const authState = JSON.parse(content) as AuthState;
      
      console.log(`📂 Auth state loaded from: ${loadPath}`);
      console.log(`   - ${authState.cookies?.length || 0} cookies`);
      console.log(`   - ${authState.origins?.length || 0} origins`);
      
      return authState;
    } catch (error) {
      console.error(`❌ Failed to load auth state from ${loadPath}:`, error);
      return null;
    }
  }
  
  /**
   * Validate that the current storage state is still valid
   */
  static async validateStorageState(page: Page): Promise<boolean> {
    try {
      // Try to access a protected route
      await page.goto('/dashboard', { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      
      const isAuth = await this.isAuthenticated(page);
      
      if (isAuth) {
        console.log('✅ Storage state is valid');
        return true;
      } else {
        console.log('❌ Storage state is invalid or expired');
        return false;
      }
    } catch (error) {
      console.log(`❌ Storage state validation failed: ${error}`);
      return false;
    }
  }
  
  /**
   * Clear authentication state (logout)
   */
  static async clearAuthState(page: Page): Promise<void> {
    try {
      // Clear storage state
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Navigate to home to trigger any logout redirects
      await page.goto('/', { waitUntil: 'networkidle', timeout: 10000 });
      
      console.log('🧹 Authentication state cleared');
    } catch (error) {
      console.log(`⚠️ Error clearing auth state: ${error}`);
    }
  }
  
  /**
   * Get auth state summary for debugging
   */
  static async getAuthStateDebugInfo(page: Page): Promise<object> {
    const cookies = await page.context().cookies();
    const localStorageItems = await page.evaluate(() => {
      const items: Array<{ key: string; value: string }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          items.push({ key, value: localStorage.getItem(key) || '' });
        }
      }
      return items;
    });
    
    const sessionStorageItems = await page.evaluate(() => {
      const items: Array<{ key: string; value: string }> = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          items.push({ key, value: sessionStorage.getItem(key) || '' });
        }
      }
      return items;
    });
    
    const currentUrl = page.url();
    const isAuth = await this.isAuthenticated(page);
    
    return {
      currentUrl,
      isAuthenticated: isAuth,
      cookieCount: cookies.length,
      localStorageItems: localStorageItems.length,
      sessionStorageItems: sessionStorageItems.length,
      authCookies: cookies.filter(c => 
        c.name.toLowerCase().includes('auth') || 
        c.name.toLowerCase().includes('session') ||
        c.name.toLowerCase().includes('token')
      ).map(c => ({ name: c.name, domain: c.domain }))
    };
  }
}