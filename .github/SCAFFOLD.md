# Scaffold 功能清單

> 這份是「應用基礎架構的施工清單」，Copilot 看到這份就知道應用的核心功能與頁面。

## 概述

Scaffold（應用基礎架構）目標是建立一個完整的前端應用基礎，包括認證、資料顯示、UI 框架，確保所有核心功能能正常運作。

**狀態**：🚀 持續完善  
**優先級**：🔴 核心功能

---

## 功能清單

### ✅ 已完成

- [x] **項目初始化**
  - [x] Next.js 16.1.6 + Turbopack 配置
  - [x] Firebase 初始化（Auth + Firestore）
  - [x] 環境變數配置（`.env.local`）
  - [x] Vitest + Playwright 測試框架

- [x] **UI 框架搭建**
  - [x] Header/Footer 佈局（ClassCue 配色）
  - [x] 全域 CSS 變數與樣式
  - [x] 響應式設計框架（3 個斷點：480px, 768px, 1024px）
  - [x] 無障礙支援（焦點指示器、語意化 HTML）

- [x] **認證功能**
  - [x] Google OAuth 登入集成
  - [x] 登出功能
  - [x] 認證狀態管理

- [x] **測驗清單頁面**  
  - [x] Firestore `test` 集合讀取
  - [x] 表格顯示學生記錄（Desktop 版）
  - [x] 基本樣式（顏色、圓角、間距）
  - [x] 搜尋與排序功能框架

### 🔄 進行中

- [ ] **測驗清單頁面完善**
  - [ ] 響應式卡片視圖（Tablet / Mobile）
  - [ ] 搜尋查詢邏輯實現
  - [ ] 排序功能詳細實現
  - [ ] 分頁或無限滾動
  - [ ] 編輯 / 刪除按鈕功能

- [ ] **測試覆蓋**
  - [ ] 單元測試：Header、Footer、TestList 元件
  - [ ] E2E 測試：登入流程、頁面導航、表格操作
  - [ ] 覆蓋率目標：≥ 80%

### ⏳ 待做

- [ ] **額外功能** (Sprint 2 候選)
  - [ ] 新增測驗紀錄表單後續開發
  - [ ] 詳細查看頁面
  - [ ] 批量操作 (刪除、匯出)
  - [ ] 通知系統
  - [ ] 使用者設定頁面

---

## 頁面與元件

### 首頁 (`/`) 

#### 狀態：🟡 進行中

#### 模型
```jsx
export default function Home() {
  // 頁面邏輯
}
```

#### 功能清單
- [x] Hero 區 (標題 + 副標題)
- [x] Google 登入按鈕
- [ ] 功能卡片區（3 欄響應式）
- [ ] 行動呼籲 (CTA) 區 (連結至 /test-list)

#### UI 容納物：
- `<header>` Header 元件
- `<main>` 主要內容
  - Hero 標題 H1
  - 副標題與說明
  - Google 登入按鈕
  - 3 個功能卡片（響應式：Desktop 3列、Tablet 2列、Mobile 1列）
  - CTA 按鈕
- `<footer>` Footer 元件

#### 按鈕需求
- **[Sign In with Google]** → 觸發 `signInWithGoogle()`
- **[View Tests]** → 導航到 `/test-list`

#### 樣式需求（見 SPRINT_1_UI_SPEC.md）
- 背景：`#f8fafc`
- 標題色：`#333`
- 按鈕色：`#ffa725` (橙色)
- 卡片背景：`#ffffff`
- 響應式：在 480px、768px、1024px 調整布局

---

### 測驗清單頁 (`/test-list`)

#### 狀態：🟡 進行中

#### 檔案
- `src/app/test-list/page.jsx` → 路由 (外殼)
- `src/app/test-list/layout.jsx` → 嵌套布局
- `src/app/test-list.jsx` → 共享元件 (主邏輯)

#### 功能清單
- [x] 從 Firestore `test` 集合讀取資料
- [x] 表格顯示 (Desktop)
- [ ] 響應式卡片視圖 (Mobile/Tablet)
- [ ] 搜尋框 (by name)
- [ ] 排序下拉 (by name / score / date)
- [ ] 編輯按鈕 → 3rd Sprint (pending)
- [ ] 刪除按鈕 → 3rd Sprint (pending)
- [ ] 分頁 (假設 > 50 筆資料) → 2nd Sprint

#### UI 容納物：
- 頂部操作欄
  - [x] 頁面標題 "Test Records"
  - [ ] 搜尋框 `<input type="search">`
  - [ ] 排序下拉 `<select>`
  
- 資料區
  - Desktop (≥ 1024px)：完整表格
    - 列：Name | Score | Date | Action
  - Tablet (768px - 1023px)：精簡表格（隱藏部分列）
  - Mobile (< 768px)：卡片視圖
    ```
    ┌──────────────────┐
    │ Name: John Doe   │
    │ Score: 95        │
    │ Date: 2026-03-16 │
    │ [View]           │
    └──────────────────┘
    ```

#### 表格欄位 (根據 `test` 集合):
```
文件欄位 → 表格列

id          → (隱藏)
name        → Name
score       → Score
createdAt   → Date (格式化：YYYY-MM-DD)
updatedAt   → (隱藏或僅內部使用)
```

#### 搜尋需求
- [ ] 即時搜尋 (as user types)
- [ ] 搜尋欄位：name（學生名稱）
- [ ] 搜尋是否區分大小寫：否 (case-insensitive)
- [ ] 如無結果，顯示 "No records found"

#### 排序需求
- [ ] 預設排序：按日期 (最新)
- [ ] 選項 1：Name (A-Z)
- [ ] 選項 2：Name (Z-A)
- [ ] 選項 3：Score (High-Low)
- [ ] 選項 4：Score (Low-High)
- [ ] 選項 5：Date (Recent)
- [ ] 選項 6：Date (Oldest)

#### 按鈕需求
- **[View]** → 暫定導航至 `/test-list/[id]`（待實現）
- **[Edit]** → 暫定開啟編輯對話框（Sprint 2）
- **[Delete]** → 暫定開啟確認對話框（Sprint 2）

#### 樣式需求（見 SPRINT_1_UI_SPEC.md）
- 背景：`#f8fafc`
- 表頭背景：`#f0f0f0`
- 表格行 Hover：`#f9f9f9`
- 大按鈕：`#27548a` (深藍)
- 刪除按鈕：`#d84040` (紅)

---

### 標頭與頁腳

#### Header 元件 (`src/app/layout.jsx` 嵌入)

##### 功能清單
- [x] Logo / 品牌名稱（左側）
- [x] 導航菜單（中央）
  - [ ] Home
  - [ ] Test List
- [x] 用者菜單（右側）
  - [ ] 若登入：顯示使用者名稱 + [Sign Out] 按鈕
  - [ ] 若未登入：[Sign In with Google] 按鈕

##### UI 容納物
```jsx
<header className="header">
  <div className="header__container">
    <div className="header__logo">Logo</div>
    <nav className="header__nav">
      <a href="/">Home</a>
      <a href="/test-list">Test List</a>
    </nav>
    <div className="header__user">
      {user ? (
        <>
          <span className="header__username">{user.displayName}</span>
          <button className="header__button" onClick={handleSignOut}>
            Sign Out
          </button>
        </>
      ) : (
        <button className="header__button" onClick={handleSignIn}>
          Sign In with Google
        </button>
      )}
    </div>
  </div>
</header>
```

##### 樣式需求
- 背景色：`#aa5486`
- 文字色：`#fbf4db`
- 高度：60px
- 按鈕背景：`#fbf4db`、按鈕文字色：`#aa5486`

---

#### Footer 元件 (`src/app/layout.jsx` 嵌入)

##### 功能清單
- [x] 版權文字
- [ ] 快速連結 (Privacy / Terms / Contact)
- [ ] 社群連結 (可選)

##### UI 容納物
```jsx
<footer className="footer">
  <div className="footer__container">
    <div className="footer__copyright">
      © 2026 Project Name. All rights reserved.
    </div>
    <nav className="footer__links">
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms of Service</a>
      <a href="/contact">Contact Us</a>
    </nav>
  </div>
</footer>
```

##### 樣式需求
- 背景色：`#aa5486`
- 文字色：`#fbf4db`
- 高度：自適應（最小 60px）
- 內邊距：32px 上下、16px 左右

---

## 技術需求

### 前端框架 & 工具
- **Next.js 16.1.6** （App Router）
- **Turbopack** (預設打包工具)
- **Firebase 11.0.0** (Auth + Firestore)
- **CSS** (全域 CSS，無 CSS-in-JS 框架如 styled-components)

### 測試框架
- **Vitest** (單元測試)
  - 模擬 Firebase 模組
  - 最少單元測試涵蓋率：80%
  
- **Playwright** (E2E 測試)
  - 測試認證流程、頁面導航、表格操作
  - 最少 E2E 測試數：5+ scenarios

### 環境配置
- **Node.js**：18.17+
- **npm**：9.0+
- **環境變數**：由 `.env.local` 管理（NEXT_PUBLIC_* 前綴）

---

## 測試任務

### 單元測試 (Vitest)

- [ ] **Header 元件**
  - [ ] 渲染 Logo
  - [ ] 渲染導航菜單
  - [ ] 認證狀態：未登入時顯示 Sign In 按鈕
  - [ ] 認證狀態：登入後顯示 Sign Out 按鈕 + 使用者名稱
  - [ ] 點擊 Sign In 觸發 signInWithGoogle()
  - [ ] 點擊 Sign Out 觸發 signOutUser()

- [ ] **Footer 元件**
  - [ ] 渲染版權文字
  - [ ] 渲染快速連結
  - [ ] 連結指向正確 URL

- [ ] **測驗清單元件**
  - [ ] Firestore 資料成功讀取並展示
  - [ ] 搜尋功能：輸入名稱時過濾結果
  - [ ] 排序功能：選擇排序選項時重新排列資料
  - [ ] 無空資料時顯示 "No records found"
  - [ ] 表格正確渲染（Desktop）
  - [ ] 卡片視圖正確渲染（Mobile stub）

- [ ] **首頁元件**
  - [ ] Hero 區正確渲染
  - [ ] 登入按鈕觸發認證
  - [ ] 功能卡片展示

#### 覆蓋率目標
- 語句覆蓋率 (Statement)：≥ 80%
- 分支覆蓋率 (Branch)：≥ 70%
- 函數覆蓋率 (Function)：≥ 80%

### E2E 測試 (Playwright)

- [ ] **登入流程**
  - [ ] 使用者點擊 "Sign In with Google"
  - [ ] 重定向至 Google OAuth 對話框 (或模擬)
  - [ ] 登入後重新導向回應用
  - [ ] Header 顯示使用者名稱

- [ ] **首頁導航**
  - [ ] 頁面在 Desktop / Tablet / Mobile 正確顯示
  - [ ] 點擊 "View Tests" 導航至 `/test-list`

- [ ] **測驗清單頁面操作**
  - [ ] 頁面加載後表格或卡片正確顯示
  - [ ] 搜尋框功能：輸入名稱篩選結果
  - [ ] 排序下拉功能：改變排序順序
  - [ ] 點擊 [View] 按鈕（導航至詳細頁面）
  - [ ] 響應式：在不同視窗大小下正確顯示

- [ ] **登出流程**
  - [ ] 點擊 [Sign Out] 按鈕
  - [ ] 重定向至首頁
  - [ ] Header 回復 Sign In 按鈕

- [ ] **無障礙性**
  - [ ] 鍵盤導航 (Tab 鍵) 可訪問所有互動元素
  - [ ] 焦點指示器清晰可見
  - [ ] 按鈕與連結有明顯的 `:focus-visible` 樣式

---

## 設計檢查清單

參考 [SPRINT_1_UI_SPEC.md](SPRINT_1_UI_SPEC.md) 進行視覺驗證：

- [ ] Header / Footer 背景色 `#aa5486`，文字 `#fbf4db`
- [ ] 主背景 `#f8fafc`，卡片 `#ffffff`
- [ ] 按鈕顏色：橙 `#ffa725`、藍 `#27548a`、紅 `#d84040`、綠 `#1abc9c`
- [ ] 所有按鈕宽高符合規範（內邊距 12px 上下、24px 左右）
- [ ] 圓角：小元件 4px、卡片 8px、大容器 12px
- [ ] 響應式斷點在 480px / 768px / 1024px 正確啟動
- [ ] Hover / Active 動畫平滑（過渡時間 0.3s）
- [ ] 焦點指示器（2px 邊界，顏色 `#aa5486`，偏移 2px）

---

## 提交與審查

### Commit 規範
遵循 [CONVENTIONS.md](CONVENTIONS.md) 的 Commit 規範：

```
feat(page-name): description of change

Body explaining the change in more detail.

Closes #issue-number (if applicable)
```

**範例**：
```
feat(test-list): add search and sort functionality

Implement real-time filter by student name and sorting options
(Name, Score, Date). Update table styling per ClassCue spec.

Closes #15
```

### 代碼審查重點
- [ ] 遵循 CONVENTIONS.md 代碼風格
- [ ] 單元 + E2E 測試通過
- [ ] 無 console.error / console.warn
- [ ] 無未使用的變數或匯入
- [ ] Accessibility：焦點管理正確、語意化 HTML

### 部署至 Firebase
```bash
npm run build && npm run deploy
```

---

## 進度追蹤

### 週進度
| 日期 | 任務 | 狀態 |
|------|------|------|
| Day 1 | UI 框架 + Header/Footer | ✅ |
| Day 2 | 認證流程 | ✅ |
| Day 3 | 首頁實現 | 🟡 |
| Day 4 | 測驗清單頁 (Desktop) | 🟡 |
| Day 5 | 測驗清單頁 (Responsive) | ⏳ |
| Day 6 | 單元測試 | ⏳ |
| Day 7 | E2E 測試 + 部署 | ⏳ |

### 風險與緩解
| 風險 | 影響 | 緩解策略 |
|------|------|--------|
| Turbopack 不穩定 | 開發延遲 | 備用 Webpack，快速回退 |
| Firebase 配置問題 | 功能阻礙 | 提前驗證環境變數 |
| 測試覆蓋率不足 | 線上 bug | 定期運行測試，早期反饋 |

---

## 相關文檔連結

- [ARCHITECTURE.md](ARCHITECTURE.md) — 系統架構與資料模型
- [CONVENTIONS.md](CONVENTIONS.md) — 代碼風格與開發規範
- [SCAFFOLD_UI_SPEC.md](SCAFFOLD_UI_SPEC.md) — UI 設計詳細規格
- [README.md](../README.md) — 快速開始與故障排除
- [FIREBASE_MCP_SETUP.md](../FIREBASE_MCP_SETUP.md) — Firebase MCP 配置

---

**最後更新**：2026-03-16 | **維護人**：Dev Team
