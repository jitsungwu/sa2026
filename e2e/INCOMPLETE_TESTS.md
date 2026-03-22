# E2E Tests Status

## ✅ All Tests Completed

All 7 e2e test specs are now passing (7 passed, 0 skipped, 0 failed, Exit Code: 0).

### Fixes Applied

1. **raise-hand-inactive.spec.js (01)**: 
   - Implemented stop-class setup: Teacher signs in and clicks "結束上課" to deactivate the class
   - Added polling for inactive UI appearance with tolerance for transient states
   - Test now validates student can view scoreboard but cannot raise hand when class is inactive

2. **raise-hand-active.spec.js (03)** & **teacher-give-points.spec.js (04)**:
   - Removed localStorage dependency (app no longer uses it)
   - Added proper Firestore propagation wait: Wait for StudentPage header to show active classId before checking for RaiseHandButton
   - Both specs now use real UI flows and handle Firestore snapshot timing correctly

3. **Other specs (02, 05, 06, 07)**:
   - Already passing with robust conditional logic for class state management

### Test Results

Run `npm run test:e2e` or `npx playwright test e2e/ --workers=1` to verify all tests pass.

Last verified: 2026-03-22 — 7 passed (34.7s) ✓
