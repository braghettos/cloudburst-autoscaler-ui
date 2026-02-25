import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.UI_BASE_URL || 'http://localhost:8082'

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'ui-e2e',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Use system Chrome to avoid browser download
      },
    },
  ],
  timeout: 30000,
  expect: { timeout: 10000 },
})
