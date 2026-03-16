import { test, expect } from '@playwright/test'

test('student raise & cancel hand is reflected in teacher monitor', async ({ browser }) => {
  const teacherContext = await browser.newContext()
  await teacherContext.addInitScript(() => {
    try { window.localStorage.setItem('activeClass', 'demo') } catch (e) { }
  })

  const monitorPage = await teacherContext.newPage()
  await monitorPage.goto('http://localhost:3000/class/monitor', { waitUntil: 'domcontentloaded' })
  await monitorPage.waitForSelector('text=即時舉手名單', { timeout: 5000 })

  const studentContext = await browser.newContext()
  await studentContext.addInitScript(() => {
    try {
      window.localStorage.setItem('activeClass', 'demo')
      window.localStorage.setItem('selectedGroup_demo', '1')
      window.localStorage.setItem('participantId', 'e2e_student_1')
    } catch (e) { }
  })
  const studentPage = await studentContext.newPage()
  await studentPage.goto('http://localhost:3000/class/student', { waitUntil: 'domcontentloaded' })
  await studentPage.waitForSelector('button:has-text("舉手")', { timeout: 5000 })

  await studentPage.click('text=舉手')
  await expect(studentPage.locator('text=已舉手')).toBeVisible({ timeout: 5000 })

  await expect(monitorPage.locator('li', { hasText: '組別： 1' })).toBeVisible({ timeout: 7000 })

  await studentPage.click('text=取消舉手')
  await expect(studentPage.locator('button:has-text("舉手")')).toBeVisible({ timeout: 5000 })

  await expect(monitorPage.locator('li', { hasText: '組別： 1' })).toHaveCount(0, { timeout: 7000 })

  await studentContext.close()
  await teacherContext.close()
})
