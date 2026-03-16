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

### 1. Firestore 集合結構

#### 集合：`classes`（班級資訊）
- `id`: string (文檔 ID: "class-A", "class-B")
- `name`: string (班級名稱，例如 "甲班", "乙班")
- `groupCount`: number (預設分組數 10)

- `active`: boolean (教師是否已啟動此班級，用於學生入口檢查)
- `activatedAt`: timestamp | null (啟動時間)
- `activatedBy`: string | null (啟動者 uid 或標示)

**用途**：儲存班級基本資訊，用於教師查看和管理
**備註**：有提供 `scripts/seed-classes.js` 可用來建立預設班級 (2A/2B/demo)

#### 集合：`participation_logs`（學生參與紀錄）
- `classId`: string (所屬班級 ID)
 - `classId`: string (所屬班級 ID)
 - `group`: string|number (所屬小組，保留以利即時聚合)
 - `points`: number (該筆紀錄的分數增量，通常為 1)
 - `timestamp`: serverTimestamp (紀錄時間戳)
 - `studentId`: string | null (如可辨識學生則填入，否則為 null)
 - `handRef`: DocumentReference (選填，指向原始 `hands_raised` 文件以保留追溯資訊)

**用途**：追蹤學生在課堂中的參與度和積分，支援即時聚合

**設計說明**：為避免在 `participation_logs` 複製大量 `hands_raised` 欄位，我們只保留最小必要欄位 (`classId`/`group`/`points`)，並新增 `handRef` 作為必要時的回溯引用。

#### 集合：`hands_raised`（舉手狀態）
- `classId`: string (所屬班級 ID)

 - `classId`: string (所屬班級 ID)
 - `group`: string|number (所屬小組 ID)
 - `ownerId`: string (舉手者的 participantId 或學生 uid)
 - `timestamp`: serverTimestamp (舉手時間戳)
 - `active`: boolean (是否仍在候補隊列，教師採取動作後會設為 false)
 - `resolved`: boolean (是否已被教師處理/裁定)
 - `cancelled`: boolean (若學生主動取消則為 true)

**用途**：即時跟踪學生舉手狀態，教師可即時監控

**設計說明**：`hands_raised` 保持即時性與完整性，教師在加分時會在 `participation_logs` 新增一筆（含 `handRef`），並把該 hand 的 `active` 設為 `false` 與 `resolved:true`。

教師按下「結束上課」會把 `classes/{id}.active` 設為 `false`（由 `EndClassButton` 實作），以避免非授權學生再度進入。

### 2. 資料流

#### 即時同步機制
- **教師監控面板**：監聽 `hands_raised` 集合（`status == 'active'`，按 `timestamp` 升序）
- **學生/教師檢視**：監聽 `participation_logs` 集合以即時聚合總積分

#### 狀態管理策略
- 使用 URL Search Params 或路由 `params` 傳遞 `classId` 和 `groupId`
- 學生首次選擇小組後，將 `groupId` 儲存至 `localStorage`

### 3. 資料庫操作

#### 讀取與寫入
- **讀取**：使用 `useEmulator` 函式根據環境變數切換本地或雲端 Firestore
- **寫入**：單元測試透過 `vi.mock()` 模擬 Firestore，避免實際資料庫操作

### 4. 認證（Firebase Auth）

#### 提供者配置
- **OAuth 提供者**：Google OAuth
- **匯出函式**：
  - `signInWithGoogle()`：啟動 Google 帳戶登入流程
  - `signOutUser()`：登出當前已認證用戶
  - `auth`：Firebase Auth 實例，用於檢查當前用戶狀態

### 5. 環境變數設定

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
