# 使用與開發指南

> 使用/開發這個專案的應注意事項。請根據您的角色（開發者 / 設計師 / 部署負責人）閱讀相應章節。

## 📋 目錄

1. [快速開始](#快速開始)
2. [開發工作流](#開發工作流)
3. [常見任務](#常見任務)
4. [故障排除](#故障排除)
5. [部署指南](#部署指南)
6. [相關文檔](#相關文檔)

---

## 快速開始

### 系統需求

- **Node.js**：18.17 或更新版本（建議 20+）
- **npm**：9.0 或更新版本
- **Git**：用於版本控制
- **Firebase 帳戶**：一個有效的 Firebase 專案

### 安裝與配置

#### 1. 複製或 Fork 此專案

```bash
git clone <repository-url>
cd sa2026
```

#### 2. 安裝依賴

```bash
npm install
```

#### 3. 配置環境變數

複製 `.env.example` 到 `.env.local`，並填入您的 Firebase 認證：

```bash
cp .env.example .env.local
```

編輯 `.env.local`：
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> 💡 **提示**：若無 Firebase 帳戶，請訪問 [Firebase Console](https://console.firebase.google.com) 建立專案。

#### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看應用。

> 🚀 **Turbopack**：預設使用 Turbopack 打包工具，啟動速度約 490ms。若遇問題，可改用 `npm run dev:webpack`。

---

## 開發工作流

### 日常開發

#### 編輯代碼並即時預覽
```bash
npm run dev
```

改動任何 `.jsx`、`.js`、`.css` 檔案後，頁面會自動刷新（HMR）。

#### 運行單元測試

**一次性運行：**
```bash
npm run test
```

**監視模式** (推薦開發時使用)：
```bash
npm run test:watch
```

**運行特定測試檔案：**
```bash
npm run test -- __tests__/MyComponent.test.jsx
```

#### 運行 E2E 測試

```bash
npm run test:e2e
```

或使用 Playwright UI：
```bash
npx playwright test --ui
```

查看測試報告：
```bash
npx playwright show-report test-results
```

### 與 Firebase MCP 伺服器協作

若您使用 Copilot / Claude 進行代碼生成，可啟用 Firebase MCP 伺服器：

```bash
npm run mcp:start
```

或指定專案目錄：
```bash
npm run mcp:start:with-dir
```

詳見 [FIREBASE_MCP_SETUP.md](FIREBASE_MCP_SETUP.md)。

### 樣式與設計

- **全域樣式**：在 `src/styles/globals.css` 修改
- **色票與 CSS 變數**：見 [CONVENTIONS.md](.github/CONVENTIONS.md)（開發規範）
- **UI 設計規格**：見 [SCAFFOLD_UI_SPEC.md](.github/SCAFFOLD_UI_SPEC.md)（應用UI設計）
- **設計參考**：本專案採用 ClassCue 配色方案

---

## 常見任務

### 添加新的 Firestore 集合

1. **更新 Firebase 規則**（`firestore.rules`）以允許讀寫
2. **初始化數據**：使用 `scripts/add-test-data.js` 或 Firebase Console
3. **在元件中查詢**：
   ```javascript
   import { db } from '@/firebaseClient';
   import { collection, getDocs } from 'firebase/firestore';

   const querySnapshot = await getDocs(collection(db, 'your-collection'));
   ```

### 添加新頁面

1. **在 `src/app/` 下建立檔案夾**（例如 `my-page/`）
2. **建立 `page.jsx`**：
   ```jsx
   export default function MyPage() {
     return <main>My Page Content</main>;
   }
   ```
3. **自動路由**：Next.js 會將此公開為 `/my-page`

※ 若需要布局，在同一檔案夾建立 `layout.jsx`（見 `src/app/test-list/layout.jsx`）

### 添加新元件

1. **在 `src/app/` 或適當位置建立 `MyComponent.jsx`**
2. **遵循代碼風格**（見 [CONVENTIONS.md](.github/CONVENTIONS.md)）
3. **添加單元測試** `__tests__/MyComponent.test.jsx`
4. **匯出並使用**：
   ```jsx
   import MyComponent from '@/app/MyComponent';
   ```

### 修改樣式

1. **全域樣式**：編輯 `src/styles/globals.css`
2. **內聯 className**：
   ```jsx
   <div className="my-component">
     {/* ... */}
   </div>
   ```
3. **嵌入 CSS**：在 globals.css 中定義，使用 CSS 變數
   ```css
   .my-component {
     background-color: var(--color-bg);
     border-radius: var(--radius-md);
   }
   ```

### 測試資料

使用提供的腳本添加測試資料到 Firestore：

```bash
node scripts/add-test-data.js
```

此腳本會在 `test` 集合中填入範例學生資料。

---

## 故障排除

### 問題：`npm run dev` 出錯

**症狀**：Turbopack 編譯失敗或無法啟動伺服器

**解決方案**：
1. 清空 `.next` 資料夾：`rm -rf .next`
2. 重新安裝依賴：`npm install`
3. 改用 Webpack：`npm run dev:webpack`
4. 檢查 Node.js 版本：`node --version`（應 ≥ 18.17）

### 問題：Firebase 認證失敗

**症狀**：登入按鈕不工作、錯誤訊息 "Cannot read properties of undefined"

**解決方案**：
1. 檢查 `.env.local` 環境變數是否正確填寫
2. 確認 Firebase 專案存在且已啟用認證
3. 檢查 Firebase 安全規則允許讀寫（開發時可設為 `allow read, write;`）
4. 重啟開發伺服器：`npm run dev`

### 問題：測試失敗

**症狀**：`npm run test` 出現紅色錯誤

**解決方案**：
1. 檢查 Firebase 模組是否正確 mock（見 `__tests__/firebaseClient.test.js`）
2. 檢查測試檔案位置：應在 `__tests__/` 資料夾
3. 檢查命名：`*.test.jsx` 或 `*.test.js`
4. 清空測試快取：`npm run test -- --clearCache`

### 問題：E2E 測試超時

**症狀**：Playwright 測試超時，無法連接 localhost:3000

**解決方案**：
1. 確保開發伺服器運行：`npm run dev`（在另一個終端）
2. 檢查 `playwright.config.js` 中的 `webServer` 配置
3. 增加超時時間：`test.setTimeout(60000)`
4. 檢查防火牆是否阻擋 localhost

### 問題：部署失敗

**症狀**：`npm run deploy` 出錯

**解決方案**：
1. 執行先 `npm run build`，確認構建成功
2. 檢查 `.firebaserc` 專案 ID 是否正確
3. 檢查 Firebase CLI 認證：`firebase login`
4. 檢查 `firebase.json` 配置，確認 `hosting.public` 為 `.next` 或正確的構建輸出目錄

---

## 部署指南

### 預發布檢查清單

- [ ] 所有單元測試通過：`npm run test`
- [ ] 所有 E2E 測試通過：`npm run test:e2e`
- [ ] 沒有未提交的變更：`git status`
- [ ] 環境變數已配置：檢查 `.env.local`
- [ ] 構建成功：`npm run build`（無警告或錯誤）

### 構建與部署到 Firebase Hosting

#### 1. 构建應用

```bash
npm run build
```

此命令會在 `.next/` 資料夾生成優化的構建。

#### 2. 驗證本地構建

```bash
npm run start
```

開啟 [http://localhost:3000](http://localhost:3000) 驗證生產構建。

#### 3. 部署到 Firebase Hosting

```bash
npm run deploy
```

或使用 Firebase CLI 直接部署：

```bash
firebase deploy
```

> 📝 **注意**：確保已登入 Firebase：`firebase login`

### 版本控制與標籤

每次部署前，建議建立 Git 標籤：

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 監控部署

部署後，在 [Firebase Console](https://console.firebase.google.com) 檢查：
- Hosting 部署歷史
- 即時調試日誌
- 性能指標

---

## 相關文檔

本專案使用模組化檔案結構，每份文檔有特定用途：

| 文檔 | 用途 | 適合對象 |
|------|------|--------|
| **[ARCHITECTURE.md](.github/ARCHITECTURE.md)** | 架構與資料模型 | 開發者、Copilot |
| **[CONVENTIONS.md](.github/CONVENTIONS.md)** | 代碼風格與 UI 準則 | 開發者、設計師、Copilot |
| **[SCAFFOLD_UI_SPEC.md](.github/SCAFFOLD_UI_SPEC.md)** | Scaffold UI 設計規格 | 設計師、前端開發者、Copilot |
| **[SCAFFOLD.md](.github/SCAFFOLD.md)** | 應用基礎架構功能清單 | 項目經理、開發者 |
| **[FIREBASE_MCP_SETUP.md](FIREBASE_MCP_SETUP.md)** | Firebase MCP 伺服器配置 | 開發者（使用 Copilot） |
| **[README.md](README.md)**（本檔） | 使用與開發指南 | 所有人 |

### 其他資源

- **官方文檔**：
  - [Next.js 文檔](https://nextjs.org/docs)
  - [Firebase 文檔](https://firebase.google.com/docs)
  - [Playwright 文檔](https://playwright.dev)
  - [Vitest 文檔](https://vitest.dev)

- **community**：
  - Next.js Discord
  - Firebase 社群論壇

---

## 常見問題 (FAQ)

### Q：Turbopack 和 Webpack 有什麼區別？
**A**：Turbopack 更快（約 490ms 啟動），但仍是 Beta 版。若遇相容性問題，改用 Webpack：`npm run dev:webpack`。

### Q：我應該何時使用 Firebase 模擬器？
**A**：本專案預設不使用模擬器。若需本地 Firestore 測試，設定 `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` 並啟動模擬器。

### Q：如何在團隊中協作代碼？
**A**：遵循 [CONVENTIONS.md](.github/CONVENTIONS.md) 的 Commit 規範，定期推送、拉請求 (PR)。Copilot 會根據文檔約定進行代碼審查。

### Q：頁面無法加載，如何調試？
**A**：
1. 檢查瀏覽器控制台（F12）錯誤訊息
2. 檢查終端輸出看是否有伺服器錯誤
3. 檢查 Firebase 規則和認證
4. 用 `npm run test` 運行單元測試確認邏輯

### Q：我可以離線開發嗎？
**A**：可以，但功能受限。若使用 Firebase（認證、Firestore），需啟用模擬器。或在單位測試用 mock 替代實際 Firebase 調用。

---

## 貢獻

若您發現問題或有改進建議，歡迎：
1. 開立 Issue
2. 建立功能分支：`git checkout -b feature/my-feature`
3. 提交 PR 並檢查所有測試通過

詳見 `.github/CONTRIBUTING.md`。

---

## 授權

此專案採用 MIT 授權。詳見 `LICENSE` 檔案。

---

**最後更新**：2026-03-16 | **維護人**：Project Team
- ✓ Firebase Authentication (Email/Password, Google, Magic Link ready)
- ✓ Firestore real-time integration with `onSnapshot`
- ✓ React Strict Mode enabled
- ✓ No Firebase emulators required in CI — unit tests mock Firebase modules
- ✓ Playwright E2E tests with live dev server

## Testing

```bash
npm run test           # Unit tests (Vitest)
npm run test:watch     # Watch mode
npm run test:e2e       # E2E tests (requires dev server running on :3000)
npm run test:unit      # Alias for unit tests
```

## Turbopack vs Webpack

**Turbopack (default)**
- Faster startup and incremental compilation (Rust-based)
- Better HMR UX with faster file watching
- Optimizes dev experience for rapid iteration

**Webpack (fallback)**
- Mature ecosystem, used in production builds
- More customizable plugin/loader ecosystem
- Accessible via `npm run dev:webpack`

The `webpack` function in `next.config.js` is preserved for:
- Webpack-based fallback `npm run dev:webpack` 
- Custom module aliasing (e.g., `undici: false` to avoid browser bundling)
- Future production configurability

## Important Notes

- **Turbopack HMR**: Successfully tested — file changes hot-reload without page refresh
- **Firebase Version**: ^11.0.0 (ensures latest Auth & Firestore features)
- **Node Version**: Recommend Node 20.19.0+ (current: 20.17.0)
- **No Emulators**: This project mocks Firebase in tests via `vi.mock()` — no local emulator container needed
- **Environment Setup**: See `.env.example` for required `NEXT_PUBLIC_FIREBASE_*` keys

## Development Workflow

1. Start dev server: `npm run dev` (Turbopack enabled by default)
2. Edit files in `src/` — HMR applies changes instantly
3. Run tests: `npm run test` (unit) or `npm run test:e2e` (E2E)
4. Build: `npm run build` → `npm run start` for production preview
5. Deploy: `npm run deploy` to Firebase Hosting

## MCP Usage (Recommended for agent uploads)

This project supports using a local MCP (Model Context Protocol) server to safely allow AI agents or editor integrations to modify and push repository files.

Quick start (local):

```bash
# Start the Firebase MCP server (runs locally and exposes an agent endpoint)
npm run mcp:start

# After MCP is running, instruct your agent/editor to use the MCP server to push commits.
# Example agent payloads typically specify: file paths, commit message, branch (default: main).
```

Security notes:
- MCP provides an auditable channel for remote agents — prefer MCP over sharing personal tokens.
- If MCP is unavailable, use `gh auth login` to authenticate the `gh` CLI and push changes manually.

如果你偏好中文說明：

```bash
# 啟動本機 MCP 伺服器
npm run mcp:start

# 啟動後，請透過支援 MCP 的代理或編輯器插件提交檔案（包含檔案路徑、commit 訊息與目標分支）。
```

## Frontend Design Updates

This project recently adopted a new frontend design inspired by the ClassCue reference site. The design changes include a centralized color system, updated header/footer layout, responsive adjustments, and accessibility improvements.

- Files updated:
   - `src/styles/globals.css` — design tokens (color variables), global styles, responsive rules, and focus-visible styles
   - `src/app/layout.jsx` — header and footer structure
   - `src/app/page.jsx` — homepage markup updated to use semantic classes
   - `src/app/test-list.jsx` — test-list table wrapped for responsive layout

- Color palette (ClassCue reference):
   - Primary (header/footer): `#aa5486`
   - Header text: `#fbf4db`
   - Background: `#f8fafc`
   - Surface/panels: `#ffffff`
   - Accent (question): `#ffa725`
   - Acceptance (secondary): `#27548a`
   - Cancel: `#d84040`
   - Register: `#1abc9c`

- Preview & Test:
   ```bash
   npm run dev       # start dev server
   npm run test      # unit tests (Vitest)
   npx playwright test  # E2E tests (Playwright)
   ```

For implementation details and design rationale see `instructions.md` in the project root.

Why use MCP:
- Avoid exposing personal PATs or SSH keys in ad-hoc scripts.
- Operations via MCP are easier to audit and restrict.
