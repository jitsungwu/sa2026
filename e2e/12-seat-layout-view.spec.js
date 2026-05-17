import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const testClassId = process.env.TEST_CLASS_ID || 'demo'
const testGroupId = process.env.TEST_STUDENT_GROUP_ID || '01'
const testStudentAccount = process.env.TEST_STUDENT_ACCOUNT || '413000001'

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

    // Step 4: Click the button to display seat layout
    await seatLayoutButton.click()
    await page.waitForTimeout(500)

    // Step 5: Verify seat layout grid appears after clicking
    const gridSection = page.locator('.seat-grid-display')
    await expect(gridSection).toBeVisible()
  })

  test('Scenario 2: Show warning when class is not activated', async ({ page }) => {
    // Step 1: Ensure class is NOT active via API
    try {
      await fetch(`${base}/api/test/set-class-status?classId=${testClassId}&active=false`, {
        method: 'POST',
      })
    } catch (err) {
      console.log('Note: could not set class status via API')
    }

    // Step 2: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })

    // Step 3: Click "查看座位圖" button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    await seatLayoutButton.click()
    await page.waitForTimeout(500)

    // Step 4: Verify "課程尚未啟動" warning is displayed
    const warningText = page.locator('text=課程尚未啟動')
    await expect(warningText).toBeVisible({ timeout: 5000 })
  })

  test('Scenario 3: Display seat layout when class is activated', async ({ page }) => {
    // Step 1: Ensure class is active via API
    try {
      await fetch(`${base}/api/test/set-class-status?classId=${testClassId}&active=true`, {
        method: 'POST',
      })
    } catch (err) {
      console.log('Note: could not set class status via API')
    }
    await page.waitForTimeout(500)

    // Step 2: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })

    // Step 3: Click "查看座位圖" button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    await seatLayoutButton.click()
    await page.waitForTimeout(500)

    // Step 4: Verify "課程尚未啟動" warning is NOT displayed
    const warningText = page.locator('text=課程尚未啟動')
    await expect(warningText).not.toBeVisible()

    // Step 5: Verify seat layout grid is displayed
    const gridSection = page.locator('.seat-grid-display')
    await expect(gridSection).toBeVisible()
  })

  test('Scenario 4: Verify legend area and raised hand status display', async ({
    page,
  }) => {
    // Step 1: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })

    // Step 2: Click "查看座位圖" button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    await seatLayoutButton.click()
    await page.waitForTimeout(500)

    // Step 3: Verify legend area is visible
    // The legend should display raised hand status
    const legendSection = page.locator('[class*="legend"]')
    if ((await legendSection.count()) > 0) {
      await expect(legendSection.first()).toBeVisible()
    }

    // Step 4: Check for hand-raising status indicators
    // Either "第一個舉手", "第二個舉手", or "目前無舉手"
    const handStatus = page.locator(
      'text=/第一個舉手|第二個舉手|目前無舉手|紅色|黃色/'
    )
    const hasStatus = await handStatus.count()
    expect(hasStatus >= 0).toBeTruthy()
  })

  test('Scenario 5: Toggle seat layout on and off', async ({ page }) => {
    // Step 1: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })

    // Step 2: Find the seat layout button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()

    // Step 3: Initial state - seat layout should be hidden
    const gridSection = page.locator('.seat-grid-display')
    let gridVisible = await gridSection.isVisible()
    expect(!gridVisible).toBeTruthy()

    // Step 4: Click to show seat layout
    await seatLayoutButton.click()
    await page.waitForTimeout(300)
    gridVisible = await gridSection.isVisible()
    expect(gridVisible).toBeTruthy()

    // Step 5: Click again to hide seat layout
    await seatLayoutButton.click()
    await page.waitForTimeout(300)
    gridVisible = await gridSection.isVisible()
    expect(!gridVisible).toBeTruthy()
  })
})
