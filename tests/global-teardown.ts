import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for Playwright tests
 * Cleans up authentication files and performs any necessary cleanup
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');
  
  try {
    // Path to the auth storage file
    const authStoragePath = path.join(process.cwd(), 'tests', 'storage', 'auth.json');
    
    // Log auth storage info if it exists
    if (fs.existsSync(authStoragePath)) {
      const stats = fs.statSync(authStoragePath);
      console.log(`📁 Auth storage file exists (${stats.size} bytes): ${authStoragePath}`);
      
      // Optionally keep the auth file for debugging
      // Uncomment the line below to delete auth state after tests
      // fs.unlinkSync(authStoragePath);
      // console.log('🗑️  Auth storage file deleted');
    }
    
    // Clean up any test artifacts in screenshots directory
    const screenshotsDir = path.join(process.cwd(), 'tests', 'screenshots');
    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir);
      const errorScreenshots = files.filter(file => 
        file.includes('error') || file.includes('failure') || file.includes('global-setup')
      );
      
      if (errorScreenshots.length > 0) {
        console.log(`📸 Found ${errorScreenshots.length} error screenshots:`);
        errorScreenshots.forEach(file => {
          console.log(`   - ${file}`);
        });
      }
    }
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown encountered an error:', error);
    // Don't throw - we don't want to fail the entire test run due to cleanup issues
  }
}

export default globalTeardown;