import { test, expect } from '@playwright/test'

test.describe('Test List E2E', () => {
  test('displays students from test collection', async ({ page }) => {
    // navigate directly to the test-list page to avoid depending on homepage links
    await page.goto('http://localhost:3000/test-list', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('table')

    // Assert at least one known student name
    await expect(page.locator('text=王小明')).toBeVisible()

    // Assert there are at least 10 student rows
    const rows = await page.locator('table tbody tr').count()
    expect(rows).toBeGreaterThanOrEqual(10)
  })
})