# sa2026 — 使用與開發（精簡版）

輕量說明與快速上手指令，含測試與模擬器提示。

快速開始
- 安裝依賴：

```bash
npm install
```

- 啟動開發伺服器（Turbopack）：

```bash
npm run dev
```

- 若遇相容性問題，改用 Webpack：

```bash
npm run dev:webpack
```

常用命令
- 建置（生產）：`npm run build`
- 本機預覽（生產）：`npm run start`
- 單元測試（Vitest）：`npm run test`
- E2E（Playwright）：`npm run test:e2e`
- 啟動 Firebase 模擬器：`npm run emulators:start`
- 一鍵 E2E 含模擬器：`npm run e2e:with-emulator`
- 啟動本機 MCP（供代理）：`npm run mcp:start`

環境變數（複製 `.env.example` → `.env.local`，填入 Firebase 金鑰）

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

測試注意事項
- 單元測試在 CI 與本機會 mock Firebase（見 `__tests__`）。
測試注意事項
- 單元測試在 CI 與本機會 mock Firebase（見 `__tests__`）。
- E2E 測試行為與環境變數：
	- 所有 E2E 測試應以「測試班級」為對象以避免影響真實資料；測試會優先尋找 `TEST_CLASS_ID`（若未設定則預設 `demo`）。
	- 建議設定以下環境變數（本機或 CI）：
		- `TEST_CLASS_ID` — 指定測試班級 id（預設 `demo`）。
		- `TEACHER_ID` / `TEACHER_PASSWORD` — 測試用老師帳號（可選，若不提供可使用 `E2E_DISABLE_AUTH`）。
		- `BASE_URL` — 測試的應用 URL（預設 `http://localhost:3000`）。
		- `E2E_DISABLE_AUTH` — 設為 `1` 可於本機/CI 繞過登入檢查（測試模式），配合模擬器或種子資料使用。
	- 在啟動班級的選單中，測試會優先選擇對應 `TEST_CLASS_ID` 的選項，若找不到則回退至第一個選項。
	- 建議在 CI pipeline 中設定 `TEST_CLASS_ID` 並能存取相對應測試班級（或使用 emulator + `E2E_DISABLE_AUTH=1`）。
- 若需真實後端請小心，建議先使用模擬器。

相關 `.md` 與專案文件
- 設計與規範：`.github/CONVENTIONS.md`, `.github/SCAFFOLD_UI_SPEC.md`, `.github/ARCHITECTURE.md`
- 測試與 SCRIPTS：`scripts/` 下的工具（`add-test-data.js`, `seed-classes.js`）
- Firebase / MCP：`FIREBASE_MCP_SETUP.md`, `firestore.rules`, `firebase.json`
- 重要程式檔案：`src/firebaseClient.js`, `src/styles/globals.css`

問題排查（常見）
- 無法啟動：清空 `.next/`、重新安裝或改用 `npm run dev:webpack`。
- Firebase 認證：確認 `.env.local` 與 Firebase 專案設定。
- E2E 超時：確認 `npm run dev` 正常運行，或延長 Playwright 超時設定。

貢獻與部署
- 建議建立分支並開 Pull Request。
- 部署到 Firebase Hosting：`npm run deploy` 或 `firebase deploy`（請先 `firebase login`）。

授權
- 本專案採用 MIT 授權。
