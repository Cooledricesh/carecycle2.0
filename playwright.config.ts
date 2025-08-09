import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  // Global setup and teardown for authentication
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['github']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: process.env.CI ? {
    command: 'npm run start',
    port: 3000,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  } : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use the global auth storage state by default
        storageState: './tests/storage/auth.json'
      }
    },
    {
      name: 'chromium-no-auth',
      use: { 
        ...devices['Desktop Chrome'],
        // No storage state - for testing login flows
        storageState: undefined
      }
    },
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Use the global auth storage state
        storageState: './tests/storage/auth.json'
      }
    }
  ]
});


