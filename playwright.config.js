import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    // baseURL used by tests that call page.goto('/path')
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: './test-results' }],
    ['json', { outputFile: './test-results/e2e-results.json' }]
  ],
  webServer: {
    // Use Turbopack by default (faster dev experience)
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
})