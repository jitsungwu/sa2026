# E2E CI Guide

NOTE: Vercel E2E workflow not enabled yet — the Vercel preview workflow below is an example only. Do not assume automatic Vercel E2E runs are configured until `.github/workflows/e2e-vercel-preview.yml` is created and enabled.

目的：讓 CI 在安全且可重現的情況下執行 Playwright E2E 測試，並保證測試只操作指定的「測試班級」。

主要原則：
- 所有 E2E 測試應以 `TEST_CLASS_ID` 指定的班級為目標，避免污染真實資料。
- 在 CI 中請把敏感帳號（若需登入）放到 repository secrets（例如 `E2E_TEACHER_ID`, `E2E_TEACHER_PASSWORD`）。

建議的環境變數：
- `TEST_CLASS_ID` — 測試班級 id（建議在 CI 設成 `demo` 或專用測試班）。
- `BASE_URL` — 應用運行的 URL（預設 `http://localhost:3000`）。
- `E2E_DISABLE_AUTH` — 若使用 emulator 或跳過登入，可設為 `1`。
- `E2E_TEACHER_ID`, `E2E_TEACHER_PASSWORD` — 若在測試中要使用真實登入，請以 secret 方式提供。

快速範例（GitHub Actions）

```yaml
name: e2e

on:
  push:
    branches: [ main ]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install deps
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      # Option A: use project helper to run emulator + e2e (recommended for isolation)
      - name: Run E2E with emulator
        env:
          TEST_CLASS_ID: ${{ secrets.TEST_CLASS_ID || 'demo' }}
          BASE_URL: http://localhost:3000
          E2E_DISABLE_AUTH: 1
        run: npm run e2e:with-emulator

      # Option B: if your CI provides a running app, run Playwright directly
      #- name: Run Playwright tests
      #  env:
      #    TEST_CLASS_ID: ${{ secrets.TEST_CLASS_ID }}
      #    BASE_URL: ${{ secrets.BASE_URL }}
      #    E2E_TEACHER_ID: ${{ secrets.E2E_TEACHER_ID }}
      #    E2E_TEACHER_PASSWORD: ${{ secrets.E2E_TEACHER_PASSWORD }}
      #  run: npx playwright test --config=playwright.config.js
```

其他注意事項：
- 若使用 `E2E_DISABLE_AUTH=1`，CI 中請確保 emulator / seeded classes 可被存取，以避免測試對真實專案造成影響。
- 若需要在 CI 中建立或重設 `TEST_CLASS_ID` 對應的班級，可呼叫 `scripts/seed-classes.js` 或自訂初始化步驟。

測試排程注意：
- 測試檔具有狀態依賴（例如教師需先啟動班級），因此 Playwright 已在 `playwright.config.js` 中設定 `workers: 1` 與 `fullyParallel: false`，整體測試會序列化執行以避免並行 race condition。若需要更精細的順序，可將檔案名稱加上數字前綴（例如 `01-...`, `02-...`）或在個別規格內使用 `test.describe.serial`。

如需我把上述 Actions 工作流檔直接加入到 `.github/workflows/e2e.yml`，我可以幫你建立；或是把 CI 範例貼到現有的 CI 文檔中。請告訴我你要哪一種。 
\

## Vercel Preview — 在 GH Actions 針對 Vercel preview URL 執行 E2E

若你的應用部署到 Vercel，我們建議在 GitHub Actions（或其它 CI）中針對 Vercel 的 preview URL 執行 Playwright 測試，而不是在 Vercel 端直接跑測試。流程重點：

- 由 CI 觸發 Vercel 部署（或等待 Vercel 的 preview 完成），取得該 preview 的 public URL，並以此作為 `BASE_URL` 供 Playwright 使用。
- 為取得 preview URL，可採兩種作法：
  1. 使用官方/社群的 Vercel GH Action（部署後由 action 輸出 URL）。
  2. 使用 Vercel Deployments API 查詢 `gitCommitSha` 或 `gitBranch` 對應的 deployment，從回傳資料擷取 URL（需要 `VERCEL_TOKEN` 與 `VERCEL_PROJECT_ID`）。

下方為一個實作範例（GitHub Actions）：先等待/取得 Vercel preview URL，然後以該 URL 執行 Playwright 測試。

```yaml
name: e2e-on-vercel-preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  e2e_preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install deps
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      # Option: deploy via a Vercel Action (or your existing Vercel deployment step)
      - name: Deploy to Vercel (optional)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prebuilt'
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      # If you used a Vercel action that outputs the URL, read it; otherwise query Vercel API
      - name: Resolve preview URL via Vercel API
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          GITHUB_SHA: ${{ github.sha }}
        run: |
          sudo apt-get update && sudo apt-get install -y jq
          echo "Querying Vercel deployments for commit ${GITHUB_SHA}..."
          resp=$(curl -s -H "Authorization: Bearer ${VERCEL_TOKEN}" "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&gitCommitSha=${GITHUB_SHA}")
          url=$(echo "$resp" | jq -r '.deployments[0].url')
          if [ -z "$url" ] || [ "$url" = "null" ]; then
            echo "No deployment found for commit; aborting." >&2
            exit 1
          fi
          echo "Preview URL: https://$url"
          echo "BASE_URL=https://$url" >> $GITHUB_ENV

      - name: Run Playwright E2E against preview
        env:
          BASE_URL: ${{ env.BASE_URL }}
          TEST_CLASS_ID: ${{ secrets.TEST_CLASS_ID }}
          E2E_DISABLE_AUTH: 1
        run: npx playwright test --update-snapshots=false
```

說明與注意事項：
- 範例使用 Vercel API 查詢部署並以 `gitCommitSha` 找到對應 preview；此方式需要 `VERCEL_TOKEN` 與 `VERCEL_PROJECT_ID`（可存於 repo secrets）。
- 若已用另一個步驟（或第三方 action）部署到 Vercel，請依該 action 的輸出取得 URL（無需再呼叫 API）。
- 確保 CI 在執行測試前，該 preview 已完全可用（API 獲得的 deployment 可能還在建置中），可加入重試或等待機制。

如要我把這個 workflow 實作為 `.github/workflows/e2e-vercel-preview.yml`，我可以幫你建立並推到 repo（請確認是否要我直接新增）。
