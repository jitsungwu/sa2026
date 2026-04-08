import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Run tests sequentially to respect stateful dependencies between tests
  workers: 1,
  fullyParallel: false,
  timeout: 90 * 1000,  // Increased to 90s for complex E2E flows with Firebase
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