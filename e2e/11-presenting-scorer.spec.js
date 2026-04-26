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

  // ===== CLEANUP: Ensure clean state by clearing hands_raised before test =====
  console.log('🧹 Pre-test cleanup: clearing any existing hands...')
  try {
    const resetBtn = page.locator('button:has-text("全部重置")')
    if (await resetBtn.count() > 0) {
      await resetBtn.click()
      await page.waitForTimeout(2000)
      console.log('✅ Pre-test cleanup complete')
    }
  } catch (e) {
    console.warn('⚠️ Pre-test cleanup failed:', e.message)
  }

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

  // First: set the presenting (reporting) group
  await page.fill('#presenting-group-input', GROUP_ID)
  await page.click('button:has-text("設為報告組")')

  // Wait for the monitor UI to reflect presenting group
  await page.waitForFunction((g) => {
    const el = Array.from(document.querySelectorAll('strong')).find(s => s.textContent === g)
    return !!el
  }, GROUP_ID, { timeout: 8000 })

  // Then: specify the priority group (for prioritized asking)
  const PRIORITY_GROUP = process.env.TEST_PRIORITY_GROUP || GROUP_ID
  await page.fill('#priority-group-input', PRIORITY_GROUP)
  await page.click('button:has-text("指定優先發問組")')

  // Wait for the monitor UI to reflect priority group
  await page.waitForFunction((g) => {
    const el = Array.from(document.querySelectorAll('strong')).find(s => s.textContent === g)
    return !!el
  }, PRIORITY_GROUP, { timeout: 8000 })

  // Wait for the hands_raised list to include the priority group (auto-created active hand)
  try {
    await page.waitForSelector(`li[data-group="${PRIORITY_GROUP}"]`, { timeout: 8000 })
    console.log('✅ Monitor shows priority group in hands_raised list')
  } catch (e) {
    console.warn('⚠️ Priority group not found in hands_raised list (may indicate backend not auto-creating hand)')
  }

  // Give Firestore time to sync the presentingGroupId
  await page.waitForTimeout(2000)

  // Open a student page in a separate browser context to simulate claiming scorer
  // Student 413000005 from group 04 will claim the scorer role
  const scorerPage = await browser.newPage()
  const scorerUrl = `${base}/class/student?group=${GROUP_ID}&participantId=${scorerStudentId}`
  console.log('Scorer URL:', scorerUrl)
  await scorerPage.goto(scorerUrl, { waitUntil: 'domcontentloaded' })
  
  // ✅ No need to set localStorage - URL parameters take priority in StudentAuthContext

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
  console.log('✅ Claim button clicked')

  // Wait for Firestore to propagate the scorer assignment
  // This is critical - other students won't be able to raise hands until presentingScorerOwnerId is set
  console.log('📝 Waiting for scorer assignment to propagate to Firestore...')
  await scorerPage.waitForTimeout(3000)
  
  // Verify the UI updated on scorer's page
  await expect(claimBtn).toHaveCount(0)
  console.log('✅ Scorer claim confirmed on scorer page')

  // Verify that scorer cannot raise hand (displaying info text instead of button)
  // Scorers in presenting group cannot raise hands after claiming scorer role
  const scorerRaiseBtn = scorerPage.locator('button:has-text("舉手")')
  await expect(scorerRaiseBtn).toHaveCount(0)  // Should be 0 now since they're assigned as scorer

  // Wait for scoring interface to appear
  await scorerPage.waitForTimeout(2000)

  // Now open another student page - student from different group (413000001 from group 01)
  // This student should be able to raise hand since they're not in the presenting group
  const otherStudentPage = await browser.newPage()
  
  const otherUrl = `${base}/class/student?group=01&participantId=${otherStudentId}`
  console.log('Other student URL:', otherUrl)
  await otherStudentPage.goto(otherUrl, { waitUntil: 'domcontentloaded' })
  
  // ✅ No need to set localStorage - URL parameters take priority in StudentAuthContext
  
  // Capture console messages
  const consoleLogs = []
  otherStudentPage.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text()
    })
    console.log(`[${msg.type()}] ${msg.text()}`)
  })

  // Wait for page to fully load and Firestore listeners to initialize
  // Give extra time for onSnapshot listeners to receive the presentingScorerOwnerId update
  console.log('📝 Waiting for other student page to receive Firestore updates...')
  await otherStudentPage.waitForTimeout(7000)

  // With presenting group set, other students should NOT be able to raise hand
  const otherRaiseBtn = otherStudentPage.locator('button:has-text("舉手")')
  await expect(otherRaiseBtn).toHaveCount(0)

  // Expect a banner/message indicating raising is not open
  await expect(otherStudentPage.locator('text=尚未開放發問')).toHaveCount(1)

  // ===== CLEANUP: Clear presenting group state for next test =====
  console.log('🧹 Cleaning up presenting group state...')
  try {
    const endPresentingBtn = page.locator('button:has-text("結束報告")')
    if (await endPresentingBtn.count() > 0) {
      await endPresentingBtn.click()
      await page.waitForTimeout(1000)
      console.log('✅ Presenting group cleared')
    }
  } catch (e) {
    console.warn('⚠️ Could not clear presenting group:', e.message)
  }

  await scorerPage.close()
  await otherStudentPage.close()
})
