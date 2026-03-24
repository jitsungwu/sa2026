# Creates a Projects (v2) named sa2026 in the specified repo,
# then creates issues and adds them to the project using GITHUB_TOKEN env var.
param()

$ErrorActionPreference = 'Stop'
$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Error 'GITHUB_TOKEN not set in environment'
    exit 1
}

$owner = 'jitsungwu'
$repo = 'sa2026'
$graphql = 'https://api.github.com/graphql'
$restBase = "https://api.github.com/repos/$owner/$repo/issues"

Write-Output "Fetching repository and owner node IDs for $owner/$repo..."
$query = @"
query {
  repository(owner: \"$owner\", name: \"$repo\") {
    id
    owner { id login }
  }
}
"@

$body = @{ query = $query } | ConvertTo-Json -Depth 10
$resp = Invoke-RestMethod -Uri $graphql -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $body
if ($resp.errors) { Write-Error ($resp.errors | ConvertTo-Json); exit 1 }
$repoId = $resp.data.repository.id
$ownerId = $resp.data.repository.owner.id
Write-Output "repoId=$repoId; ownerId=$ownerId"

Write-Output 'Creating Project (v2) named sa2026...'
$mutation = @"
mutation {
  createProjectV2(input:{ownerId:\"$ownerId\", title:\"sa2026\"}) {
    projectV2 { id title url }
  }
}
"@
$body = @{ query = $mutation } | ConvertTo-Json -Depth 10
$projResp = Invoke-RestMethod -Uri $graphql -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $body
if ($projResp.errors) { Write-Error ($projResp.errors | ConvertTo-Json); exit 1 }
$projectId = $projResp.data.createProjectV2.projectV2.id
$projectUrl = $projResp.data.createProjectV2.projectV2.url
Write-Output "Created project id=$projectId url=$projectUrl"

$issues = @(
    @{ title = '教師：透過 Excel 批次匯入學生名單'; body = '身為 授課教師，我想要 透過上傳 Excel 檔案批次匯入名單，因此我可以 確保學生資訊準確並快速開啟課程。' },
    @{ title = '教師：在介面中切換班級'; body = '身為 授課教師，我想要 在介面中自由切換不同班級，因此我可以 針對不同授課時段進行獨立的數據記錄。' },
    @{ title = '教師：設定倒數計時與提醒音效'; body = '身為 授課教師，我想要 設定各階段的倒數計時與提醒音效，因此我可以 準確掌控教學進度而不需頻頻看錶。' },
    @{ title = '教師：發言名單權重排序（優先發言少者）'; body = '身為 授課教師，我想要 系統自動對發言名單進行權重排序（發言少者優先），因此我可以 引導學生將發言權交給尚未參與的同學。' },
    @{ title = '教師：含隨機擾動的抽點功能'; body = '身為 授課教師，我想要 在冷場時使用隨機抽點功能，因此我可以 主動挑選低參與度的同學發言以活絡課堂氣氛。' },
    @{ title = '學生（報告組）：在台上給予 1–5 點'; body = '身為 報告組同學，我想要 在台上直接點選發問同學並給予 1-5 點，因此我可以 實質回饋對我們報告有幫助的建議。' },
    @{ title = '學生（報告組）：虛擬座位表介面'; body = '身為 報告組同學，我想要 在操作介面查看「虛擬座位表」，因此我可以 直覺地對應台下同學的位置來給分。' },
    @{ title = '學生（被發問者）：即時加分通知'; body = '身為 發問同學，我想要 在獲得加分時從螢幕看到即時通知，因此我可以 確認點數已成功入帳並獲得正面鼓勵。' },
    @{ title = '學生：登入後查看個人累計點數'; body = '身為 在班學生，我想要 登入後查詢自己目前的累計點數，因此我可以 瞭解自己的平時表現並適時調整參與度。' },
    @{ title = '教師：限制單場報告總點數上限'; body = '身為 授課教師，我想要 限制單場報告的總點數上限，因此我可以 防止學生濫發點數，維持成績的鑑別度。' },
    @{ title = '教師：檢視紀錄牆並微調點數'; body = '身為 授課教師，我想要 審視紀錄牆並能微調點數，因此我可以 修正不合理的給分，確保評分符合教學目標。' },
    @{ title = '助教：匯出全班點數總表（Excel）'; body = '身為 助教 (TA)，我想要 一鍵匯出全班的點數總表（Excel），因此我可以 快速將數據轉入學校的官方成績系統。' }
)

$created = @()
foreach ($i in $issues) {
    Write-Output "Creating issue: $($i.title)"
    $bodyObj = @{ title = $i.title; body = $i.body }
    $issueResp = Invoke-RestMethod -Uri $restBase -Method Post -Headers @{ Authorization = "token $token"; Accept = 'application/vnd.github+json' } -Body ($bodyObj | ConvertTo-Json -Depth 6)
    if ($null -eq $issueResp) { Write-Error "Failed to create issue $($i.title)"; exit 1 }
    $issueNodeId = $issueResp.node_id
    $issueNumber = $issueResp.number
    $issueUrl = $issueResp.html_url
    Write-Output "Created issue #$issueNumber -> $issueUrl (node_id: $issueNodeId)"
    $addMutation = @"
mutation {
  addProjectV2ItemByContent(input:{projectId:\"$projectId\", contentId:\"$issueNodeId\"}) {
    item { id }
  }
}
"@
    $body = @{ query = $addMutation } | ConvertTo-Json -Depth 10
    $addResp = Invoke-RestMethod -Uri $graphql -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $body
    if ($addResp.errors) { Write-Warning ("Project add returned errors: " + ($addResp.errors | ConvertTo-Json)) } else { Write-Output "Added issue #$issueNumber to project." }
    $created += @{ number = $issueNumber; url = $issueUrl }
}

Write-Output 'Done. Summary of created issues:'
$created | ConvertTo-Json -Depth 3
