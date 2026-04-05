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

### Phase 4: Summary & Cleanup
1. **回報**: 彙整 Vitest 與 Playwright 的成功/失敗報告。
2. **資源回收**: 若伺服器是由此 Skill 啟動，詢問是否需要終止 `npm run dev` 進程。

---

## [Error Handling]
- 若測試報錯涉及 Firebase，優先檢查是否誤觸了 Emulator 設定。
- 失敗時，主動提供錯誤分析與修復建議。