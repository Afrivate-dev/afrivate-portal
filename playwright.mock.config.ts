import { defineConfig, devices } from '@playwright/test'

const PORT = 5200

const mockEnv = {
  ...process.env,
  VITE_USE_SUPABASE_AUTH: 'false',
  VITE_USE_SUPABASE_DATA: 'false',
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
}

/**
 * Full UI functionality suite against local mock auth/data (no Supabase required).
 * Run: npx playwright test -c playwright.mock.config.ts
 * Responsive only: npx playwright test -c playwright.mock.config.ts --project=mobile-responsive
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium-mock',
      testMatch: '**/portal-full-functionality.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-responsive',
      testMatch: '**/portal-responsive.spec.ts',
      use: {
        ...devices['Pixel 5'],
        isMobile: true,
      },
    },
    {
      name: 'tablet-responsive',
      testMatch: '**/portal-responsive.spec.ts',
      use: {
        ...devices['Galaxy Tab S4'],
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: mockEnv,
  },
})
