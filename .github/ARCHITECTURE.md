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

- `scores`: object | null (💡 **新增** - 各組的實時累積分數，例如 `{ "group-1": 15, "group-2": 12, ... }`)
- `scoresLastUpdate`: timestamp | null (💡 **新增** - scores 最後更新時間)

**用途**：
1. 儲存班級基本資訊
2. 快取各組的實時積分（支援老師面板即時顯示，無需聚合）
3. 支援老師手動重新計算功能

**子集合**：
- `hands_raised/` - 舉手記錄（見下方說明）
- `participation_logs/` - 參與審計日誌（見下方說明）

**備註**：有提供 `scripts/seed-classes.js` 可用來建立預設班級 (2A/2B/demo)

#### 子集合：`classes/{classId}/participation_logs/`（學生參與審計日誌）💡 **新增結構**
- `group`: string|number (所屬小組 ID)
- `points`: number (該筆紀錄的分數增量，通常為 1)
- `timestamp`: serverTimestamp (紀錄時間戳)
- `givenBy`: string | null (打分者 uid)
- `handRef`: DocumentReference (選填，指向原始 `hands_raised` 文件以保留追溯資訊)

**用途**：
1. 記錄每一次打分的完整審計日誌
2. 保留原始數據供後期查詢和分析
3. 支援老師「重新計算小組總分」功能

**設計說明**：
- 改為 **子集合** 結構（從頂級集合遷移）以減少查詢成本
- 只保留最小必要欄位，避免冗餘
- 配合 `classes/{classId}.scores` 快取，打分時使用 Batch Write 同時更新兩者
- 課程結束時可批量刪除整個子集合

**性能優化**：
- 顯示積分榜：只需讀取 `classes/{classId}.scores` (1 次 read)
- 而非聚合整個 `participation_logs` 集合 (1000+ 次 read)
- 老師重新計算時才讀取完整 logs，費用極低

#### 子集合：`classes/{classId}/hands_raised/`（舉手狀態）💡 **新增結構**
- 文檔 ID 通常為 `group-{groupId}` 或其他唯一標識
- `group`: string|number (所屬小組 ID)
- `ownerId`: string (舉手者的 participantId 或學生 uid)
- `timestamp`: serverTimestamp (舉手時間戳)
- `active`: boolean (是否仍在候補隊列，教師採取動作後會設為 false)
- `resolved`: boolean (是否已被教師處理/裁定)
- `cancelled`: boolean (若學生主動取消則為 true)

**用途**：
1. 即時跟踪學生舉手狀態，教師可即時監控
2. 支援"每組限舉一次"業務需求
3. 保留完整歷史審計資訊

**設計說明**：
- 改為 **子集合** 結構（從頂級集合遷移）以提升查詢效率
- 按班級分層存儲，避免全表掃描
- 實現"每組限舉一次"只需查詢單個文檔：`classes/{classId}/hands_raised/group-{groupId}`
- 教師在加分時會在 `participation_logs` 新增一筆（含 `handRef`），並把該 hand 的 `active` 設為 `false` 與 `resolved:true`
- 課程結束時可批量刪除整個子集合

**性能優化**：
- 查詢成本：O(N) 全表掃描 → O(1) 單班級查詢
- 減少 Firestore reads 約 90%

### 2. 資料流

#### 即時同步機制
- **教師監控面板**：監聽 `classes/{classId}/hands_raised` 子集合（按 `timestamp` 升序）
- **積分榜顯示**：監聽 `classes/{classId}` 的 `scores` 欄位（1 次 read，無需聚合）✨
- **重新計算**：老師按按鈕時讀取 `classes/{classId}/participation_logs` 全部文檔並聚合

#### 狀態管理策略
- 使用 URL Search Params 或路由 `params` 傳遞 `classId` 和 `groupId`
- 學生首次選擇小組後，將 `groupId` 儲存至 `localStorage`

#### 打分流程（使用 Batch Write 保證原子性）
```
老師打分
  ↓
[Batch Write]
  1. 寫入 classes/{classId}/participation_logs/{newId}
  2. 更新 classes/{classId}.scores.{group} += points
  3. 更新 classes/{classId}.scoresLastUpdate
  ↓
UI 透過 onSnapshot(classes/{classId}) 實時更新
```

### 3. 資料庫操作

#### 讀取與寫入
- **讀取**：使用 `useEmulator` 函式根據環境變數切換本地或雲端 Firestore
- **寫入**：
  - 打分：使用 `writeBatch()` 原子更新 logs + scores
  - 單元測試：透過 `vi.mock()` 模擬 Firestore，避免實際資料庫操作
- **重新計算**：老師可點擊按鈕觸發 `recalculateScores()`，聚合 logs 並更新 scores

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

## 資料庫優化實施指南

**日期**：2026年4月23日  
**目的**：解決 `hands_raised` 和 `participation_logs` 的性能問題

### 概述

本項目實施了兩項重要的數據庫優化，以改善 Firestore 的查詢效率和成本：

1. **問題一：`hands_raised` 按班級分層**
   - 改為：`classes/{classId}/hands_raised/` 子集合
   - 收益：查詢效率提升 90%+，支援"每組限舉一次"需求

2. **問題二：`participation_logs` 聚合快取**
   - 改為：`classes/{classId}/participation_logs/` 子集合
   - 新增：`classes/{classId}.scores` 實時快取
   - 新增：老師可手動"重新計算小組總分"功能
   - 收益：積分榜讀取次數 99%+ 減少（1000+ → 1）

### 詳細文檔

完整的分析、設計文檔和實施代碼見：
- **[DATABASE_OPTIMIZATION_ANALYSIS.md](DATABASE_OPTIMIZATION_ANALYSIS.md)** 
  - 完整問題分析
  - 設計方案對比
  - 實施代碼示例（含 React 元件）
  - 遷移計劃和清單

### 核心改變

#### 新增字段

在 `classes/{classId}` 文檔中：
```javascript
{
  // 既有欄位
  name: "甲班",
  active: true,
  
  // 新增欄位（積分快取）
  scores: { "group-1": 15, "group-2": 12, ... },
  scoresLastUpdate: serverTimestamp()
}
```

#### 新增子集合

1. **`classes/{classId}/hands_raised/`**
   - 文檔 ID：`group-{groupId}`
   - 用途：按班級存儲舉手記錄
   - 查詢：按班級查詢無需全表掃描

2. **`classes/{classId}/participation_logs/`**
   - 用途：審計日誌（只寫、不修改）
   - 配合：`classes/{classId}.scores` 實時快取
   - 功能：支援老師"重新計算"和"查詢歷史"

### 實施優先級

| 優先級 | 任務 |
|--------|------|
| 🔴 P1 | 新增 `scores` 欄位 + 打分時使用 Batch Write |
| 🔴 P1 | 實現"重新計算小組總分"功能 + UI 按鈕 |
| 🔴 P1 | 遷移 `hands_raised` 到 `classes/{classId}/hands_raised/` |
| 🟠 P2 | 更新 Firestore 安全規則（見 `firestore.rules`） |
| 🟡 P3 | 清理舊資料（頂級 `hands_raised` 和 `participation_logs` 集合） |

### Firestore 規則

已在 `firestore.rules` 中更新：
- ✅ 保護 `participation_logs` 只允許追加
- ✅ 允許老師更新 `classes.scores`
- ✅ 向後相容：舊頂級集合仍可讀寫（逐步遷移）

### 成本影響

| 指標 | 改進前 | 改進後 | 節省 |
|------|--------|--------|------|
| 每課程積分榜 reads | 1000+ | 1 | **99%+** |
| 每課程成本 | ¥100+ | ¥1-2 | **99%+** |
| 年度成本（假設每天 10 堂課） | ¥3,000+ | ¥300-600 | **80~90%** |

## Firebase MCP 伺服器

- **用途**：為 Copilot / Claude 提供 Firebase 操作能力
- **啟動**：`npm run mcp:start` 或指定專案目錄 `npm run mcp:start:with-dir`
- **配置**：參考 `FIREBASE_MCP_SETUP.md`
