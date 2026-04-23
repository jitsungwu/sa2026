---
name: testing
description: "Use when running E2E tests or unit tests. Automatically manage Vitest and Playwright test execution with environment validation, pre-checks, per-check confirmation points, and cleanup."
applyTo:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.test.js"
  - "**/*.test.jsx"
  - "**/*.spec.js"
  - "**/*.spec.ts"
---

# Skill: Smart QA & Testing Pipeline (Vitest & Playwright)

## [Description]
標準化開發測試流程：從 Vitest 單元測試到 Playwright E2E 測試。自動處理環境預檢、人工確認點，並嚴格遵守 Firebase 限制。

## [Context & Constraints]
- **Unit Test**: Vitest (副檔名必須為 `.test.ts`)
- **E2E Test**: Playwright
- **Dev Server**: `npm run dev` (預設端口 localhost:3000)
- **Firebase Status**: ⚠️ **CRITICAL: FIREBASE EMULATOR IS BROKEN.**
  - **禁止** 執行 `firebase emulators:start`。
  - **禁止** 在測試腳本中使用 `connectFirestoreEmulator` 或 `connectAuthEmulator`。
  - 測試必須指向雲端開發環境 (Cloud Staging) 或使用純 Mock Data。

### � Authentication & Environment Requirements
- **Firebase 登入策略**：
  - ⚠️ **必須使用真實 Firebase 登入**（禁止使用 E2E_DISABLE_AUTH bypass）
  - 在 Playwright tests 中，使用實際帳號進行 login
  - 環境變數已於 `.env.local` 中設置：
    - `TEACHER_ID`：教師登入信箱
    - `TEACHER_PASSWORD`：教師登入密碼
  - 學生測試帳號來自 `e2e/test-accounts.json`（預設帳號密碼為學號）
- **PowerShell Compatibility**：
  - ⚠️ **只使用 PowerShell 原生 cmdlet**，勿使用 `grep`, `tail`, `sed`, `head` 等 Unix 工具
  - 替代方案：
    - `grep` → `Select-String`
    - `tail` → `Get-Content | Select-Object -Last`
    - `head` → `Get-Content | Select-Object -First`
    - `sed` → PowerShell string methods or `%{ ... }`
  - 在 Windows 環境下測試指令前，先驗證指令相容性

### �🔐 Test Accounts
- 測試帳號清單參考：[TEST_ACCOUNTS.md](../../../e2e/TEST_ACCOUNTS.md)
- 帳號數據來源：[Group_list_2026-04-04(demo).xlsx](../../../e2e/Group_list_2026-04-04(demo).xlsx)
- 環境變數：`.env.local` 中定義 `TEST_CLASS_ID`、`TEST_STUDENT_ACCOUNT`、`TEST_STUDENT_GROUP_ID`
- ⚠️ **重要**：僅使用已完成 signup 且記錄在案的帳號進行測試，避免測試數據汙染

### 📋 Test Account Pool Management
- **帳號池位置**: [test-accounts.json](../../../e2e/test-accounts.json)
- **結構**:
  - `disponible`: 可用的帳號陣列
  - `used`: 已使用過的帳號歷史紀錄
- **帳號不足時的行為**:
  - ✅ **正確做法**: 測試應該 **SKIP** 而不是失敗 (FAIL)
  - 例外: 僅當帳號池真的用盡時，才暫停測試
  - 確保帳號池中至少有 **4+ 可用帳號**
- **帳號復用策略**:
  - 建議定期清理 `test-accounts.json`，將已測試帳號移回 `disponible`
  - 或增加更多測試帳號到 Excel 檔案中，重新執行 import script

---

## [Execution Flow]

### Phase 1: Unit Testing (Vitest)
1. **分析邏輯**: 識別受影響的函數，規劃測試案例。
2. **生成腳本**: 編寫測試代碼，檔案命名為 `[filename].test.ts`。
3. **人工確認**: 
   - **WAIT**: 顯示 `.test.ts` 內容並詢問：「單元測試腳本已就緒，是否 OK？」
   - **ACTION**: 收到 "OK" 後，執行 `npx vitest run [file-path]`。
4. **結果處理**: 僅在 Pass 時進入 Phase 2。

### Phase 2: E2E Environment Pre-check
1. **端口探測**: 檢查 `localhost:3000` 是否已有服務運行。
2. **條件分支**:
   - **IF 已啟動**: 告知使用者「開發伺服器已就緒」。
   - **IF 未啟動**: 
     - **WAIT**: 詢問：「需要我執行 `npm run dev` 啟動伺服器嗎？」
     - **ACTION**: 使用者同意後，啟動並監控直到出現 "Ready" 訊息。

### Phase 3: E2E Testing (Playwright)
1. **生成腳本**: 根據需求編寫 Playwright 測試。
2. **人工確認**:
   - **WAIT**: 顯示 Playwright 腳本並詢問：「E2E 測試路徑已規劃，確認執行嗎？」
3. **自動化執行 (Non-Interactive)**:
   - **指令**: 執行 `npx playwright test`。
   - **限制**: 嚴禁使用 `--headed` 參數。確保以 Headless 模式運行以節省資源。
   - **安靜模式**: 運行期間不發起對話，僅回報最終結果。
   - **測試結果**: 
     - HTML report 不會自動打開（已禁用自動啟動）
     - 測試結果直接保存到 `./test-results` 文件夾
     - 若需查看 HTML report，可手動開啟 `./test-results/index.html`

### Phase 4: Summary & Cleanup
1. **回報**: 彙整 Vitest 與 Playwright 的成功/失敗報告。
2. **資源回收**: 若伺服器是由此 Skill 啟動，詢問是否需要終止 `npm run dev` 進程。

---

## [Error Handling]
- 若測試報錯涉及 Firebase，優先檢查是否誤觸了 Emulator 設定。
- 失敗時，主動提供錯誤分析與修復建議。