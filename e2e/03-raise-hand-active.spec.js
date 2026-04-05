import { test, expect } from './test-fixtures'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('student raise & cancel hand is reflected in teacher monitor', async ({ browser }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD

  // Create teacher context and check if already signed in; sign in only if needed
  const teacherContext = await browser.newContext()
  const monitorPage = await teacherContext.newPage()
  await monitorPage.goto(`${base}/class/monitor`)
  const loggedIn = await monitorPage.$('button:has-text("登出")')
  if (!loggedIn) {
    if (!email || !password) test.skip('TEACHER_ID or TEACHER_PASSWORD not provided in .env.local')
    await monitorPage.goto(`${base}/signin`)
    await monitorPage.fill('input[placeholder="email@example.com"]', email)
    await monitorPage.fill('input[type="password"]', password)
    await monitorPage.click('button:has-text("登入")')
    await monitorPage.waitForSelector('button:has-text("登出")', { timeout: 10000 })
    await monitorPage.goto(`${base}/class/monitor`)
  }

  // If class not active yet, activate the TEST_CLASS via the monitor UI (makes test independent)
  const TEST_CLASS = process.env.TEST_CLASS_ID || 'demo'
  await monitorPage.waitForTimeout(1000) // Wait for page to fully load
  const activateBtn = await monitorPage.$('button:has-text("啟動班級")')
  if (activateBtn) {
    const sel = await monitorPage.$('select')
    if (sel) {
      const opt = await monitorPage.$(`select option[value=\"${TEST_CLASS}\"]`)
      if (opt) await monitorPage.selectOption('select', TEST_CLASS)
      else await monitorPage.selectOption('select', { index: 0 })
    }
    await monitorPage.waitForTimeout(500)
    const activateLocator = monitorPage.locator('button:has-text("啟動班級")')
    let clicked = false
    for (let i = 0; i < 5; i++) {
      try {
        await activateLocator.click({ timeout: 2000 })
        clicked = true
        break
      } catch (err) {
        await monitorPage.waitForTimeout(200)
      }
    }
    if (!clicked) throw new Error('Failed to click activate button after retries')
    
    // Wait longer for Firestore propagation and class activation
    for (let i = 0; i < 10; i++) {
      const header = await monitorPage.textContent('h1')
      if (header && !header.includes('尚未啟動')) break
      await monitorPage.waitForTimeout(1000)
    }

    const header2 = await monitorPage.textContent('h1')
    if (header2 && header2.includes('尚未啟動')) {
      throw new Error(`Class activation failed: header still shows "${header2}"`)
    }
  }

  // Ensure HandsMonitor is visible (active class propagated)
  await monitorPage.waitForSelector('text=即時舉手名單', { timeout: 15000 })

  // Student context: navigate to student page with participantId and group query params
  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  await studentPage.goto(`${base}/class/student?participantId=e2e_student_1&group=1`, { waitUntil: 'domcontentloaded' })
  
  // Wait for the StudentPage h1 to show the active class ID (ensures Firestore onSnapshot has fired and classId is set)
  // This indicates StudentClient has received classId and should render RaiseHandButton
  const TEST_CLASS_DISPLAY = `學生頁 — 班級：${TEST_CLASS}`
  await studentPage.waitForSelector(`h1:has-text("${TEST_CLASS_DISPLAY}")`, { timeout: 15000 })
  
  // Now wait for the RaiseHandButton itself
  await studentPage.waitForSelector('button:has-text("舉手")', { timeout: 15000 })

  await studentPage.click('text=舉手')
  await expect(studentPage.locator('text=已舉手')).toBeVisible({ timeout: 7000 })

  // Wait for the monitor to receive the raised hand and show the owner entry
  const ownerLocator = monitorPage.locator('li[data-owner="e2e_student_1"]')
  await ownerLocator.waitFor({ timeout: 15000 })
  await expect(ownerLocator).toContainText('組別')
  await expect(ownerLocator).toContainText('1')

  await studentPage.click('text=取消舉手')
  await expect(studentPage.locator('button:has-text("舉手")')).toBeVisible({ timeout: 7000 })

  await expect(monitorPage.locator('li[data-owner="e2e_student_1"]')).toHaveCount(0, { timeout: 15000 })

  await studentContext.close()
  await teacherContext.close()
})
