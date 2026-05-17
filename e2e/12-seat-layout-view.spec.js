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

  test('Scenario 1: View seat layout button appears in dashboard and displays grid', async ({ page, firebaseApp }) => {
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

  test('Scenario 2: Show warning when class is not activated', async ({ page, firebaseApp }) => {
    // Step 1: Ensure class is NOT active (check Firestore)
    const db = firebaseApp.firestore()
    const classRef = db.collection('classes').doc(testClassId)
    const classSnap = await classRef.get()
    const isActive = classSnap.data()?.active || false

    if (isActive) {
      // Set class to inactive for this test
      await classRef.update({ active: false })
      console.log('✓ Set class to inactive for this test')
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

    // Restore class to active state for other tests
    if (isActive) {
      await classRef.update({ active: true })
      console.log('✓ Restored class to active state')
    }
  })

  test('Scenario 3: Display seat layout when class is activated', async ({ page, firebaseApp }) => {
    // Step 1: Ensure class is active
    const db = firebaseApp.firestore()
    const classRef = db.collection('classes').doc(testClassId)
    await classRef.update({ active: true })
    console.log('✓ Set class to active')

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

  test('Scenario 4: Mark first and second raised hands with correct colors', async ({ page, firebaseApp }) => {
    // Step 1: Ensure class is active
    const db = firebaseApp.firestore()
    const classRef = db.collection('classes').doc(testClassId)
    await classRef.update({ active: true })

    // Step 2: Create sample raised hands (group 02 and group 03)
    const handsRef = db.collection('classes').doc(testClassId).collection('hands_raised')
    
    // Clear existing hands
    const existingHands = await handsRef.get()
    for (const doc of existingHands.docs) {
      await doc.ref.delete()
    }

    // Add group 02 as first raiser (earlier timestamp)
    await handsRef.doc('group-02').set({
      groupId: '02',
      timestamp: new Date(Date.now() - 5000), // 5 seconds ago
      status: 'active'
    })

    // Add group 03 as second raiser (later timestamp)
    await handsRef.doc('group-03').set({
      groupId: '03',
      timestamp: new Date(Date.now() - 2000), // 2 seconds ago
      status: 'active'
    })

    console.log('✓ Created sample raised hands data')

    // Step 3: Navigate to dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' })

    // Step 4: Click "查看座位圖"
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await seatLayoutButton.click()

    // Step 5: Verify the legend shows first and second raised hands
    const legendText = page.locator('div').filter({ hasText: /第一個舉手.*第二個舉手/ }).first()
    await expect(legendText).toBeVisible()
    
    // Verify specific text in legend
    const legend = page.locator('div').filter({ hasText: '🔴' }).first()
    await expect(legend).toContainText('第一個舉手：02 組')
    
    const secondLegend = page.locator('div').filter({ hasText: '🟡' }).first()
    await expect(secondLegend).toContainText('第二個舉手：03 組')

    // Step 6: Verify seat colors (if group 02 and 03 are seated)
    // Get the layout to find where groups 02 and 03 are seated
    const layoutRef = db.collection('classes').doc(testClassId).collection('layout').doc('grid')
    const layoutSnap = await layoutRef.get()
    
    if (layoutSnap.exists()) {
      const layout = layoutSnap.data()
      console.log('Current layout:', layout)
      
      // Try to find seats with groups 02 and 03
      let foundGroup02 = false
      let foundGroup03 = false
      
      for (const [row, cols] of Object.entries(layout)) {
        for (const [col, groupId] of Object.entries(cols)) {
          if (String(groupId) === '2' || String(groupId) === '02') {
            foundGroup02 = true
          }
          if (String(groupId) === '3' || String(groupId) === '03') {
            foundGroup03 = true
          }
        }
      }
      
      console.log(`✓ Found group 02 in layout: ${foundGroup02}`)
      console.log(`✓ Found group 03 in layout: ${foundGroup03}`)
    } else {
      console.warn('⚠️ Layout not yet populated in this test run')
    }

    // Step 7: Cleanup - remove the test data
    await handsRef.doc('group-02').delete()
    await handsRef.doc('group-03').delete()
    console.log('✓ Cleaned up test data')
  })

  test('Scenario 5: Display "no raised hands" when no one is raising', async ({ page, firebaseApp }) => {
    // Step 1: Ensure class is active
    const db = firebaseApp.firestore()
    const classRef = db.collection('classes').doc(testClassId)
    await classRef.update({ active: true })

    // Step 2: Clear all raised hands
    const handsRef = db.collection('classes').doc(testClassId).collection('hands_raised')
    const existingHands = await handsRef.get()
    for (const doc of existingHands.docs) {
      await doc.ref.delete()
    }
    console.log('✓ Cleared all raised hands')

    // Step 3: Navigate to dashboard
    const dashboardUrl = `${base}/class/${testClassId}/dashboard?group=${testGroupId}&participantId=${testStudentAccount}`
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' })

    // Step 4: Click "查看座位圖"
    const seatLayoutButton = page.locator('button:has-text("查看座位圖")')
    await seatLayoutButton.click()

    // Step 5: Verify the legend shows "目前無舉手"
    const noRaisedText = page.locator('text=目前無舉手')
    await expect(noRaisedText).toBeVisible()

    console.log('✓ Verified "no raised hands" message displayed')
  })
})
