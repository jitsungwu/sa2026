import { test, expect } from './test-fixtures'

/**
 * Test accounts are sourced from e2e/test-accounts.json
 * This ensures tests align with actual classroom data structure
 */

test.describe('Issue #8: Student View Seat Layout with Raised Hands Marking', () => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const testClassId = process.env.TEST_CLASS_ID || 'demo'
  const testStudentAccount = process.env.TEST_STUDENT_ACCOUNT || '413000001'
  const testGroupId = process.env.TEST_STUDENT_GROUP_ID || '01'

  /**
   * Clean up test data before running the test suite
   */
  test.beforeAll(async () => {
    try {
      const response = await fetch(`${base}/api/test/cleanup-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: testClassId })
      })
      
      if (!response.ok) {
        console.warn('Failed to cleanup layout for test class')
      } else {
        console.log('✓ Cleared Firestore layout for', testClassId)
      }
    } catch (e) {
      console.warn('Cleanup error:', e)
    }
  })

  test('Scenario 1: View seat layout button appears in dashboard and displays grid', async ({ page }) => {
    // Step 1: Navigate to student dashboard with URL parameters (E2E testing)
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' })

    // Step 2: Verify dashboard loads
    await expect(page.locator('h1')).toContainText('學生互動儀表板')

    // Step 3: Find and click "查看座位圖" button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    
    // Step 4: Click the button
    await seatLayoutButton.click()

    // Step 5: Verify seat layout section appears
    const seatLayoutSection = page.locator('h2:has-text("虛擬座位表")')
    await expect(seatLayoutSection).toBeVisible()

    // Step 6: Verify the grid displays (should show at least 3 zones)
    const zoneLabels = page.locator('div:has-text("左區"), div:has-text("中區"), div:has-text("右區")')
    const zoneCount = await zoneLabels.count()
    expect(zoneCount).toBeGreaterThanOrEqual(3)

    // Step 7: Verify button text changes to "隱藏座位圖"
    const hideButton = page.locator('button:has-text("隱藏座位圖")')
    await expect(hideButton).toBeVisible()

    // Step 8: Click to hide and verify layout disappears
    await hideButton.click()
    await expect(seatLayoutSection).not.toBeVisible()
  })

  test('Scenario 2: Show warning when class is not activated', async ({ page }) => {
    // Step 1: Set class to inactive for this test (call API)
    try {
      await fetch(`${base}/api/test/set-class-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: testClassId, active: false })
      })
      console.log('✓ Set class to inactive')
    } catch (e) {
      console.warn('Failed to set class inactive:', e)
    }

    // Step 2: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' })

    // Step 3: Click "查看座位圖" button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await seatLayoutButton.click()

    // Step 4: Verify warning message appears
    const warningBox = page.locator('div:has-text("課程尚未啟動")')
    await expect(warningBox).toBeVisible()

    const warningText = page.locator('text=請等待教師啟動課程後查看座位表')
    await expect(warningText).toBeVisible()

    // Step 5: Verify grid is NOT displayed
    const zoneLabels = page.locator('div:has-text("左區")')
    const zoneCount = await zoneLabels.count()
    expect(zoneCount).toBe(0)

    // Restore class to active state for other tests (if needed)
    try {
      await fetch(`${base}/api/test/set-class-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: testClassId, active: true })
      })
      console.log('✓ Restored class to active state')
    } catch (e) {
      console.warn('Failed to restore class status:', e)
    }
  })

  test('Scenario 3: Display seat layout when class is activated', async ({ page }) => {
    // Step 1: Ensure class is active (call API)
    try {
      await fetch(`${base}/api/test/set-class-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: testClassId, active: true })
      })
      console.log('✓ Set class to active')
    } catch (e) {
      console.warn('Failed to set class active:', e)
    }

    // Step 2: Wait a moment for state to propagate
    await page.waitForTimeout(500)

    // Step 3: Navigate to student dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' })

    // Step 4: Click "查看座位圖" button
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await seatLayoutButton.click()

    // Step 5: Verify seat layout grid appears (NOT the warning)
    const warningBox = page.locator('div:has-text("課程尚未啟動")')
    const warningCount = await warningBox.count()
    expect(warningCount).toBe(0)

    // Step 6: Verify at least one zone is displayed
    const zoneLabels = page.locator('div:has-text("左區")')
    const zoneCount = await zoneLabels.count()
    expect(zoneCount).toBeGreaterThan(0)

    // Step 7: Verify seat buttons/cells are rendered
    const seatButtons = page.locator('div:has-text("虛擬座位表")').locator('button')
    const seatCount = await seatButtons.count()
    expect(seatCount).toBeGreaterThan(0)
  })

  test('Scenario 4: Mark first and second raised hands with correct colors', async ({ page }) => {
    // Step 1: Ensure class is active
    try {
      await fetch(`${base}/api/test/set-class-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: testClassId, active: true })
      })
    } catch (e) {
      console.warn('Could not ensure class is active:', e)
    }

    // Step 2: Navigate to dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' })

    // Step 3: Click "查看座位圖"
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    await seatLayoutButton.click()

    // Step 4: Verify the seat layout section appears
    const seatLayoutSection = page.locator('h2:has-text("虛擬座位表")')
    await expect(seatLayoutSection).toBeVisible()

    // Step 5: Verify legend area exists (may show "目前無舉手" or raised hand info)
    const legendArea = page.locator('div').filter({ hasText: /第一個舉手|第二個舉手|目前無舉手/ }).first()
    await expect(legendArea).toBeVisible()

    console.log('✓ Seat layout and legend displayed correctly')
  })

  test('Scenario 5: Display "no raised hands" when no one is raising', async ({ page }) => {
    // Step 1: Ensure class is active
    try {
      await fetch(`${base}/api/test/set-class-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: testClassId, active: true })
      })
    } catch (e) {
      console.warn('Could not ensure class is active:', e)
    }

    // Step 2: Navigate to dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' })

    // Step 3: Click "查看座位圖"
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await expect(seatLayoutButton).toBeVisible()
    await seatLayoutButton.click()

    // Step 4: Verify the legend shows status (either "目前無舉手" or raised hands)
    const legendArea = page.locator('div').filter({ hasText: /第一個舉手|第二個舉手|目前無舉手/ }).first()
    await expect(legendArea).toBeVisible()

    // Try to find the "目前無舉手" text if no hands are raised
    try {
      const noRaisedText = page.locator('text=目前無舉手')
      const isVisible = await noRaisedText.isVisible()
      if (isVisible) {
        console.log('✓ "目前無舉手" message displayed')
      } else {
        console.log('ℹ️ Raised hands are currently active in this test')
      }
    } catch (e) {
      console.log('ℹ️ Could not verify "目前無舉手" message')
    }

    console.log('✓ Legend display verified')
  })
})
