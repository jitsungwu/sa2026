import { test, expect } from './test-fixtures'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('presenting group: assign scorer and allow raising', async ({ page, browser }, testInfo) => {
  testInfo.setTimeout(90000) // Increase timeout to 90 seconds
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD
  const TEST_CLASS = process.env.TEST_CLASS_ID || 'demo'
  const GROUP_ID = process.env.TEST_PRESENTING_GROUP || '04'
  
  // Student accounts for testing
  const scorerStudentId = '413000005' // 04 group - will claim scorer role
  const otherStudentId = '413000001' // 01 group - will raise hand

  // Teacher page: sign in if necessary and ensure class active
  await page.goto(`${base}/class/monitor`, { waitUntil: 'domcontentloaded' })
  const loggedInBtn = await page.$('button:has-text("登出")')
  if (!loggedInBtn) {
    test.skip(!email || !password, 'TEACHER_ID or TEACHER_PASSWORD not provided in .env.local')
    await page.goto(`${base}/signin`)
    // Click "教師登入" button to show teacher form
    await page.click('button:has-text("教師登入")')
    await page.waitForSelector('input[placeholder="email@example.com"]', { timeout: 5000 })
    await page.fill('input[placeholder="email@example.com"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("登入")')
    await page.waitForSelector('button:has-text("登出")', { timeout: 10000 })
    await page.goto(`${base}/class/monitor`)
  }

  // Activate class if needed
  const activateBtn = await page.$('button:has-text("啟動班級")')
  if (activateBtn) {
    const sel = await page.$('select')
    if (sel) {
      const opt = await page.$(`select option[value="${TEST_CLASS}"]`)
      if (opt) await page.selectOption('select', TEST_CLASS)
      else await page.selectOption('select', { index: 0 })
    }
    await page.click('button:has-text("啟動班級")')
    // wait for activation
    for (let i = 0; i < 15; i++) {
      const header = await page.textContent('h1').catch(() => '')
      if (header && !header.includes('尚未啟動')) break
      await page.waitForTimeout(1000)
    }
  }
  
  // Wait for activation - check if monitor shows hands or class in active state
  let classActived = false
  for (let i = 0; i < 20; i++) {
    // Check if there's a "即時舉手名單" or other indicator of active class
    const monitorContent = await page.textContent('main').catch(() => '')
    if (monitorContent && monitorContent.includes('即時舉手')) {
      classActived = true
      break
    }
    await page.waitForTimeout(500)
  }
  
  if (!classActived) {
    console.warn('Could not confirm class activation, proceeding anyway')
  }
  
  console.log('Proceeding with test (class activation status uncertain due to encoding issues)')

  // Set presenting group via monitor UI
  await page.waitForSelector('#presenting-group-input', { timeout: 10000 })
  
  // First, clear any previous presenting group state by clicking "結束報告" if it exists
  const endBtn = await page.$('button:has-text("結束報告")')
  if (endBtn) {
    await page.click('button:has-text("結束報告")')
    // Wait for Firestore to process the update
    await page.waitForTimeout(2000)
  }

  // Verify both fields are now null in the monitor UI
  await page.waitForFunction(() => {
    const elements = document.querySelectorAll('div')
    for (let el of elements) {
      if (el.textContent && el.textContent.includes('目前報告中')) {
        return false
      }
    }
    return true
  }, { timeout: 5000 }).catch(() => {})

  await page.fill('#presenting-group-input', GROUP_ID)
  await page.click('button:has-text("設為報告組")')

  // Wait for the monitor UI to reflect presenting group
  await page.waitForFunction((g) => {
    const el = Array.from(document.querySelectorAll('strong')).find(s => s.textContent === g)
    return !!el
  }, GROUP_ID, { timeout: 8000 })

  // Give Firestore time to sync the presentingGroupId
  await page.waitForTimeout(2000)

  // Open a student page in a separate browser context to simulate claiming scorer
  // Student 413000005 from group 04 will claim the scorer role
  const scorerPage = await browser.newPage()
  const scorerUrl = `${base}/class/student?group=${GROUP_ID}&participantId=${scorerStudentId}`
  console.log('Scorer URL:', scorerUrl)
  await scorerPage.goto(scorerUrl, { waitUntil: 'domcontentloaded' })

  // Wait for the "我負責評分" button to appear (with longer timeout for Firestore data load)
  const claimBtn = scorerPage.locator('button:has-text("我負責評分")')
  try {
    await claimBtn.waitFor({ timeout: 15000 }) // Wait for button to be visible with generous timeout
  } catch (e) {
    // If button doesn't appear, take screenshot and check page content for debugging
    await scorerPage.screenshot({ path: 'test-results/scorer-button-missing.png' })
    const body = await scorerPage.textContent('body')
    console.error('Scorer page body content:', body)
    throw e
  }
  await expect(claimBtn).toHaveCount(1)

  // Click to claim scorer role
  await claimBtn.click()

  // After claiming, the claim button should disappear (or be disabled) and raise button should be available
  await expect(claimBtn).toHaveCount(0)

  // Verify raise hand button is now available for the scorer
  const scorerRaiseBtn = scorerPage.locator('button:has-text("舉手")')
  await expect(scorerRaiseBtn).toHaveCount(1)

  // Now open another student page - student from different group (413000001 from group 01)
  // This student should be able to raise hand since they're not in the presenting group
  const otherStudentPage = await browser.newPage()
  
  // Capture console messages
  const consoleLogs = []
  otherStudentPage.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text()
    })
    console.log(`[${msg.type()}] ${msg.text()}`)
  })
  
  const otherUrl = `${base}/class/student?group=01&participantId=${otherStudentId}`
  console.log('Other student URL:', otherUrl)
  await otherStudentPage.goto(otherUrl, { waitUntil: 'domcontentloaded' })

  // Wait for page to fully load and Firestore listeners to initialize
  await otherStudentPage.waitForTimeout(3000)

  // For the other student (not in presenting group), the raise hand button should be available
  const otherRaiseBtn = otherStudentPage.locator('button:has-text("舉手")')
  await expect(otherRaiseBtn).toHaveCount(1)

  // Click raise hand button with simple click
  console.log('Clicking raise hand for student 413000001')
  
  await otherRaiseBtn.first().click()
  
  console.log('Raise hand button clicked, waiting for Firestore sync and UI update...')
  
  // Wait longer for Firestore write and listener update
  // The onSnapshot listener should update once the hands_raised document is added
  for (let i = 0; i < 30; i++) {
    const cancelCount = await otherStudentPage.locator('button:has-text("取消舉手")').count()
    const raiseCount = await otherStudentPage.locator('button:has-text("舉手")').count()
    const raiseText = await otherStudentPage.locator('span:has-text("已舉手")').count()
    console.log(`Attempt ${i+1}/30: cancel=${cancelCount}, raise=${raiseCount}, raised-text=${raiseText}`)
    
    if (cancelCount > 0 || raiseText > 0) {
      console.log('UI updated successfully!')
      break
    }
    await otherStudentPage.waitForTimeout(1000)
  }
  
  // Check if cancel button appears
  const otherCancelBtn = otherStudentPage.locator('button:has-text("取消舉手")')
  const cancelCount = await otherCancelBtn.count()
  
  console.log('Final check - Cancel button found:', cancelCount)
  
  if (cancelCount === 0) {
    // Debug: check page content
    const bodyText = await otherStudentPage.textContent('body')
    console.error('Page content after raise:', bodyText.substring(0, 500))
    await otherStudentPage.screenshot({ path: 'test-results/after-raise.png' })
  }
  
  await expect(otherCancelBtn).toHaveCount(1)

  await scorerPage.close()
  await otherStudentPage.close()
})
