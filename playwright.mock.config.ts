import { defineConfig, devices } from '@playwright/test'

const PORT = 5200

/**
 * Full UI functionality suite against local mock auth/data (no Supabase required).
 * Run: npx playwright test -c playwright.mock.config.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/portal-full-functionality.spec.ts',
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
  projects: [{ name: 'chromium-mock', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      VITE_USE_SUPABASE_AUTH: 'false',
      VITE_USE_SUPABASE_DATA: 'false',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
})
