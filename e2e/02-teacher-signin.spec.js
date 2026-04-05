import { test, expect } from './test-fixtures'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

test('teacher signs in, activates class via monitor, and saves storageState', async ({ page, browser }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD

  // Go to monitor first and check if already signed in
  await page.goto(`${base}/class/monitor`)
  const loggedInBtn = await page.$('button:has-text("登出")')

  if (!loggedInBtn) {
    test.skip(!email || !password, 'TEACHER_ID or TEACHER_PASSWORD not provided in .env.local')
    // Not signed in — perform signin
    await page.goto(`${base}/signin`)
    await page.fill('input[placeholder="email@example.com"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("登入")')
    await page.waitForSelector('button:has-text("登出")', { timeout: 10000 })
    await page.goto(`${base}/class/monitor`)
  }

  // If class not active yet, activate via monitor page
  const TEST_CLASS = process.env.TEST_CLASS_ID || 'demo'
  await page.waitForTimeout(1000) // Wait for page to fully load
  const activateBtn = await page.$('button:has-text("啟動班級")')
  if (activateBtn) {
    const sel = await page.$('select')
    if (sel) {
      const opt = await page.$(`select option[value=\"${TEST_CLASS}\"]`)
      if (opt) await page.selectOption('select', TEST_CLASS)
      else await page.selectOption('select', { index: 0 })
    }
    await page.waitForTimeout(500)
    const activateLocator = page.locator('button:has-text("啟動班級")')
    let clicked = false
    for (let i = 0; i < 5; i++) {
      try {
        await activateLocator.click({ timeout: 2000 })
        clicked = true
        break
      } catch (err) {
        await page.waitForTimeout(200)
      }
    }
    if (!clicked) throw new Error('Failed to click activate button after retries')

    // Wait longer for Firestore propagation and class activation
    for (let i = 0; i < 10; i++) {
      const header = await page.textContent('h1')
      if (header && !header.includes('尚未啟動')) break
      await page.waitForTimeout(1000)
    }
  }

  // Wait for monitor to show active class (ensure it's not 尚未啟動)
  await page.waitForSelector('h1', { timeout: 15000 })
  const header = await page.textContent('h1')
  if (header && header.includes('尚未啟動')) {
    throw new Error('Class did not become active')
  }

  // Save storageState for reuse
  const storageDir = path.resolve(process.cwd(), 'e2e')
  try { fs.mkdirSync(storageDir, { recursive: true }) } catch (e) {}
  const statePath = path.join(storageDir, 'teacher-storage.json')
  await page.context().storageState({ path: statePath })
  expect(fs.existsSync(statePath)).toBeTruthy()
})
