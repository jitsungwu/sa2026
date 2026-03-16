# 架構與資料模型

> 這份檔案定義了數據的「骨架」，是 Copilot 撰寫 API 與資料讀取邏輯的唯一依據。

## 系統架構

### 大局觀
- **前端框架**：Next.js 16.1.6（App Router）
- **打包工具**：Turbopack（預設）+ Webpack（備用）
- **後端服務**：Firebase（Auth + Firestore）
- **部署平台**：Firebase Hosting

### 技術棧
```
┌─────────────────────────────────┐
│      Next.js App Router         │
│  (Turbopack + HMR at 490ms)      │
├─────────────────────────────────┤
│   Firebase Client Library        │
│  (Auth + Firestore + Storage)    │
├─────────────────────────────────┤
│    Firebase Backend Services     │
│  (Cloud Functions + Security)    │
└─────────────────────────────────┘
```

## 關鍵檔案與元件

### 核心初始化
- **`src/firebaseClient.js`**：Firebase 初始化、認證工具、Firestore 匯出
  - 匯出：`auth`、`db`、`signInWithGoogle`、`signOutUser`、`useEmulator`
  - 不使用本地 Firebase 模擬器（單元測試改用 mock）

### Next.js 應用結構
- **`src/app/layout.jsx`**：根布局（文檔外殼）
  - 設定網站語言：`zh-Hant`（繁體中文）
  - 包含全域樣式和主應用外殼

- **`src/app/page.jsx`**：首頁
  - 提供連結到 `/test-list` 路由

- **`src/app/test-list.jsx`**：共享客戶端元件
  - 渲染 `test` Firestore 集合
  - 支援響應式表格與互動

- **`src/app/test-list/page.jsx`**：路由頁面
  - 包裝 `test-list.jsx` 元件

- **`src/app/test-list/layout.jsx`**：嵌套布局
  - ⚠️ **限制**：禁止渲染 `<html>` 或 `<body>` 標籤

### 樣式與設計
- **`src/styles/globals.css`**：全域樣式
  - CSS 變數定義（色票、圓角、間距）
  - 響應式斷點：1024px / 768px / 480px
  - 無障礙 `:focus-visible` 樣式
  - 配色方案来自 ClassCue

### 配置檔案
- **`firebase.json`**：Firebase 託管與 Firestore 配置
  - `hosting.public` 指向 `dist` 目錄
  
- **`.firebaserc`**：Firebase 專案配置
  
- **`next.config.cjs`**：Webpack 備用配置
  - 別名化 `undici: false`（避免伺服器模組在客戶端打包中）
  
- **`.mcprc`**：MCP 伺服器配置（Firebase MCP 整合）

## 資料模型

### Firestore 集合：`test`
用來存儲學生測驗資料的主要集合。

**文件結構範例：**
```javascript
{
  id: "doc-id",
  name: "Student Name",
  email: "student@example.com",
  score: 85,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**相關操作：**
- 讀取：使用 `useEmulator` 切換本地或雲端
- 寫入：單元測試透過 `vi.mock()` 模擬 Firestore

### 認證（Firebase Auth）
- **提供者**：Google OAuth
- **匯出函式**：
  - `signInWithGoogle()`：使用 Google 帳戶登入
  - `signOutUser()`：登出當前用戶
  - `auth`：Firebase Auth 實例

### 環境變數
所有環境變數使用 `NEXT_PUBLIC_*` 前綴以暴露給客戶端：
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**設定方式**：
- 複製 `.env.example` 到 `.env.local`
- 填入您的 Firebase 專案認證

## 測試與模擬

### 單元測試（Vitest）
- **位置**：`__tests__/`
- **特點**：使用 `vi.mock()` 存根 `firebase/*` 模組
- **目的**：避免瀏覽器專用 API
- **檔案**：
  - `__tests__/firebaseClient.test.js`
  - `__tests__/App.test.jsx`
  - `__tests__/test-list.test.jsx`

### E2E 測試（Playwright）
- **位置**：`e2e/`
- **要求**：需要運行的開發伺服器
- **配置**：`playwright.config.js` 包含 `webServer` 設定
- **報告**：HTML + JSON 報告輸出到 `test-results/`
- **檔案**：
  - `e2e/example.spec.js`
  - `e2e/test-list.spec.js`

### Firebase 模擬器
- **預設**：**不使用**本地模擬器
- **啟用方式**：設定 `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` 並單獨啟動 Firebase 模擬器套件

## 資料流

### 讀取流程
```
Page/Component
    ↓
useEmulator() / Firebase Firestore
    ↓
Test Collection Document
    ↓
Component State/Props
    ↓
Render
```

### 認證流程
```
User Click "Sign In with Google"
    ↓
signInWithGoogle()
    ↓
Firebase Auth Provider
    ↓
Google OAuth Dialog
    ↓
auth.currentUser Updated
    ↓
Component Re-render
```

## 開發工作流綜合圖

```
npm install
    ↓
Copy .env.example → .env.local
    ↓
npm run dev (Turbopack)
    ↓
http://localhost:3000
    ↓
Edit Code → HMR Updates (~490ms)
    ↓
npm run test (Vitest with mocks)
    ↓
npx playwright test (E2E)
    ↓
npm run build
    ↓
npm run deploy (Firebase Hosting)
```

## Firebase MCP 伺服器

- **用途**：為 Copilot / Claude 提供 Firebase 操作能力
- **啟動**：`npm run mcp:start` 或指定專案目錄 `npm run mcp:start:with-dir`
- **配置**：參考 `FIREBASE_MCP_SETUP.md`
