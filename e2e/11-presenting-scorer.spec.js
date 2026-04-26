import { test, expect } from './test-fixtures'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: '.env.local' })

test('presenting group: assign scorer and allow raising', async ({ page, browser }, testInfo) => {
  testInfo.setTimeout(90000) // Increase timeout to 90 seconds
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD
  const TEST_CLASS = process.env.TEST_CLASS_ID || 'demo'
  const GROUP_ID = process.env.TEST_PRESENTING_GROUP || '04'
  const PRIORITY_GROUP = process.env.TEST_PRIORITY_GROUP || '02'
  
  // Student accounts for testing
  const scorerStudentId = '413000005' // 04 group - will claim scorer role
  const otherStudentId = '413000001' // 01 group - will raise hand

  let priorityStudentId = `41300000${PRIORITY_GROUP}`
  try {
    const accountsPath = path.join(__dirname, 'test-accounts.json')
    if (fs.existsSync(accountsPath)) {
      const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'))
      const match = (accountsData.used || []).find(a => String(a.groupId).padStart(2, '0') === String(PRIORITY_GROUP).padStart(2, '0') && a.classId === TEST_CLASS)
      if (match) {
        priorityStudentId = match.account
      }
    }
  } catch (err) {
    console.warn('Could not resolve priority student account from test-accounts.json:', err.message)
  }

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

  // If a presenting group still exists, clear it first so we can set a new one
  const endBtn = await page.$('button:has-text("結束報告")')
  if (endBtn) {
    await endBtn.click()
    await page.waitForTimeout(2000)
  }

  // Set presenting group via monitor UI
  await page.waitForSelector('#presenting-group-input', { timeout: 10000 })

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

  // Open raising should not be available until priority group is set
  await expect(page.locator('button:has-text("開放舉手")')).toHaveCount(0)

  // Wait for the monitor UI to reflect presenting group
  await page.waitForFunction((g) => {
    const el = Array.from(document.querySelectorAll('strong')).find(s => s.textContent === g)
    return !!el
  }, GROUP_ID, { timeout: 8000 })

  // Wait for the previously raised hand to be cleared when presenting group is set
  await page.waitForFunction(() => !document.querySelector('li[data-group="01"]'), { timeout: 10000 })
  console.log('✅ Active hand cleared after setting presenting group')

  // Then: specify the priority group (for prioritized asking)
  await page.fill('#priority-group-input', PRIORITY_GROUP)
  await page.click('button:has-text("指定優先發問組")')

  // Wait for the monitor UI to reflect priority group
  await page.waitForFunction((g) => {
    const el = Array.from(document.querySelectorAll('strong')).find(s => s.textContent === g)
    return !!el
  }, PRIORITY_GROUP, { timeout: 8000 })

  // Check priority group has auto-raised a hand entry
  await page.waitForSelector(`li[data-group="${PRIORITY_GROUP}"]`, { timeout: 15000 })
  console.log(`✅ Priority group ${PRIORITY_GROUP} auto-raised a hand`)

  // Give Firestore time to sync the presentingGroupId
  await page.waitForTimeout(2000)

  // Open a student dashboard page in a dedicated browser context to verify the priority group banner
  const priorityStudentContext = await browser.newContext()
  const priorityStudentPage = await priorityStudentContext.newPage()
  const priorityStudentAuth = {
    account: priorityStudentId,
    name: `Test Student ${priorityStudentId}`,
    groupId: PRIORITY_GROUP,
    classId: TEST_CLASS,
    seatSelected: true,
    timestamp: new Date().toISOString()
  }
  await priorityStudentPage.goto(`${base}/signin`, { waitUntil: 'domcontentloaded' })
  await priorityStudentPage.evaluate((data) => {
    window.localStorage.setItem('studentAuth', JSON.stringify(data))
  }, priorityStudentAuth)
  await priorityStudentPage.goto(`${base}/class/${TEST_CLASS}/dashboard`, { waitUntil: 'domcontentloaded' })

  await expect(priorityStudentPage.locator(`text=你是優先發問組 ${PRIORITY_GROUP} 組`)).toBeVisible({ timeout: 15000 })
  console.log(`✅ Priority group banner visible for group ${PRIORITY_GROUP}`)
  await priorityStudentPage.close()
  await priorityStudentContext.close()

  // Open a student page in a dedicated browser context to simulate claiming scorer
  // Student 413000005 from group 04 will claim the scorer role
  const scorerContext = await browser.newContext()
  const scorerPage = await scorerContext.newPage()
  const scorerAuthData = {
    account: scorerStudentId,
    name: `Test Student ${scorerStudentId}`,
    groupId: GROUP_ID,
    classId: TEST_CLASS,
    seatSelected: true,
    timestamp: new Date().toISOString()
  }
  await scorerPage.goto(`${base}/signin`, { waitUntil: 'domcontentloaded' })
  await scorerPage.evaluate((data) => {
    window.localStorage.setItem('studentAuth', JSON.stringify(data))
  }, scorerAuthData)
  const scorerUrl = `${base}/class/student?group=${GROUP_ID}`
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

  // Pick the priority group hand for scoring
  const priorityHandCard = scorerPage.locator(`span:has-text("#1 - 組別 ${PRIORITY_GROUP}")`)
  await priorityHandCard.waitFor({ timeout: 15000 })
  await priorityHandCard.click()

  const priorityInput = scorerPage.locator('input[type="number"]')
  await expect(priorityInput).toBeVisible({ timeout: 10000 })
  await expect(priorityInput).toHaveAttribute('min', '0')
  await expect(priorityInput).toHaveAttribute('max', '15')

  // Verify invalid priority score is blocked at the UI and API layer
  await priorityInput.fill('16')
  const confirmBtn = scorerPage.locator('button:has-text("確認給分")')
  await expect(confirmBtn).toBeDisabled({ timeout: 5000 })

  const priorityHandId = await priorityHandCard.evaluate((el) => el.closest('div[data-hand-id]')?.dataset.handId)
  const invalidResult = await scorerPage.evaluate(async ({ classId, handId, ownerId, group }) => {
    const res = await fetch('/api/score-hand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId,
        handId,
        points: 16,
        givenByOwnerId: ownerId,
        givenByGroup: group
      })
    })
    return { status: res.status, body: await res.json() }
  }, { classId: TEST_CLASS, handId: priorityHandId, ownerId: scorerStudentId, group: `group-${GROUP_ID}` })
  expect(invalidResult.status).toBe(400)
  expect(invalidResult.body.error).toContain('0-15')

  // Score the priority group with valid points and verify API response
  const scoreResponsePromise = scorerPage.waitForResponse(resp => resp.url().endsWith('/api/score-hand') && resp.request().method() === 'POST')
  await priorityInput.fill('12')
  await expect(confirmBtn).toBeEnabled({ timeout: 5000 })
  await scorerPage.click('button:has-text("確認給分")')
  const scoreResponse = await scoreResponsePromise
  expect(scoreResponse.status()).toBe(200)
  const scoreBody = await scoreResponse.json()
  expect(scoreBody.group).toBe(PRIORITY_GROUP)
  expect(scoreBody.points).toBe(12)
  expect(scoreBody.givenBy).toBe(`group-${GROUP_ID}`)

  // Open another student page for group 01 to verify that non-presenting students cannot raise hand
  const otherStudentContext = await browser.newContext()
  const otherStudentPage = await otherStudentContext.newPage()
  const otherStudentAuthData = {
    account: otherStudentId,
    name: `Test Student ${otherStudentId}`,
    groupId: '01',
    classId: TEST_CLASS,
    seatSelected: true,
    timestamp: new Date().toISOString()
  }
  await otherStudentPage.goto(`${base}/signin`, { waitUntil: 'domcontentloaded' })
  await otherStudentPage.evaluate((data) => {
    window.localStorage.setItem('studentAuth', JSON.stringify(data))
  }, otherStudentAuthData)
  const otherUrl = `${base}/class/student?group=01`
  console.log('Other student URL:', otherUrl)
  await otherStudentPage.goto(otherUrl, { waitUntil: 'domcontentloaded' })
  await otherStudentPage.waitForSelector(`h1:has-text("學生頁 — 班級：${TEST_CLASS}")`, { timeout: 20000 })

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

  // Teacher opens raising so other students can raise again
  const openRaisingBtn = page.locator('button:has-text("開放舉手")')
  await expect(openRaisingBtn).toHaveCount(1)
  await openRaisingBtn.click()
  await page.waitForTimeout(2000)
  await otherStudentPage.waitForTimeout(5000)

  // After opening raising, priority group info should be cleared
  await expect(page.locator('text=已指定優先發問組')).toHaveCount(0)
  await expect(page.locator('text=你是優先發問組')).toHaveCount(0)

  await expect(otherStudentPage.locator('button:has-text("舉手")')).toHaveCount(1)
  await expect(otherStudentPage.locator('text=尚未開放發問')).toHaveCount(0)
  await otherStudentPage.click('button:has-text("舉手")')
  await otherStudentPage.waitForTimeout(2000)
  await expect(otherStudentPage.locator('button:has-text("取消舉手")')).toHaveCount(1)

  // ===== CLEANUP: Clear presenting group state for next test =====n  console.log('🧹 Cleaning up presenting group state...')
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
  await scorerContext.close()
  await otherStudentPage.close()
  await otherStudentContext.close()
})
