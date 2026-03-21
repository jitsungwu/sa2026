import { test, expect } from '@playwright/test'

test('student raise & cancel hand is reflected in teacher monitor', async ({ browser }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD

  // Create teacher context and sign in, then activate a class via the UI so Firestore has an active class
  const teacherContext = await browser.newContext()
  const monitorPage = await teacherContext.newPage()
  // Sign in as teacher
  await monitorPage.goto(`${base}/signin`)
  await monitorPage.fill('input[placeholder="email@example.com"]', email)
  await monitorPage.fill('input[type="password"]', password)
  await monitorPage.click('button:has-text("登入")')
  // Wait for sign-in to complete (登出 按鈕 appears), then ensure activate UI appears
  await monitorPage.waitForSelector('button:has-text("登出")', { timeout: 10000 })
  await monitorPage.goto(`${base}/class/monitor`)

  // If activation UI is present (no active class), activate; otherwise assume an active class already exists
  const activateBtn = await monitorPage.$('button:has-text("啟動班級")')
  if (activateBtn) {
    const sel = await monitorPage.$('select')
    if (sel) await monitorPage.selectOption('select', { index: 0 })
    await activateBtn.click()
  }

  // Ensure HandsMonitor is visible (active class propagated)
  await monitorPage.waitForSelector('text=即時舉手名單', { timeout: 10000 })

  // Student context: navigate to student page with participantId and group query params
  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  await studentPage.goto(`${base}/class/student?participantId=e2e_student_1&group=1`, { waitUntil: 'domcontentloaded' })
  await studentPage.waitForSelector('button:has-text("舉手")', { timeout: 7000 })

  await studentPage.click('text=舉手')
  await expect(studentPage.locator('text=已舉手')).toBeVisible({ timeout: 7000 })

  await expect(monitorPage.locator('li[data-owner="e2e_student_1"]', { hasText: '組別： 1' })).toBeVisible({ timeout: 9000 })

  await studentPage.click('text=取消舉手')
  await expect(studentPage.locator('button:has-text("舉手")')).toBeVisible({ timeout: 7000 })

  await expect(monitorPage.locator('li[data-owner="e2e_student_1"]')).toHaveCount(0, { timeout: 9000 })

  await studentContext.close()
  await teacherContext.close()
})
