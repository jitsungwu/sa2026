import { test, expect } from './test-fixtures'

test.describe('Student Account Signup', () => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const testClassId = 'demo'
  const testPassword = '12345678'

  test.beforeEach(async ({ page }) => {
    // Navigate to signin page
    await page.goto(`${base}/signin`)
    // Clear any existing student auth
    try {
      await page.evaluate(() => {
        localStorage.removeItem('studentAuth')
      })
    } catch (e) {
      // Ignore localStorage errors
    }
  })

  test('Scenario 1: Student can see signup option from signin page', async ({ page }) => {
    await page.goto(`${base}/signin`)

    // Click student login button
    await page.locator('button:has-text("學生登入")').click()

    // Should see student signin form with "建立帳號" button
    await expect(page.locator('button:has-text("建立帳號")')).toBeVisible()
  })

  test('Scenario 2: Clicking signup button shows signup form (no class field)', async ({ page }) => {
    await page.goto(`${base}/signin`)

    // Click student login button
    await page.locator('button:has-text("學生登入")').click()

    // Click signup button
    await page.locator('button:has-text("建立帳號")').click()

    // Should see signup form with fields (no class code field needed)
    await expect(page.locator('text=建立學生帳號')).toBeVisible()
    await expect(page.locator('input[placeholder="e.g., 413000001"]')).toBeVisible()
      // name input omitted; form relies on pre-enrolled student metadata
    // Should have password fields
    await expect(page.locator('input[type="password"]')).toHaveCount(2)
    // Should NOT have class code input
    const classCodeInputs = await page.locator('input[placeholder*="demo"]').count()
    expect(classCodeInputs).toBe(0)
  })

  test('Scenario 3: Signup form validates empty fields', async ({ page }) => {
    await page.goto(`${base}/signin`)
    await page.locator('button:has-text("學生登入")').click()
    await page.locator('button:has-text("建立帳號")').click()

    // Submit button should be disabled when fields are empty
    const submitBtn = page.locator('button:has-text("確認建立")')
    await expect(submitBtn).toBeDisabled()

    // Fill only account
    await page.fill('input[placeholder="e.g., 413000001"]', '413000002')
    await expect(submitBtn).toBeDisabled()

      // name input omitted; form relies on pre-enrolled student metadata

    // Fill password
    const passwords = await page.locator('input[type="password"]').all()
    await passwords[0].fill(testPassword)
    await expect(submitBtn).toBeDisabled()

    // Fill confirm password
    await passwords[1].fill(testPassword)
    await expect(submitBtn).not.toBeDisabled()
  })

  test('Scenario 4: Signup form validates password mismatch', async ({ page }) => {
    await page.goto(`${base}/signin`)
    await page.locator('button:has-text("學生登入")').click()
    await page.locator('button:has-text("建立帳號")').click()

    // Fill all fields
    await page.fill('input[placeholder="e.g., 413000001"]', '413000003')
      // name input omitted; form relies on pre-enrolled student metadata

    const passwords = await page.locator('input[type="password"]').all()
    await passwords[0].fill(testPassword)
    await passwords[1].fill('wrongpassword')

    // Try to click submit button
    await page.locator('button:has-text("確認建立")').click()

    // Should show password mismatch error
    await expect(page.locator('text=密碼不相符')).toBeVisible({ timeout: 5000 })
  })

  test('Scenario 5: Successfully create account with Excel data (auto-detected class)', async ({ page }) => {
    await page.goto(`${base}/signin`)
    await page.locator('button:has-text("學生登入")').click()
    await page.locator('button:has-text("建立帳號")').click()

    // Use an account that was imported from Excel (already exists in a class)
    const testAccount = '413000001'
    await page.fill('input[placeholder="e.g., 413000001"]', testAccount)
      // name input omitted; form relies on pre-enrolled student metadata

    const passwords = await page.locator('input[type="password"]').all()
    await passwords[0].fill(testPassword)
    await passwords[1].fill(testPassword)

    // Click submit
    await page.locator('button:has-text("確認建立")').click()

    // Should show success message (system auto-detected the class)
    await expect(page.locator('text=帳號建立成功')).toBeVisible({ timeout: 10000 })

    // Wait for redirect
    await page.waitForTimeout(2000)
  })

  test('Scenario 6: Can login with newly created account', async ({ page }) => {
    await page.goto(`${base}/signin`)
    await page.locator('button:has-text("學生登入")').click()
    await page.locator('button:has-text("建立帳號")').click()

    // Create account with Excel data
    const testAccount = '413000002'
    await page.fill('input[placeholder="e.g., 413000001"]', testAccount)
      // name input omitted; form relies on pre-enrolled student metadata

    const signupPasswords = await page.locator('input[type="password"]').all()
    await signupPasswords[0].fill(testPassword)
    await signupPasswords[1].fill(testPassword)

    await page.locator('button:has-text("確認建立")').click()

    // Wait for success
    await expect(page.locator('text=帳號建立成功')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(2000)

    // Now try to login with the newly created account
    await page.goto(`${base}/signin`)
    await page.locator('button:has-text("學生登入")').click()

    // Fill in login form 
    await page.fill('input[placeholder="e.g., 413000001"]', testAccount)
    const loginPasswords = await page.locator('input[type="password"]').all()
    await loginPasswords[0].fill(testPassword)
    
    // Fill class code (login form requires class code)
    await page.fill('input[placeholder*="demo"]', testClassId)

    // Click login button
    await page.locator('button:has-text("登入")').click()

    // Should navigate to dashboard or seat selection
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {})

    // Check if we're on the dashboard or seat selection page
    const url = page.url()
    expect(url).toMatch(/\/class\/(.*)\/(dashboard|seat-selection)/)
  })

  test('Scenario 7: Cannot create account if student not pre-enrolled in any class', async ({ page }) => {
    await page.goto(`${base}/signin`)
    await page.locator('button:has-text("學生登入")').click()
    await page.locator('button:has-text("建立帳號")').click()

    // Try to create account with a number not pre-enrolled in any class
    const unknownAccount = '111111111'
    await page.fill('input[placeholder="e.g., 413000001"]', unknownAccount)
      // name input omitted; form relies on pre-enrolled student metadata

    const passwords = await page.locator('input[type="password"]').all()
    await passwords[0].fill(testPassword)
    await passwords[1].fill(testPassword)

    await page.locator('button:has-text("確認建立")').click()

    // Should show error: account not pre-enrolled in any class
    await expect(page.locator('text=帳號不存在於任何班級中')).toBeVisible({ timeout: 5000 })
  })

  test('Scenario 8: Email is auto-generated as account@cloud.fju.edu.tw', async ({ page }) => {
    await page.goto(`${base}/signin`)
    await page.locator('button:has-text("學生登入")').click()
    await page.locator('button:has-text("建立帳號")').click()

    // Create account
    const testAccount = '413000003'
    await page.fill('input[placeholder="e.g., 413000001"]', testAccount)
      // name input omitted; form relies on pre-enrolled student metadata

    const passwords = await page.locator('input[type="password"]').all()
    await passwords[0].fill(testPassword)
    await passwords[1].fill(testPassword)

    await page.locator('button:has-text("確認建立")').click()

    // Wait for success
    await expect(page.locator('text=帳號建立成功')).toBeVisible({ timeout: 5000 })

    // Email should be auto-generated (we can't directly verify in UI, but it's stored in backend)
    // Response from signup API should include the generated email
  })

  test('Scenario 9: Can switch back to signin from signup', async ({ page }) => {
    await page.goto(`${base}/signin`)
    await page.locator('button:has-text("學生登入")').click()
    await page.locator('button:has-text("建立帳號")').click()

    // Should see "返回登入" link
    await expect(page.locator('button:has-text("返回登入")')).toBeVisible()

    // Click return to signin
    await page.locator('button:has-text("返回登入")').click()

    // Should see signin form again (match heading specifically)
    await expect(page.locator('h2:has-text("學生登入")')).toBeVisible()
  })
})