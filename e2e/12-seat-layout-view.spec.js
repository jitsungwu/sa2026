import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const testClassId = process.env.TEST_CLASS_ID || 'demo'
const testGroupId = process.env.TEST_STUDENT_GROUP_ID || '01'
const testStudentAccount = process.env.TEST_STUDENT_ACCOUNT || '413000001'

test.describe.configure({ mode: 'parallel' })

test.describe('Issue #8: Student View Seat Layout with Raised Hands Marking', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing layout data before each test
    try {
      await fetch(`${base}/api/test/cleanup-layout?classId=${testClassId}`, {
        method: 'POST',
      })
    } catch (err) {
      console.log('Note: cleanup endpoint may not be available')
    }
  })

  test('Scenario 1: View seat layout button appears in dashboard and displays grid', async ({
    page,
  }) => {
    // Step 1: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })

    // Step 2: Verify dashboard loads
    await expect(page.locator('h1')).toContainText('學生互動儀表板')

    // Step 3: Find and verify the "查看座位圖" button exists
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()

    // Step 4: Click the button to display seat layout section
    await seatLayoutButton.click()
    await page.waitForTimeout(500)

    // Step 5: Verify seat layout section appears
    const seatLayoutSection = page.locator('text=虛擬座位表')
    await expect(seatLayoutSection).toBeVisible()
  })

  test('Scenario 2: Verify legend shows hand status', async ({ page }) => {
    // Step 1: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })

    // Step 2: Click "查看座位圖" button to display seat layout
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    await seatLayoutButton.click()
    await page.waitForTimeout(500)

    // Step 3: Verify seat layout section is visible
    const seatLayoutSection = page.locator('text=虛擬座位表')
    await expect(seatLayoutSection).toBeVisible()

    // Step 4: Verify legend area shows some status indicator
    // The legend should display any of: raised hands or priority group or "no hands" message
    const pageContent = await page.content()
    const hasLegendContent = 
      pageContent.includes('🔴') || 
      pageContent.includes('🟡') || 
      pageContent.includes('🟢') || 
      pageContent.includes('目前無舉手') ||
      pageContent.includes('優先發問')
    expect(hasLegendContent).toBeTruthy()
  })

  test('Scenario 3: Display seat grid when class is active', async ({ page }) => {
    // Step 1: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })

    // Step 2: Click "查看座位圖" button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    await seatLayoutButton.click()
    await page.waitForTimeout(500)

    // Step 3: Verify seat layout grid section appears
    const gridDisplay = page.locator('.seat-grid-display')
    // Grid should either be visible (when class is active) or we should see the warning
    const gridVisible = await gridDisplay.count() > 0
    const warningVisible = await page.locator('text=課程尚未啟動').count() > 0
    expect(gridVisible || warningVisible).toBeTruthy()
  })

  test('Scenario 4: Verify zone labels in seat grid', async ({ page }) => {
    // Step 1: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })

    // Step 2: Click "查看座位圖" button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    await seatLayoutButton.click()
    await page.waitForTimeout(500)

    // Step 3: Verify seat grid display exists
    const gridDisplay = page.locator('.seat-grid-display')
    if ((await gridDisplay.count()) > 0) {
      await expect(gridDisplay).toBeVisible()

      // Step 4: Verify zone labels are visible (when grid is shown)
      const zoneLabels = page.locator('text=/左區|中區|右區/')
      const labelCount = await zoneLabels.count()
      expect(labelCount > 0).toBeTruthy()
    }
  })

  test('Scenario 5: Verify priority group indicator in legend', async ({ page }) => {
    // Step 1: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })

    // Step 2: Click "查看座位圖" button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    await seatLayoutButton.click()
    await page.waitForTimeout(500)

    // Step 3: Verify seat layout section is visible
    const seatLayoutSection = page.locator('text=虛擬座位表')
    await expect(seatLayoutSection).toBeVisible()

    // Step 4: Check for priority group indicator in legend (🟢 優先發問)
    // The legend should display either raised hand status or priority group status
    const legendArea = page.locator('div').filter({ 
      has: page.locator('text=/🔴|🟡|🟢|目前無舉手|優先發問/') 
    })
    await expect(legendArea.first()).toBeVisible()
  })
})
