# Scaffold UI 規格

> 這份是「應用基礎架構的畫面施工清單」，Copilot 看到這份就知道畫面的基本規劃。

## 設計哲學

本專案前端視覺樣式採用 ClassCue 的配色與設計風格，整體強調清晰、現代、無障礙友善的用户體驗。

## 全域設計系統

### 色票（Color Palette）

#### 主色調
| 用途 | 顏色代碼 | RGB | 使用情境 |
|------|---------|-----|--------|
| 主色（Header / Footer） | `#aa5486` | rgb(170, 84, 134) | 品牌色、頁首頁尾背景 |
| 頁首文字 | `#fbf4db` | rgb(251, 244, 219) | Header 文字、按鈕文字 |
| 背景 | `#f8fafc` | rgb(248, 250, 252) | 頁面主背景 |
| 卡片 / 面板 | `#ffffff` | rgb(255, 255, 255) | 內容容器 |

#### 功能按鈕
| 用途 | 顏色代碼 | RGB | 說明 |
|------|---------|-----|------|
| 主按鈕（橙色） | `#ffa725` | rgb(255, 167, 37) | 問問題、主能作 |
| 次按鈕（深藍） | `#27548a` | rgb(39, 84, 138) | 接受、確認 |
| 取消按鈕（紅） | `#d84040` | rgb(216, 64, 64) | 刪除、取消、拒絕 |
| 註冊按鈕（綠） | `#1abc9c` | rgb(26, 188, 156) | 成功、新增、可操作 |

### 造型設計

#### 圓角（Border Radius）
```css
--radius-sm: 4px;    /* 小按鈕、輸入框 */
--radius-md: 8px;    /* 卡片、面板 */
--radius-lg: 12px;   /* 大型容器 */
```

#### 間距系統（Spacing）
```css
--spacing-xs: 4px;   /* 細微間距 */
--spacing-sm: 8px;   /* 元素間距*/
--spacing-md: 16px;  /* 標準間距 */
--spacing-lg: 24px;  /* 大型間距 */
--spacing-xl: 32px;  /* 超大間距 */
```

#### 字體與排版
- **字體家族**：系統預設字體（`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, 等）
- **標題**：
  - H1：28px / 1.2 line-height / 600 weight
  - H2：24px / 1.2 line-height / 600 weight
  - H3：20px / 1.2 line-height / 600 weight
- **正文**：16px / 1.5 line-height / 400 weight
- **小文字**：14px / 1.4 line-height / 400 weight

#### 動畫與過渡
```css
/* 標準過渡時間 */
--transition-fast: 150ms;
--transition-normal: 300ms;
--transition-slow: 500ms;

/* 緩動函數 */
--easing-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--easing-ease-out: cubic-bezier(0, 0, 0.2, 1);
```

- 所有互動元素應有平滑的懸停與活躍動畫
- Hover 狀態：輕微縮放（0.98x）或背景色變化
- Active 狀態：更明顯的視覺反饋

### 無障礙設計

#### 焦點指示器
```css
:focus-visible {
  outline: 2px solid #aa5486;
  outline-offset: 2px;
}
```

#### 顏色對比
- 背景 (`#f8fafc`) + 文字 (`#333`) 對比度 ≥ 4.5:1
- 按鈕文字與背景對比度 ≥ 4.5:1

## 應用程式布局

### 整體結構

```
┌─────────────────────────────────────────┐
│         Header (#aa5486)                │
│  Logo | Navigation | User Menu           │
├─────────────────────────────────────────┤
│                                         │
│         Main Content (#f8fafc)          │
│     (Pages 使用此背景)                   │
│                                         │
├─────────────────────────────────────────┤
│         Footer (#aa5486)                │
│     Copyright & Links                   │
└─────────────────────────────────────────┘
```

### Header（頁首）

#### 結構
- **背景色**：`#aa5486`
- **文字色**：`#fbf4db`
- **高度**：60px / 3.75rem
- **內邊距**：16px top/bottom
- **顯示內容**：
  - Logo（左側）：品牌名稱或圖示
  - 導航菜單（中央）：主要路由連結
  - 用户菜單（右側）：登入/登出、用户名稱

#### 樣式詳情
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
        <button className="header__button">Sign Out</button>
      ) : (
        <button className="header__button">Sign In</button>
      )}
    </div>
  </div>
</header>
```

#### Header 按鈕
- **背景色**：`#fbf4db`（或半透明）
- **文字色**：`#aa5486`
- **圓角**：4px
- **內邊距**：8px 16px
- **Hover**：背景透明度降低（alpha 0.9）

### Footer（頁腳）

#### 結構
- **背景色**：`#aa5486`
- **文字色**：`#fbf4db`
- **高度**：自適應（最小 60px）
- **內邊距**：32px top/bottom、16px left/right
- **顯示內容**：
  - 版權宣告（左側）
  - 重要連結（中央）：Privacy、Terms、Contact
  - 社群連結（右側）：如適用

#### 樣式詳情
```jsx
<footer className="footer">
  <div className="footer__container">
    <div className="footer__copyright">
      © 2026 Project Name. All rights reserved.
    </div>
    <nav className="footer__links">
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="/contact">Contact</a>
    </nav>
  </div>
</footer>
```

## 頁面規格

### 首頁（`/`）

#### 用途
歡迎用户、展示專案信息、導引至主要功能

#### 佈局
```
┌────────────────────────────────────┐
│          歡迎部分                   │
│  "Welcome to Project Name"          │
│  簡短說明文字                       │
│  [Sign In with Google Button]       │
├────────────────────────────────────┤
│      功能卡片區（3 欄響應式）      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐
│  │ Feature │ │ Feature │ │ Feature │
│  │   1     │ │   2     │ │   3     │
│  └─────────┘ └─────────┘ └─────────┘
├────────────────────────────────────┤
│      行動呼籲 (CTA) 區              │
│    [View All Tests] 或其他主 CTA   │
└────────────────────────────────────┘
```

#### 主要元素
- **標題**：H1，居中，顏色 `#333`
- **副標題**：16px，灰色，說明專案目的
- **登入按鈕**：背景 `#ffa725`，文字白色或深色，內邊距 12px 24px
- **功能卡片**：
  - 背景 `#ffffff`，邊框 1px `#e0e0e0`
  - 圓角 8px，外邊距 16px
  - 內容：圖示 + 標題 + 描述
  - Hover：輕微縮放、陰影增大

### 測驗清單頁（`/test-list`）

#### 用途
顯示所有學生測驗記錄、支援篩選與排序

#### 佈局
```
┌────────────────────────────────────┐
│      頁面標題 + 篩選工具            │
│  H2 "Test Records"  [Filter] [Sort] │
├────────────────────────────────────┤
│      響應式表格 / 卡片 (Mobile)     │
│                                    │
│  表頭 (Desktop):                   │
│  │ Name │ Score │ Date │ Action │  │
│  ├──────┼───────┼──────┼────────┤  │
│  │ ...  │  ...  │ ...  │ ...    │  │
│                                    │
└────────────────────────────────────┘
```

#### 主要元素

##### 頂部操作欄
```jsx
<div className="test-list__header">
  <h2 className="test-list__title">Test Records</h2>
  <div className="test-list__controls">
    <input type="search" placeholder="Search by name..." />
    <select>
      <option value="">Sort by...</option>
      <option value="name">Name (A-Z)</option>
      <option value="score">Score (High-Low)</option>
      <option value="date">Date (Recent)</option>
    </select>
  </div>
</div>
```

##### 響應式表格
**Desktop (≥ 1024px)：**
```
┌─────────────┬────────┬────────────┬──────────┐
│    Name     │ Score  │    Date    │  Action  │
├─────────────┼────────┼────────────┼──────────┤
│ John Doe    │  95    │ 2026-03-16 │ [View]   │
│ Jane Smith  │  87    │ 2026-03-15 │ [View]   │
└─────────────┴────────┴────────────┴──────────┘
```

**Tablet (768px - 1023px)：**
- 顯示 Name、Score、Date
- Action 按鈕改為圖示

**Mobile (< 768px)：**
- 轉換為卡片視圖
- 每卡片顯示：名字、分數、日期、操作按鈕

##### 表格樣式
- **表頭背景**：`#f0f0f0`
- **表頭文字**：`#333`，600 weight
- **行高度**：48px
- **行間隔**：1px 清晰邊界
- **Hover 行**：背景 `#f9f9f9`
- **斑馬紋** (可選)：奇數行背景 `#fafafa`

##### 按鈕樣式
- **查看按鈕**：背景 `#27548a`、文字白色
- **刪除按鈕**：背景 `#d84040`、文字白色
- **編輯按鈕**：背景 `#1abc9c`、文字白色

## 響應式斷點

### 設計斷點
```css
/* Mobile First */
/* 預設：< 480px，單欄布局 */

@media (min-width: 480px) {
  /* 小平板：480px - 767px */
  /* 調整：更寬的內邊距、調整字體 */
}

@media (min-width: 768px) {
  /* 平板：768px - 1023px */
  /* 調整：兩欄布局、表格顯示更多列 */
}

@media (min-width: 1024px) {
  /* 桌面：1024px+ */
  /* 調整：三欄及以上、完整表格視圖 */
}

@media (min-width: 1280px) {
  /* 大型桌面：1280px+ */
  /* 調整：最大寬度容器、側邊欄等 */
}
```

### 容器寬度
```css
.container {
  width: 100%;
  padding: 0 16px; /* Mobile */
  margin: 0 auto;
}

@media (min-width: 768px) {
  .container {
    max-width: 720px;
    padding: 0 24px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 960px;
    padding: 0 32px;
  }
}

@media (min-width: 1280px) {
  .container {
    max-width: 1200px;
  }
}
```

## 互動與動畫

### 按鈕互動

#### 狀態
1. **預設狀態**
   ```css
   background-color: #ffa725;
   color: #ffffff;
   cursor: pointer;
   transition: all 0.3s ease-out;
   ```

2. **Hover 狀態**
   ```css
   background-color: #ff9500;  /* 稍深的橙色 */
   transform: translateY(-2px);
   box-shadow: 0 4px 12px rgba(255, 167, 37, 0.3);
   ```

3. **Active 狀態**
   ```css
   background-color: #ff8800;  /* 更深 */
   transform: translateY(0);
   box-shadow: 0 2px 6px rgba(255, 167, 37, 0.2);
   ```

4. **焦點狀態** (鍵盤導航)
   ```css
   outline: 2px solid #aa5486;
   outline-offset: 2px;
   ```

5. **禁用狀態**
   ```css
   background-color: #cccccc;
   color: #999999;
   cursor: not-allowed;
   opacity: 0.5;
   ```

### 表格行互動
```css
.table__row {
  transition: background-color 0.2s ease-in-out;
}

.table__row:hover {
  background-color: #f9f9f9;
}

.table__row:focus-within {
  outline: 2px solid #aa5486;
  outline-offset: -2px;
}
```

### 加載動畫 (Spinner)
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### 淡入淡出 (Fade In)
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
```

## 實作檢查清單

### Header & Footer
- [ ] Header 高 60px，背景 `#aa5486`，文字 `#fbf4db`
- [ ] Footer 高度自適應，同背景與文字色
- [ ] 導航菜單在 Header 中
- [ ] 登入/登出按鈕在右側
- [ ] 響應式：Mobile 下菜單應折疊或改為圖示

### 首頁
- [ ] H1 標題居中
- [ ] 登入按鈕背景 `#ffa725`
- [ ] 功能卡片排成響應式網格（Desktop 3列、Tablet 2列、Mobile 1列）
- [ ] 卡片有圓角 8px、陰影、Hover 效果

### 測驗清單
- [ ] Desktop 顯示完整表格
- [ ] Tablet 隱藏或縮小某些列
- [ ] Mobile 轉換為卡片視圖
- [ ] 表格行有 Hover 背景色
- [ ] 搜尋框功能正常
- [ ] 排序下拉選單正常

### 全域
- [ ] 所有按鈕有焦點指示器
- [ ] 按鈕 Hover 有平滑過渡
- [ ] 使用 CSS 變數管理色票
- [ ] 字體與行高符合規格
- [ ] 頁面在 Mobile / Tablet / Desktop 正確響應
- [ ] 無障礙：可通過鍵盤導航、焦點可見、顏色對比足夠

---

**最後更新**：2026-03-16
