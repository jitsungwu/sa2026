# Install Playwright browsers then run E2E tests (PowerShell)
# Usage: .\scripts\run-e2e.ps1

Write-Output "Installing Playwright browsers..."
npx playwright install

Write-Output "Running Playwright tests (will start dev server if not running)..."
npx playwright test