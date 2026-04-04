import { test as base, expect } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    // Disable interactive browser dialogs for tests
    await page.addInitScript(() => {
      // no-op alerts
      window.alert = () => {}
      // automatically accept confirms
      window.confirm = () => true
      // neutral prompt
      window.prompt = () => null
    })
    await use(page)
  }
})

export { expect }
