import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// E2E (UI-only): Issue #32 - Scenario 2
// Flow (UI only):
//  - Teacher (no-auth E2E mode) activates class `demo`
//  - Two students (from e2e/test-accounts.json) reserve seats and raise hands via UI
//  - Teacher ends class via UI
//  - Assert UI shows no hands and seat layout cleared

test.describe('Issue #32 - end class clears hands and seats (UI only)', () => {
  test('teacher ends class clears hands and seats via UI', async ({ browser }) => {
    const root = process.cwd()
    const accountsPath = path.join(root, 'e2e', 'test-accounts.json')
    if (!fs.existsSync(accountsPath)) test.skip('test accounts file not found')
    const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf8'))
    const all = [ ...(accountsData.disponible || []), ...(accountsData.used || []) ]
      .filter(a => a.classId === 'demo')
    if (all.length < 2) test.skip('not enough test accounts for demo')

    const demoClassId = 'demo'
    const studentA = all[0]
    const studentB = all[1]

    // Teacher context: enable E2E no-auth mode via localStorage, activate class if needed
    const teacherCtx = await browser.newContext()
    await teacherCtx.addInitScript(() => {
      try { localStorage.setItem('E2E_DISABLE_AUTH', '1') } catch (e) {}
    })
    const teacherPage = await teacherCtx.newPage()
    await teacherPage.goto(`http://localhost:3000/class/${demoClassId}/monitor`, { waitUntil: 'domcontentloaded' })
    await teacherPage.waitForTimeout(1000) // Wait for page to settle

    // Try to activate class if needed (look for select or activate button)
    const selectLocator = teacherPage.locator('select')
    if (await selectLocator.count() > 0) {
      console.log('Found class select, attempting to activate demo class')
      await selectLocator.selectOption('demo')
      const activateBtn = teacherPage.locator('button:has-text("啟動班級")')
      if (await activateBtn.count() > 0) {
        await activateBtn.click()
        await teacherPage.waitForTimeout(1000)
        // Reload to see activated class state
        await teacherPage.reload({ waitUntil: 'domcontentloaded' })
        await teacherPage.waitForTimeout(500)
      }
    } else {
      console.log('No class select found, assuming class already active or not available')
    }

    // Helper: perform student flow (set localStorage studentAuth -> reserve seat -> raise hand)
    const performStudentFlow = async (student) => {
      const ctx = await browser.newContext()
      const auth = {
        account: student.account,
        name: student.account,
        groupId: String(student.groupId).padStart(2, '0'),
        classId: demoClassId,
        seatSelected: false,
        timestamp: new Date().toISOString()
      }
      await ctx.addInitScript((s) => { try { localStorage.setItem('studentAuth', s) } catch (e) {} }, JSON.stringify(auth))
      const page = await ctx.newPage()
      await page.goto(`http://localhost:3000/class/${demoClassId}/seat-selection`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)

      // Try to click the first available seat button (left/middle/right)
      const zones = ['左區第', '中區第', '右區第']
      let reserved = false
      for (const z of zones) {
        const btns = page.locator(`button:has-text("${z}")`)
        const count = await btns.count()
        console.log(`Zone ${z}: found ${count} buttons`)
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const b = btns.nth(i)
            const enabled = await b.isEnabled()
            if (enabled) {
              console.log(`Clicking enabled seat button ${i} in zone ${z}`)
              await b.click()
              reserved = true
              break
            }
          }
        }
        if (reserved) break
      }
      expect(reserved).toBeTruthy()
      console.log(`Student ${student.account} reserved seat`)

      // Wait for redirect or success message, then go to dashboard and raise hand
      await page.waitForTimeout(1000)
      await page.goto(`http://localhost:3000/class/${demoClassId}/dashboard`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)
      
      // Click 舉手 if available
      const raiseBtn = page.locator('button:has-text("舉手")')
      const raiseCount = await raiseBtn.count()
      if (raiseCount > 0) {
        console.log(`Student ${student.account} raising hand`)
        await raiseBtn.first().click()
      }
      await page.waitForTimeout(500)
      return { ctx, page, student }
    }

    const s1 = await performStudentFlow(studentA)
    const s2 = await performStudentFlow(studentB)

    // Wait for teacher monitor to show hands list
    await teacherPage.waitForFunction(() => {
      const heading = document.querySelector('h2')
      return heading && heading.textContent.includes('即時舉手名單')
    }, null, { timeout: 5000 })
    console.log('Found hands monitor section')
    
    // Wait until at least one list item appears
    await teacherPage.waitForFunction(() => {
      const ol = document.querySelector('ol')
      return ol && ol.children && ol.children.length >= 1
    }, null, { timeout: 8000 })
    console.log('Hands list populated')

    // End class: accept confirm dialog if any
    teacherPage.on('dialog', d => {
      console.log('Dialog:', d.message())
      d.accept()
    })
    console.log('Clicking 結束上課 button')
    await teacherPage.click('button:has-text("結束上課")')
    await teacherPage.waitForTimeout(1500)

    // Assert: HandsMonitor shows empty state
    await expect(teacherPage.locator('text=目前沒有舉手紀錄')).toBeVisible({ timeout: 5000 })
    console.log('Hands cleared after ending class')

    // Assert: seat-selection shows no occupied seats for a student
    console.log('Verifying seat layout cleared')
    await s1.page.goto(`http://localhost:3000/class/${demoClassId}/seat-selection`, { waitUntil: 'domcontentloaded' })
    await s1.page.waitForTimeout(500)
    // Any occupied seat will contain text like '第 01 組' — ensure none exists
    const occupiedButtons = await s1.page.locator('button:has-text("第 ")').count()
    expect(occupiedButtons).toBe(0)
    console.log('Seat layout cleared confirmed')

    // Cleanup contexts
    await s1.ctx.close()
    await s2.ctx.close()
    await teacherCtx.close()
  })
})
