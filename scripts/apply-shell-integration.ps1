# Append firebase + playwright hints to PowerShell $PROFILE (SAFE: no commands executed)

$profilePath = $PROFILE
$dir = Split-Path -Path $profilePath -Parent
if (!(Test-Path -Path $dir)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$startMarker = "# >>> dev-scripts npm+playwright >>>"
$endMarker = "# <<< dev-scripts npm+playwright <<<"

$content = @()
$content += $startMarker
$content += "# npm hints"
$content += "if (Get-Command npm -ErrorAction SilentlyContinue) {"
$content += "    Write-Output 'npm detected.'"
$content += "    Write-Output 'Useful commands (manual):'"
$content += "    Write-Output '  npm install'"
$content += "    Write-Output '  npm ci'"
$content += "    Write-Output '  npx <tool>'"
$content += "    Write-Output '  npm run <script>'"
$content += "} else {"
$content += "    Write-Output 'npm not found. Install Node.js from https://nodejs.org/'"
$content += "}"
$content += ""
$content += "# Playwright hints"
$content += "if ((Get-Command playwright -ErrorAction SilentlyContinue) -or (Get-Command npx -ErrorAction SilentlyContinue)) {"
$content += "    Write-Output 'playwright detected.'"
$content += "    Write-Output 'To install browsers (run once): npx playwright install'"
$content += "} else {"
$content += "    Write-Output 'playwright CLI not found. Install dev dependency: npm i -D @playwright/test'"
$content += "}"
$content += $endMarker

# Append block if not present
$profileText = ''
if (Test-Path -Path $profilePath) { $profileText = Get-Content -Raw -Path $profilePath -ErrorAction SilentlyContinue }

if ($profileText -and $profileText.Contains($startMarker)) {
  Write-Output "Profile already contains npm+playwright block; no changes made: $profilePath"
} else {
  Add-Content -Path $profilePath -Value "`n"
  foreach ($line in $content) { Add-Content -Path $profilePath -Value $line }
  Write-Output "Appended npm+playwright hints to: $profilePath"
}

Write-Output "Done. To apply changes immediately run: . $PROFILE"