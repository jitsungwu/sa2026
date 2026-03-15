import { test, expect } from '@playwright/test'

test.describe('Test List E2E', () => {
  test('displays students from test collection', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
    // click the link to navigate to /test-list
    await page.click('a[href="/test-list"]')
    await page.waitForSelector('table')

    // Assert at least one known student name
    await expect(page.locator('text=王小明')).toBeVisible()

    // Assert there are at least 10 student rows
    const rows = await page.locator('table tbody tr').count()
    expect(rows).toBeGreaterThanOrEqual(10)
  })
})