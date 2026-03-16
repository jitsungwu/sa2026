import { test, expect } from '@playwright/test'

test('when class inactive student can select class and view scoreboard but cannot raise hand', async ({ page }) => {
  await page.context().addInitScript(() => {
    try { window.localStorage.removeItem('activeClass') } catch (e) {}
  })

  await page.goto('http://localhost:3000/class/student', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('text=選擇班級')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=選擇組別')).toBeVisible({ timeout: 5000 })

  // choose a group so scoreboard renders
  await page.locator('select').nth(1).selectOption({ value: '1' })
  await expect(page.locator('text=即時積分榜')).toBeVisible({ timeout: 5000 })

  // ensure there is no button element labeled 舉手 in inactive mode
  const raiseBtn = page.locator('button:has-text("舉手")')
  await expect(raiseBtn).toHaveCount(0)
})
