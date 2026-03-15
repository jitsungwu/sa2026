import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.test.js'],
    exclude: ['**/__tests__/**/*.test.jsx', '**/node_modules/**', '**/.next/**'],
    reporters: ['default', 'html'],
    outputFile: {
      html: './test-results/vitest-report.html'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      outputDir: './test-results/coverage'
    }
  }
})