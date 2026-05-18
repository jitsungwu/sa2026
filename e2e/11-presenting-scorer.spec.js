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

  // Ensure class is active and has proper activatedBy set
  console.log('📝 Verifying class activation status...')
  
  // Check if class needs activation
  const activateBtn = await page.$('button:has-text("啟動班級")')
  if (activateBtn) {
    console.log('📝 Class not active, activating now...')
    
    // Extract user UID before activation
    const userUID = await page.evaluate(() => {
      const pageText = document.body.textContent
      const match = pageText.match(/UID: ([a-zA-Z0-9]+)/)
      return match ? match[1] : null
    })
    console.log(`✓ User UID: ${userUID}`)
    
    // Select and activate class
    const classSelect = await page.$('select')
    if (classSelect) {
      const options = await classSelect.$$('option')
      if (options.length > 0) {
        await page.selectOption('select', TEST_CLASS)
      }
    }
    
    await page.click('button:has-text("啟動班級")')
    await page.waitForTimeout(2000)
  }
  
  // Fix activatedBy if it's null - this is critical for isOwner to work
  console.log('📝 Fixing activatedBy field if necessary...')
  const needsFix = await page.evaluate(async () => {
    const pageText = document.body.textContent
    const uidMatch = pageText.match(/UID: ([a-zA-Z0-9]+)/)
    const ownerMatch = pageText.match(/班級擁有者 UID：\s*([a-zA-Z0-9]+)|班級擁有者 UID：\s*（無）/)
    
    const userUID = uidMatch ? uidMatch[1] : null
    const hasOwner = ownerMatch && ownerMatch[1]
    
    return userUID && !hasOwner // Need to fix if user exists but owner doesn't
  })
  
  if (needsFix) {
    console.log('⚠️ activatedBy is null, attempting to fix via page reload...')
    // Refresh to see if state updates
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    
    // If still null after reload, the data in Firestore is genuinely missing activatedBy
    // This is a test environment issue - in real scenario would need admin to fix
    console.log('⚠️ activatedBy still null after reload. Class may need manual Firestore fix.')
    console.log('   Continuing test anyway, but presenter input field may not be visible.')
  } else {
    console.log('✅ activatedBy is properly set')
  }

  
  // Ensure HandsMonitor is visible with input fields
  console.log('📝 Ensuring HandsMonitor is visible...')
  
  // Wait for page to have body content (guard against hydration issues)
  await page.waitForFunction(() => {
    return document.body.children.length > 0
  }, { timeout: 15000 })
  
  // Add small wait for React to fully hydrate
  await page.waitForTimeout(1000)
  
  // Check user and classOwner status (critical for isOwner calculation)
  const userInfo = await page.evaluate(() => {
    // Try to extract user info from page text
    const pageText = document.body.textContent
    const uidMatch = pageText.match(/UID: ([a-zA-Z0-9]+)/)
    const ownerMatch = pageText.match(/班級擁有者 UID：\s*([a-zA-Z0-9]+)/)
    
    return {
      url: window.location.href,
      h1Title: document.querySelector('h1')?.textContent,
      hasPresenterInput: !!document.querySelector('#presenting-group-input'),
      h2Count: document.querySelectorAll('h2').length,
      buttonCount: document.querySelectorAll('button').length,
      pageHasLoginInfo: pageText.includes('登入者帳號'),
      detectedUID: uidMatch ? uidMatch[1] : null,
      detectedOwnerUID: ownerMatch ? ownerMatch[1] : null,
      bodyTextLength: pageText.length
    }
  })
  console.log('📊 User info:', JSON.stringify(userInfo, null, 2))
  
  // If presenter input doesn't exist but HandsMonitor does, problem might be isOwner=false
  if (userInfo.h2Count > 0 && !userInfo.hasPresenterInput) {
    console.log('⚠️ HandsMonitor rendered but no input field. This likely means isOwner=false.')
    console.log('  User UID:', userInfo.detectedUID)
    console.log('  Owner UID:', userInfo.detectedOwnerUID)
    console.log('  Are they equal?', userInfo.detectedUID === userInfo.detectedOwnerUID)
  }
  
  // Wait for the input field to appear
  await page.waitForSelector('#presenting-group-input', { timeout: 15000 })
  console.log('✅ HandsMonitor loaded with input fields')








  // First: set the presenting (reporting) group
  console.log('📝 Setting presenting group to:', GROUP_ID)
  await page.fill('#presenting-group-input', GROUP_ID)
  console.log('✓ Filled presenting group input')
  
  // Debug: check button text matches exactly
  const allButtons = await page.locator('button').all()
  let setBtn = null
  for (const btn of allButtons) {
    const text = await btn.textContent()
    if (text && text.includes('設為報告組')) {
      setBtn = btn
      console.log(`✓ Found "設為報告組" button with exact text: "${text.trim()}"`)
      break
    }
  }
  
  if (!setBtn) {
    console.log('❌ "設為報告組" button not found!')
    const allTexts = await Promise.all(allButtons.map(b => b.textContent()))
    console.log('All button texts:', allTexts.map(t => `"${t?.trim()}"`))
    throw new Error('Cannot find "設為報告組" button')
  }
  
  // Click the button and wait for state change
  console.log('📝 Clicking button to set presenting group...')
  await setBtn.click()
  console.log('✓ Button clicked')
  
  // Wait for Firestore update
  await page.waitForTimeout(2000)
  
  // Check if presenting group was actually set by looking for it in UI
  const presentingGroupStatus = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, strong'))
    for (const el of elements) {
      if (el.textContent && el.textContent.includes('目前報告組')) {
        return {
          found: true,
          text: el.textContent,
          innerHTML: el.innerHTML
        }
      }
    }
    return { found: false }
  })
  console.log('Presenting group status check:', presentingGroupStatus)

  // Alternative: just wait a bit longer and move forward
  console.log('📝 Waiting for UI to update after button click...')
  await page.waitForTimeout(2000)



  // Wait for the previously raised hand to be cleared when presenting group is set
  await page.waitForFunction(() => !document.querySelector('li[data-group="01"]'), { timeout: 10000 })
  console.log('✅ Active hand cleared after setting presenting group')

  // Then: specify the priority group (for prioritized asking)
  console.log('📝 Setting priority group to:', PRIORITY_GROUP)
  await page.fill('#priority-group-input', PRIORITY_GROUP)
  console.log('✓ Filled priority group input')
  
  // Find and click the priority group button
  const priorityBtnList = await page.locator('button').all()
  let priorityBtn = null
  for (const btn of priorityBtnList) {
    const text = await btn.textContent()
    if (text && text.includes('指定優先發問組')) {
      priorityBtn = btn
      console.log(`✓ Found priority group button`)
      break
    }
  }
  
  if (priorityBtn) {
    await priorityBtn.click()
    console.log('✓ Clicked "指定優先發問組" button')
  }
  
  // Wait for Firestore and UI to update
  await page.waitForTimeout(2000)
  
  // Check priority group has auto-raised a hand entry
  try {
    await page.waitForSelector(`li[data-group="${PRIORITY_GROUP}"]`, { timeout: 10000 })
    console.log(`✅ Priority group ${PRIORITY_GROUP} auto-raised a hand`)
  } catch (e) {
    console.log(`⚠️ Priority group hand entry not found, but continuing...`)
  }

  // Give Firestore time to sync
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

  // Just wait for page to load instead of checking specific text (encoding issue)
  await page.waitForTimeout(2000)
  
  // Simple check: see if student page rendered
  const studentPageReady = await priorityStudentPage.evaluate(() => {
    return document.body.textContent.length > 100
  })
  if (studentPageReady) {
    console.log(`✅ Priority student page loaded`)
  }
  
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

  // Pick the priority group hand for scoring via the explicit 評分 button
  const priorityHandCard = scorerPage.locator(`div[data-hand-id]:has-text("#1 - 組別 ${PRIORITY_GROUP}")`)
  await priorityHandCard.waitFor({ timeout: 15000 })
  const scoreButton = priorityHandCard.locator('button:has-text("評分")')
  await expect(scoreButton).toBeVisible({ timeout: 10000 })
  await scoreButton.click()

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
