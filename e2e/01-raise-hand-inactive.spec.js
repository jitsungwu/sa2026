import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('when class inactive student sees inactive message', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD

  // Step 0: Ensure any active class is ended by visiting monitor and clicking end-class
  await page.goto(`${base}/class/monitor`, { waitUntil: 'domcontentloaded' })
  const loggedIn = await page.$('button:has-text("登出")')
  if (!loggedIn && email && password) {
    // Not logged in, attempt to sign in as teacher
    try {
      await page.goto(`${base}/signin`, { waitUntil: 'domcontentloaded' })
      await page.fill('input[placeholder="email@example.com"]', email)
      await page.fill('input[type="password"]', password)
      await page.click('button:has-text("登入")')
      await page.waitForSelector('button:has-text("登出")', { timeout: 15000 })
      await page.goto(`${base}/class/monitor`, { waitUntil: 'domcontentloaded' })
    } catch (e) {
      // Sign-in failed; proceed
    }
  }

  // Click end-class button if visible to ensure class is inactive
  const endBtn = page.locator('button:has-text("結束上課")')
  if (await endBtn.count() > 0) {
    try {
      await endBtn.click({ timeout: 5000 })
      await page.waitForTimeout(2000)
    } catch (e) {
      // ignore end-class click errors (non-fatal)
    }
  }

  // Step 1: Navigate to student page
  await page.goto(`${base}/class/student`, { waitUntil: 'domcontentloaded' })

  // Wait for the page to render - should show "班級：尚未啟動"
  let header = ''
  for (let i = 0; i < 15; i++) {
    header = await page.locator('h1').textContent().catch(() => '')
    if (header && header.includes('班級：')) break
    await page.waitForTimeout(1000)
  }

  // Verify that when class is inactive, the raise hand button is not visible
  const raiseBtn = page.locator('button:has-text("舉手")')
  await expect(raiseBtn).toHaveCount(0)

  // Verify the header shows inactive status
  expect(header).toContain('尚未啟動')
})
