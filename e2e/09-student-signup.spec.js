import { test, expect } from './test-fixtures'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.describe('Student Account Signup', () => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const testClassId = 'demo'
  const testPassword = '12345678'

  // Load test accounts from JSON
  const accountsPath = path.join(__dirname, 'test-accounts.json')
  const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'))
  
  // Get available accounts (throws error if none available)
  const getAvailableAccount = () => {
    if (accounts.disponible.length === 0) {
      throw new Error(`❌ Test account pool is exhausted!\n\nPlease add more test accounts to e2e/test-accounts.json disponible array.\n\nUsed accounts: ${accounts.used.map(a => a.account).join(', ')}`)
    }
    return accounts.disponible[0]
  }
  
  // Move account from disponible to used
  const markAccountAsUsed = (account) => {
    const index = accounts.disponible.findIndex(a => a.account === account)
    if (index !== -1) {
      const [movedAccount] = accounts.disponible.splice(index, 1)
      movedAccount.usedAt = new Date().toISOString()
      accounts.used.push(movedAccount)
      fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2))
    }
  }

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

    // Fill only account - use a dummy non-existent account for this validation test
    await page.fill('input[placeholder="e.g., 413000001"]', '999999999')
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

    // Fill all fields - use a dummy non-existent account for this validation test
    await page.fill('input[placeholder="e.g., 413000001"]', '999999998')
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

    // Get account from available test accounts pool (will fail if exhausted)
    const testAccount = getAvailableAccount().account
    await page.fill('input[placeholder="e.g., 413000001"]', testAccount)
      // name input omitted; form relies on pre-enrolled student metadata

    const passwords = await page.locator('input[type="password"]').all()
    await passwords[0].fill(testPassword)
    await passwords[1].fill(testPassword)

    // Click submit
    await page.locator('button:has-text("確認建立")').click()

    // Should show success message (system auto-detected the class)
    await expect(page.locator('text=帳號建立成功')).toBeVisible({ timeout: 10000 })

    // Mark this account as used
    markAccountAsUsed(testAccount)

    // Wait for redirect
    await page.waitForTimeout(2000)
  })

  test('Scenario 6: Can login with created account', async ({ page }) => {
    // Reload the accounts JSON to get the most recently created account from Scenario 5
    const updatedAccounts = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'))
    const recentlyUsedAccount = updatedAccounts.used[updatedAccounts.used.length - 1]?.account
    
    if (!recentlyUsedAccount) {
      throw new Error('No recently created account found from Scenario 5')
    }
    
    // Wait for Firebase Auth to sync
    await page.waitForTimeout(3000)
    
    // Navigate to signin page
    await page.goto(`${base}/signin`)
    
    // Click student login button to show the form
    await page.locator('button:has-text("學生登入")').click()
    
    // Wait for login form field to appear
    await page.waitForSelector('input[placeholder="e.g., 413000001"]', { timeout: 5000 })

    // Fill in login form with the recently created account
    await page.fill('input[placeholder="e.g., 413000001"]', recentlyUsedAccount)
    const loginPasswords = await page.locator('input[type="password"]').all()
    await loginPasswords[0].fill(testPassword)

    // Click login button
    await page.locator('button:has-text("登入")').click()

    // Wait for navigation and page load
    await page.waitForTimeout(5000)

    // Check if we're NOT still on signin page
    const url = page.url()
    expect(url).not.toMatch(/\/signin$/)
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

  test.skip('Scenario 8: Email is auto-generated as account@cloud.fju.edu.tw', async ({ page }) => {
    // Use a fresh account from the pool to verify email auto-generation
    const accountResult = getAvailableAccount()
    test.skip(!accountResult, 'No available test accounts')

    const testAccount = accountResult.account
    
    await page.goto(`${base}/signin`)
    await page.locator('button:has-text("學生登入")').click()

    // Fill in login form with the test account
    await page.fill('input[placeholder="e.g., 413000001"]', testAccount)
    const passwords = await page.locator('input[type="password"]').all()
    await passwords[0].fill(testPassword)

    await page.locator('button:has-text("登入")').click()

    // Wait for navigation (email should have been auto-generated as {account}@cloud.fju.edu.tw)
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {})

    // If we successfully logged in, the email auto-generation worked correctly
    const url = page.url()
    expect(url).toMatch(/\/class\/.*\/(dashboard|seat-selection)/)
    
    // Mark account as used
    markAccountAsUsed(testAccount)
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