# Incomplete / Skipped E2E Tests

## raise-hand-inactive.spec.js (skipped)

- Status: SKIPPED (test.skip)
- Reason: The test expects the inactive-student selection UI to render an element with text `選擇班級`, but the current Student selection flow can fail to render this (race or unfinished UI). Running this test against a live backend or without the demo localStorage causes it to time out.
- When encountered during `npm run test:e2e`, Playwright reported: `Locator: locator('text=選擇班級') — element(s) not found`.

## Suggested next steps

1. Decide whether to finish the student-selection UI in the app (so it always renders the selection controls when class is inactive), or modify the test to explicitly set `localStorage` values for the demo class before navigation.
2. If keeping the test, update the test to use `demo` class / `selectedGroup_demo` (like other tests), or increase the test wait timeout and add debug traces.
3. Re-enable the test after implementing the chosen fix and run `npm run test:e2e` to verify.

Recorded by automation on: 2026-03-16
