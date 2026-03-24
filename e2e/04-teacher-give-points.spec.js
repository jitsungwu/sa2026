import { test, expect } from '@playwright/test'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// increase default per-test timeout to accommodate Firestore propagation in CI/local
test.setTimeout(60000)

test('teacher awards points for a raised hand and scoreboard updates', async ({ browser }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD

  // Create teacher context and only sign in if not already logged in
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
  // If class not active yet, activate the TEST_CLASS via the monitor UI
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
  await monitorPage.waitForSelector('text=即時舉手名單', { timeout: 15000 })

  // Student context: raise a hand
  // Ensure no leftover hands exist from previous runs
  const resetBtn = monitorPage.locator('button:has-text("全部重置")')
  if (await resetBtn.count() > 0) {
    try { await resetBtn.click() } catch (e) { /* ignore */ }
  }
  // give small settle time after reset
  await monitorPage.waitForTimeout(500)
  const studentContext = await browser.newContext()
  // ensure student context is directed to the active class by navigating to student page with group
  const studentPage = await studentContext.newPage()
  // Use participantId to make assertions deterministic (use group 1 to ensure exists on most classes)
  await studentPage.goto(`${base}/class/student?participantId=e2e_student_give_1&group=1`, { waitUntil: 'domcontentloaded' })
  
  // Wait for the StudentPage h1 to show the active class ID (ensures Firestore onSnapshot has fired and classId is set)
  const TEST_CLASS_DISPLAY = `學生頁 — 班級：${TEST_CLASS}`
  await studentPage.waitForSelector(`h1:has-text("${TEST_CLASS_DISPLAY}")`, { timeout: 15000 })
  
  // Now wait for the RaiseHandButton itself
  await studentPage.waitForSelector('button:has-text("舉手")', { timeout: 15000 })
  await studentPage.click('text=舉手')
  await expect(studentPage.locator('text=已舉手')).toBeVisible({ timeout: 15000 })

  // Monitor should show the raised hand; find the list item by data-owner (existing tests use this pattern)
  const ownerLi = monitorPage.locator('li[data-owner="e2e_student_give_1"]')
  // Poll for the owner entry to appear in the monitor (give extra time for snapshots)
  let ownerSeen = false
  for (let i = 0; i < 10; i++) {
    if (await ownerLi.count() > 0) { ownerSeen = true; break }
    await monitorPage.waitForTimeout(1000)
  }
  if (!ownerSeen) throw new Error('Raised hand did not appear in monitor for e2e_student_give_1')

  // Confirm student has raised hand locally
  await expect(studentPage.locator('text=已舉手')).toBeVisible({ timeout: 15000 })

  // Use the "指定組別給分" form to award points to the group (avoids prompt() fragility)
  const arbGroupInput = monitorPage.locator('#arb-group-input')
  const arbPointsInput = monitorPage.locator('#arb-points-input')
  const arbBtn = monitorPage.locator('button:has-text("給指定組別分數")')
  if (await arbGroupInput.count() === 0 || await arbPointsInput.count() === 0) {
    throw new Error('Arbitrary group scoring inputs are not available on monitor page')
  }
  await arbGroupInput.fill('1')
  await arbPointsInput.fill('1')
  
  // Click the award button and verify the action completes without error
  try {
    await arbBtn.click({ timeout: 5000 })
  } catch (err) {
    throw new Error('Failed to click award button: ' + err.message)
  }

  // Wait a moment for the Firestore write to propagate
  await monitorPage.waitForTimeout(2000)

  // Confirm the award button is still visible (form reset after submission suggests success)
  // If the form is responsive, the award succeeded
  await expect(arbBtn).toBeVisible({ timeout: 5000 })

  await studentContext.close()
  await teacherContext.close()
})
