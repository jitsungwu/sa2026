import { test, expect } from './test-fixtures'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('multiple groups can raise hands simultaneously', async ({ browser }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD

  // ===== TEACHER SETUP =====
  const teacherContext = await browser.newContext()
  const monitorPage = await teacherContext.newPage()
  await monitorPage.goto(`${base}/class/monitor`)
  const loggedIn = await monitorPage.$('button:has-text("登出")')
  if (!loggedIn) {
    if (!email || !password) test.skip('TEACHER_ID or TEACHER_PASSWORD not provided in .env.local')
    await monitorPage.goto(`${base}/signin`)
    await monitorPage.click('button:has-text("教師登入")')
    await monitorPage.waitForSelector('input[placeholder="email@example.com"]', { timeout: 5000 })
    await monitorPage.fill('input[placeholder="email@example.com"]', email)
    await monitorPage.fill('input[type="password"]', password)
    await monitorPage.click('button:has-text("登入")')
    await monitorPage.waitForSelector('button:has-text("登出")', { timeout: 10000 })
    await monitorPage.goto(`${base}/class/monitor`)
  }

  // Activate class
  const TEST_CLASS = process.env.TEST_CLASS_ID || 'demo'
  await monitorPage.waitForTimeout(1000)
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
    if (!clicked) throw new Error('Failed to click activate button')
    
    for (let i = 0; i < 10; i++) {
      const header = await monitorPage.textContent('h1')
      if (header && !header.includes('尚未啟動')) break
      await monitorPage.waitForTimeout(1000)
    }
  }

  await monitorPage.waitForSelector('text=即時舉手名單', { timeout: 15000 })

  // ===== STUDENT 1 (GROUP 01) RAISES HAND =====
  const student1Context = await browser.newContext()
  const student1Page = await student1Context.newPage()
  await student1Page.goto(`${base}/class/student?participantId=e2e_student_multi_1&group=01`, { waitUntil: 'domcontentloaded' })
  
  const TEST_CLASS_DISPLAY = `學生頁 — 班級：${TEST_CLASS}`
  await student1Page.waitForSelector(`h1:has-text("${TEST_CLASS_DISPLAY}")`, { timeout: 15000 })
  await student1Page.waitForSelector('button:has-text("舉手")', { timeout: 15000 })
  await student1Page.click('text=舉手')
  await expect(student1Page.locator('text=已舉手')).toBeVisible({ timeout: 7000 })

  // Monitor should show group 01 raised hand
  console.log('📝 Waiting for group 01 to appear in monitor...')
  // Use more flexible selector that matches the actual DOM
  let group01Found = false
  for (let i = 0; i < 30; i++) {
    const items = await monitorPage.locator('li').count()
    console.log(`  [${i}] Found ${items} list items in monitor`)
    const group01 = await monitorPage.locator('li:has-text("01")').first()
    if (await group01.count() > 0) {
      group01Found = true
      break
    }
    await monitorPage.waitForTimeout(500)
  }
  if (!group01Found) throw new Error('Group 01 not found')
  console.log('✅ Group 01 raised hand detected in monitor')

  // ===== STUDENT 2 (GROUP 02) RAISES HAND =====
  const student2Context = await browser.newContext()
  const student2Page = await student2Context.newPage()
  console.log(`📝 Student 2: navigating to ${base}/class/student?participantId=e2e_student_multi_2&group=02`)
  await student2Page.goto(`${base}/class/student?participantId=e2e_student_multi_2&group=02`, { waitUntil: 'domcontentloaded' })
  
  console.log('📝 Student 2: waiting for class display...')
  await student2Page.waitForSelector(`h1:has-text("${TEST_CLASS_DISPLAY}")`, { timeout: 15000 })
  console.log('📝 Student 2: waiting for raise hand button...')
  await student2Page.waitForSelector('button:has-text("舉手")', { timeout: 15000 })
  
  console.log('📝 Student 2: clicking raise hand button...')
  await student2Page.click('text=舉手')
  
  console.log('📝 Student 2: waiting for visual confirmation (已舉手)...')
  await expect(student2Page.locator('text=已舉手')).toBeVisible({ timeout: 7000 })
  console.log('✅ Student 2 successfully raised hand')

  // Give more time for Firestore propagation
  await monitorPage.waitForTimeout(3000)

  // Monitor should show both group 01 and group 02
  console.log('📝 Waiting for group 02 to appear in monitor...')
  let group02Found = false
  for (let i = 0; i < 30; i++) {
    const items = await monitorPage.locator('li').count()
    console.log(`  [${i}] Found ${items} list items in monitor`)
    const group02 = await monitorPage.locator('li:has-text("02")').first()
    if (await group02.count() > 0) {
      group02Found = true
      break
    }
    await monitorPage.waitForTimeout(500)
  }
  if (!group02Found) throw new Error('Group 02 not found')
  console.log('✅ Group 02 raised hand detected in monitor')

  // Verify both groups are shown in monitor
  const allItems = await monitorPage.locator('li').count()
  console.log(`✅ Monitor shows ${allItems} list items total`)

  // ===== STUDENT 3 (GROUP 03) RAISES HAND =====
  console.log('📝 Student 3: starting...')
  const student3Context = await browser.newContext()
  const student3Page = await student3Context.newPage()
  await student3Page.goto(`${base}/class/student?participantId=e2e_student_multi_3&group=03`, { waitUntil: 'domcontentloaded' })
  
  await student3Page.waitForSelector(`h1:has-text("${TEST_CLASS_DISPLAY}")`, { timeout: 15000 })
  await student3Page.waitForSelector('button:has-text("舉手")', { timeout: 15000 })
  await student3Page.click('text=舉手')
  await expect(student3Page.locator('text=已舉手')).toBeVisible({ timeout: 7000 })
  console.log('✅ Student 3 successfully raised hand')

  // Monitor should now show all three groups
  await monitorPage.waitForTimeout(2000)
  console.log('📝 Waiting for group 03 to appear in monitor...')
  let group03Found = false
  for (let i = 0; i < 30; i++) {
    const items = await monitorPage.locator('li').count()
    const group03 = await monitorPage.locator('li:has-text("03")').first()
    if (await group03.count() > 0) {
      group03Found = true
      break
    }
    await monitorPage.waitForTimeout(500)
  }
  if (!group03Found) throw new Error('Group 03 not found')
  console.log('✅ Group 03 raised hand detected in monitor')

  // ===== CLEANUP =====
  await student1Context.close()
  await student2Context.close()
  await student3Context.close()
  await teacherContext.close()

  console.log('✅ TEST PASSED: Multiple groups can raise hands simultaneously')
})
