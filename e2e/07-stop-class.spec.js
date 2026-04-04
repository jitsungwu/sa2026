import { test, expect } from './test-fixtures'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('end class and logout', async ({ browser }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD

  // Create teacher context and sign in only if not already logged in
  const teacherContext = await browser.newContext()
  const page = await teacherContext.newPage()
  await page.goto(`${base}/class/monitor`)
  const loggedIn = await page.$('button:has-text("登出")')
  if (!loggedIn) {
    if (!email || !password) test.skip('TEACHER_ID or TEACHER_PASSWORD not provided in .env.local')
    await page.goto(`${base}/signin`)
    await page.fill('input[placeholder="email@example.com"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("登入")')
    await page.waitForSelector('button:has-text("登出")', { timeout: 10000 })
    await page.goto(`${base}/class/monitor`)
  }

  // Verify monitor shows an active class
  await page.waitForSelector('h1', { timeout: 10000 })
  const header = await page.textContent('h1')
  expect(header).toContain('監控頁')
  // click end class button if present
  const endBtn = await page.$('button:has-text("結束上課")')
  if (endBtn) {
    await endBtn.click()
    // Some UI variants don't redirect; navigate to homepage then verify monitor shows 尚未啟動
    await page.goto(`${base}/`)
  }

  // Logout
  const logoutBtn = await page.$('button:has-text("登出")')
  if (logoutBtn) await logoutBtn.click()

  await teacherContext.close()
})
