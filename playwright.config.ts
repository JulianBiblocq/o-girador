import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  use: { screenshot: 'only-on-failure',
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    storageState: 'e2e/storageState.json',
  },
  projects: [
    {
      name: 'chromium',
      use: { screenshot: 'only-on-failure', ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
