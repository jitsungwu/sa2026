import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test('homepage has title', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  await page.goto(base)
  await expect(page).toHaveTitle(/Next.js/)
})
