import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('teacher signin redirects to monitor', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD

  test.skip(!email || !password, 'TEACHER_ID or TEACHER_PASSWORD not provided in .env.local')

  await page.goto(`${base}/signin`)
  await page.fill('input[placeholder="email@example.com"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("登入")')

  // wait for redirect to monitor page
  await page.waitForURL('**/class/monitor', { timeout: 10000 })
  expect(page.url()).toContain('/class/monitor')
})
