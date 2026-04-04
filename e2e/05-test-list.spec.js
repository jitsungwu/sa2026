import { test, expect } from './test-fixtures'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test.describe('Test List E2E', () => {
  test('displays students from test collection', async ({ page }) => {
    const base = process.env.BASE_URL || 'http://localhost:3000'
    // navigate directly to the test-list page to avoid depending on homepage links
    await page.goto(`${base}/test-list`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('table')

    // Assert at least one known student name
    await expect(page.locator('text=王小明')).toBeVisible()

    // Assert there are at least 10 student rows
    const rows = await page.locator('table tbody tr').count()
    expect(rows).toBeGreaterThanOrEqual(10)
  })
})
