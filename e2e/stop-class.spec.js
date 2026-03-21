import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('activate then end class clears activeClass and redirects', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD

  test.skip(!email || !password, 'TEACHER_ID or TEACHER_PASSWORD not provided in .env.local')

  // Sign in first via dedicated page, then go home to activate
  await page.goto(`${base}/signin`)
  await page.fill('input[placeholder="email@example.com"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("登入")')
  // wait for the sign-in to complete (登出 button visible)
  await page.waitForSelector('button:has-text("登出")', { timeout: 15000 })
  // navigate home
  await page.goto(`${base}/`)

  // Activate class via UI if activation UI present (may already be active)
  const activateBtn = await page.$('button:has-text("啟動班級")')
  if (activateBtn) {
    const sel = await page.$('select')
    if (sel) await page.selectOption('select', { index: 0 })
    await activateBtn.click()
  }
  await page.waitForTimeout(500)
  // Enter teacher monitor (if button exists)
  const enterBtn = await page.$('button:has-text("進入老師管理")')
  if (enterBtn) {
    await enterBtn.click()
    await page.waitForURL('**/class/monitor')
  } else {
    await page.goto(`${base}/class/monitor`)
  }

  // Verify monitor shows an active class (not '尚未啟動')
  await page.waitForSelector('h1', { timeout: 10000 })
  const header = await page.textContent('h1')
  expect(header).toContain('監控頁')
  expect(header).not.toContain('尚未啟動')

  // Click end class
  await page.click('button:has-text("結束上課")')

  // Redirect to homepage
  await page.waitForURL('**/')

  // Confirm class is no longer active by checking monitor shows 尚未啟動
  await page.goto(`${base}/class/monitor`)
  await page.waitForSelector('text=尚未啟動', { timeout: 10000 })
})
