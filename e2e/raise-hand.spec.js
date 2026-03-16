import { test, expect } from '@playwright/test'

test('student raise & cancel hand is reflected in teacher monitor', async ({ browser }) => {
  // teacher opens homepage and activates a class
  const teacherContext = await browser.newContext()
  // Ensure teacher context has activeClass set before any page loads
  await teacherContext.addInitScript(() => {
    try { window.localStorage.setItem('activeClass', '2A') } catch (e) { }
  })

  // Open monitor in the teacher context (localStorage will be pre-set)
  const monitorPage = await teacherContext.newPage()
  await monitorPage.goto('http://localhost:3000/class/monitor', { waitUntil: 'domcontentloaded' })

  // Wait for the monitor UI to load
  await monitorPage.waitForSelector('text=即時舉手名單', { timeout: 5000 })

  // Student context: set the same activeClass and selectedGroup in localStorage
  const studentContext = await browser.newContext()
  // Pre-populate localStorage for pages opened in this context
  await studentContext.addInitScript(() => {
    try {
      window.localStorage.setItem('activeClass', '2A')
      window.localStorage.setItem('selectedGroup', '1')
      window.localStorage.setItem('participantId', 'e2e_student_1')
    } catch (e) {
      // ignore
    }
  })
  const studentPage = await studentContext.newPage()
  // Now navigate to the student UI
  await studentPage.goto('http://localhost:3000/class/student', { waitUntil: 'domcontentloaded' })
  await studentPage.waitForSelector('text=舉手', { timeout: 5000 })

  // Student raises hand
  await studentPage.click('text=舉手')
  await expect(studentPage.locator('text=已舉手')).toBeVisible({ timeout: 5000 })

  // Teacher monitor should show one active hand from group 1
  await expect(monitorPage.locator('li', { hasText: '組別： 1' })).toBeVisible({ timeout: 7000 })

  // Student cancels hand
  await studentPage.click('text=取消舉手')
  await expect(studentPage.locator('text=舉手')).toBeVisible({ timeout: 5000 })

  // Monitor should no longer show the hand
  await expect(monitorPage.locator('li', { hasText: '組別： 1' })).toHaveCount(0, { timeout: 7000 })

  await studentContext.close()
  await teacherContext.close()
})
