import { test, expect } from './test-fixtures'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('simple raise hand', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const TEST_CLASS = process.env.TEST_CLASS_ID || 'demo'
  const studentId = '413000001'

  // Go directly to student page without teacher setup
  // This assumes a class is already active
  const studentUrl = `${base}/class/student?group=01&participantId=${studentId}`
  console.log('Student URL:', studentUrl)
  
  await page.goto(studentUrl, { waitUntil: 'domcontentloaded' })
  console.log('Page loaded')
  
  // Wait for page to fully initialize
  await page.waitForTimeout(5000)
  console.log('After initial wait')

  // Look for raise hand button
  const raiseBtn = page.locator('button:has-text("舉手")')
  const count = await raiseBtn.count()
  console.log('Raise button count:', count)
  
  if (count === 0) {
    const body = await page.textContent('body')
    console.error('Body content:', body.substring(0, 300))
  }
  
  await expect(raiseBtn).toHaveCount(1)
  console.log('Raise button found')

  // Click raise hand
  console.log('Clicking raise hand button')
  await raiseBtn.first().click()
  
  // Wait for state update
  await page.waitForTimeout(5000)
  console.log('After click wait')

  // Check for cancel button
  const cancelBtn = page.locator('button:has-text("取消舉手")')
  const cancelCount = await cancelBtn.count()
  console.log('Cancel button count:', cancelCount)
  
  if (cancelCount === 0) {
    const body = await page.textContent('body')
    console.error('Body after raise:', body.substring(0, 300))
  }
  
  await expect(cancelBtn).toHaveCount(1)
  console.log('Test passed!')
})
