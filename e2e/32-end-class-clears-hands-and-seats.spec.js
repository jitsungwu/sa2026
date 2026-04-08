const { test, expect } = require('@playwright/test')

// E2E: Issue #32 - Scenario 2
// Teacher ends class -> hands and seat registrations cleared

// NOTE: These tests assume the local dev server and emulator are running
// and that test fixtures/accounts exist. Adjust selectors and API endpoints
// as necessary for your app.

test.describe('Issue #32 - end class clears hands and seats', () => {
  test('teacher ends class clears hands and seats', async ({ page, request }) => {
    const classId = 'TEST_CLASS_32'
    const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'teacher@example.com'

    // 1) Seed: ensure class exists and is active
    await request.post('/_e2e/seed-class', {
      data: { classId, active: true }
    })

    // 2) Seed: create some hands and seat layout entries via API
    await request.post(`/_e2e/seed-hands`, { data: { classId, hands: [ { group: '01' }, { group: '02' } ] } })
    await request.post(`/_e2e/seed-layout`, { data: { classId, layout: { '1': { '1': '01', '2': '02' } } } })

    // 3) Verify precondition via API
    const preHands = await request.get(`/api/test-utils/${classId}/hands`)
    expect(preHands.ok()).toBeTruthy()
    const preHandsJson = await preHands.json()
    expect(preHandsJson.length).toBeGreaterThan(0)

    const preLayout = await request.get(`/api/test-utils/${classId}/layout`)
    expect(preLayout.ok()).toBeTruthy()
    const preLayoutJson = await preLayout.json()
    expect(Object.keys(preLayoutJson).length).toBeGreaterThan(0)

    // 4) Teacher UI: visit teacher page and end class
    await page.goto(`/class/${classId}/monitor`)
    await page.fill('input[name="email"]', teacherEmail)
    await page.click('button:has-text("登入")')

    // Wait for page to show active class and End Class button
    await page.waitForSelector('button:has-text("結束課程")', { timeout: 5000 })
    await page.click('button:has-text("結束課程")')

    // Confirm any modal
    const confirmBtn = page.locator('button:has-text("確認")')
    if (await confirmBtn.count()) {
      await confirmBtn.click()
    }

    // 5) Wait briefly for server-side cleanup
    await page.waitForTimeout(1000)

    // 6) Assert: hands cleared and layout cleared via API
    const postHands = await request.get(`/api/test-utils/${classId}/hands`)
    expect(postHands.ok()).toBeTruthy()
    const postHandsJson = await postHands.json()
    expect(postHandsJson.length).toBe(0)

    const postLayout = await request.get(`/api/test-utils/${classId}/layout`)
    expect(postLayout.ok()).toBeTruthy()
    const postLayoutJson = await postLayout.json()
    // layout may be empty object or not exist
    expect(Object.keys(postLayoutJson).length).toBe(0)
  })
})
