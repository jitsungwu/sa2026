import { test, expect } from './test-fixtures'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('multiple students with independent auth contexts raise hands simultaneously', async ({ browser }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const email = process.env.TEACHER_ID
  const password = process.env.TEACHER_PASSWORD
  const TEST_CLASS = process.env.TEST_CLASS_ID || 'demo'

  // ===== TEACHER SETUP =====
  console.log('👨‍🏫 Setting up teacher context...')
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
  console.log('🚀 Activating class...')
  await monitorPage.waitForTimeout(1000)
  const activateBtn = await monitorPage.$('button:has-text("啟動班級")')
  if (activateBtn) {
    const sel = await monitorPage.$('select')
    if (sel) {
      const opt = await monitorPage.$(`select option[value="${TEST_CLASS}"]`)
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
  console.log('✅ Class activated and monitor ready')

  // ===== STUDENT 1: Independent Auth Context (Group 01) =====
  console.log('\n👤 Student 1 (Group 01, Independent Context): Starting...')
  const student1Context = await browser.newContext()
  const student1Page = await student1Context.newPage()
  
  console.log('  📝 Opening student dashboard page...')
  await student1Page.goto(`${base}/class/${TEST_CLASS}/dashboard?participantId=multi_student_1&group=01`, { waitUntil: 'domcontentloaded' })
  
  console.log('  📝 Waiting for raise hand button...')
  await student1Page.waitForSelector('button:has-text("舉手")', { timeout: 15000 })
  
  console.log('  📝 Clicking raise hand button...')
  await student1Page.click('button:has-text("舉手")')
  
  console.log('  📝 Waiting for confirmation (已舉手)...')
  await expect(student1Page.locator('text=已舉手')).toBeVisible({ timeout: 7000 })
  console.log('✅ Student 1 raised hand (Group 01) in independent context')

  // ===== STUDENT 2: Separate Independent Auth Context (Group 02) =====
  console.log('\n👤 Student 2 (Group 02, Independent Context): Starting...')
  const student2Context = await browser.newContext()
  const student2Page = await student2Context.newPage()
  
  console.log('  📝 Opening student dashboard page...')
  await student2Page.goto(`${base}/class/${TEST_CLASS}/dashboard?participantId=multi_student_2&group=02`, { waitUntil: 'domcontentloaded' })
  
  console.log('  📝 Waiting for raise hand button...')
  await student2Page.waitForSelector('button:has-text("舉手")', { timeout: 15000 })
  
  console.log('  📝 Clicking raise hand button...')
  await student2Page.click('button:has-text("舉手")')
  
  console.log('  📝 Waiting for confirmation...')
  await expect(student2Page.locator('text=已舉手')).toBeVisible({ timeout: 7000 })
  console.log('✅ Student 2 raised hand (Group 02) in independent context')

  // Wait for Firestore sync
  await monitorPage.waitForTimeout(2000)

  // ===== STUDENT 3: Third Independent Auth Context (Group 05) =====
  console.log('\n👤 Student 3 (Group 05, Independent Context): Starting...')
  const student3Context = await browser.newContext()
  const student3Page = await student3Context.newPage()
  
  console.log('  📝 Opening student dashboard page...')
  await student3Page.goto(`${base}/class/${TEST_CLASS}/dashboard?participantId=multi_student_3&group=05`, { waitUntil: 'domcontentloaded' })
  
  console.log('  📝 Waiting for raise hand button...')
  await student3Page.waitForSelector('button:has-text("舉手")', { timeout: 15000 })
  
  console.log('  📝 Clicking raise hand button...')
  await student3Page.click('button:has-text("舉手")')
  
  console.log('  📝 Waiting for confirmation...')
  await expect(student3Page.locator('text=已舉手')).toBeVisible({ timeout: 7000 })
  console.log('✅ Student 3 raised hand (Group 05) in independent context')

  // Wait for Firestore propagation
  await monitorPage.waitForTimeout(3000)

  // ===== VERIFY ALL THREE GROUPS IN MONITOR =====
  console.log('\n🔍 Verifying all students appear in monitor...')
  
  // Check for Group 01
  console.log('  📝 Checking for Group 01...')
  let group01Found = false
  for (let i = 0; i < 15; i++) {
    const group01Locators = await monitorPage.locator('li[data-group="01"]').count()
    if (group01Locators > 0) {
      group01Found = true
      break
    }
    await monitorPage.waitForTimeout(500)
  }
  if (!group01Found) throw new Error('Group 01 not found in monitor')
  console.log('  ✅ Group 01 visible in monitor')

  // Check for Group 02
  console.log('  📝 Checking for Group 02...')
  let group02Found = false
  for (let i = 0; i < 15; i++) {
    const group02Locators = await monitorPage.locator('li[data-group="02"]').count()
    if (group02Locators > 0) {
      group02Found = true
      break
    }
    await monitorPage.waitForTimeout(500)
  }
  if (!group02Found) throw new Error('Group 02 not found in monitor')
  console.log('  ✅ Group 02 visible in monitor')

  // Check for Group 05
  console.log('  📝 Checking for Group 05...')
  let group05Found = false
  for (let i = 0; i < 15; i++) {
    const group05Locators = await monitorPage.locator('li[data-group="05"]').count()
    if (group05Locators > 0) {
      group05Found = true
      break
    }
    await monitorPage.waitForTimeout(500)
  }
  if (!group05Found) throw new Error('Group 05 not found in monitor')
  console.log('  ✅ Group 05 visible in monitor')

  // ===== VERIFY INDEPENDENT AUTH CONTEXTS =====
  console.log('\n🔐 Verifying independent authentication contexts...')
  
  // Each student should see their own UI state in their own context
  const student1Raised = await student1Page.locator('text=已舉手').count()
  const student2Raised = await student2Page.locator('text=已舉手').count()
  const student3Raised = await student3Page.locator('text=已舉手').count()
  
  console.log(`  Student 1 (Group 01): raised = ${student1Raised > 0 ? 'Yes ✓' : 'No ✗'}`)
  console.log(`  Student 2 (Group 02): raised = ${student2Raised > 0 ? 'Yes ✓' : 'No ✗'}`)
  console.log(`  Student 3 (Group 05): raised = ${student3Raised > 0 ? 'Yes ✓' : 'No ✗'}`)
  
  if (student1Raised === 0 || student2Raised === 0 || student3Raised === 0) {
    throw new Error('Not all students showing raised hand status')
  }
  console.log('  ✅ All students have independent auth state in their contexts')

  // ===== CLEANUP =====
  console.log('\n🧹 Cleaning up...')
  await student1Context.close()
  await student2Context.close()
  await student3Context.close()
  await teacherContext.close()

  console.log('\n✅ TEST PASSED: Multiple students with independent auth contexts raise hands simultaneously!')
  console.log('   Each browser context maintains its own Firebase Auth session.')
  console.log('   No localStorage interference between contexts!')
})
