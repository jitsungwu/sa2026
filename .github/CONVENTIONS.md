# 開發規範

> 這份檔案定義了所有程式碼的風格與 UI 準則，確保 Copilot 產出的代碼長得一模一樣。

## 代碼風格規範

### JavaScript / JSX

#### 命名慣例
- **檔案名稱**：PascalCase（元件）、camelCase（工具函數）
  ```
  ✓ src/app/TestList.jsx
  ✓ src/utils/firebaseHelpers.js
  ✗ src/app/test-list.jsx
  ```

- **變數與函數**：camelCase
  ```javascript
  const userName = "Alice";
  const fetchUserData = async () => { /* ... */ };
  ```

- **常數**：UPPER_SNAKE_CASE
  ```javascript
  const API_BASE_URL = "https://api.example.com";
  const MAX_RETRIES = 3;
  ```

#### 注釋與文檔
- 為複雜邏輯添加清晰的單行或多行注釋
- 函數應包含 JSDoc 風格的註解（參數、返回值、例外）
  ```javascript
  /**
   * 根據 ID 取得用户資料
   * @param {string} userId - 用户 ID
   * @returns {Promise<Object>} 用户物件
   */
  async function getUser(userId) { /* ... */ }
  ```

#### 模組與匯入
- 優先使用 ES6 模組語法
  ```javascript
  import { db, auth } from '@/firebaseClient';
  export default MyComponent;
  ```

- 匯入順序：
  1. 外部套件（React、Next.js）
  2. Firebase 工具
  3. 本地元件與工具
  4. 型別定義

### React 元件

#### 元件結構
```jsx
// 1. Imports
import React, { useState } from 'react';
import { db } from '@/firebaseClient';

// 2. Constants
const COMPONENT_NAME = 'MyComponent';

// 3. Component Definition
export default function MyComponent({ prop }) {
  // State & Hooks
  const [state, setState] = useState(null);

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Helpers
  const handleClick = () => { /* ... */ };

  // Render
  return (
    <div className="my-component">
      {/* JSX */}
    </div>
  );
}
```

#### Props 與 State
- 使用清晰、描述性的名稱
- 為複雜的 props 物件添加 PropTypes 或型別定義
  ```javascript
  MyComponent.propTypes = {
    title: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(PropTypes.object),
  };
  ```

#### Hooks 使用
- 只在頂層呼叫 Hooks（不在迴圈、條件判斷或嵌套函數中）
- 自訂 Hooks 命名以 `use` 開頭
  ```javascript
  function useAuthState() {
    const [user, setUser] = useState(null);
    // ...
    return user;
  }
  ```

## 測試規範

### 單元測試（Vitest）

#### 測試結構
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    // Arrange
    const props = { title: 'Test' };

    // Act
    const { getByText } = render(<MyComponent {...props} />);

    // Assert
    expect(getByText('Test')).toBeInTheDocument();
  });
});
```

#### Mock 慣例
- Firebase 模組應透過 `vi.mock()` 存根化
  ```javascript
  vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    getDoc: vi.fn(),
  }));
  ```

- 測試檔案應位於 `__tests__/` 目錄
- 命名：`[ComponentName].test.jsx` 或 `[moduleName].test.js`

### E2E 測試（Playwright）

#### 測試結構
```javascript
import { test, expect } from '@playwright/test';

test.describe('TestList Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/test-list');
  });

  test('should display test list', async ({ page }) => {
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });
});
```

#### 選擇器最佳實踐
- 優先使用 `data-testid` 或語義化選擇器
  ```javascript
  await page.locator('[data-testid="test-list-table"]').click();
  ```

## UI 設計與樣式規範

### 配色方案（來自 ClassCue）

| 用途 | 顏色 | 變數名稱 |
|------|------|--------|
| 主色（Header / Footer） | `#aa5486` | `--color-primary` |
| 頁首文字 | `#fbf4db` | `--color-header-text` |
| 背景 | `#f8fafc` | `--color-bg` |
| 卡片 / 面板 | `#ffffff` | `--color-card` |
| 主按鈕（橙色/問問題） | `#ffa725` | `--color-accent-orange` |
| 深藍按鈕（接受） | `#27548a` | `--color-accent-blue` |
| 取消按鈕（紅） | `#d84040` | `--color-danger` |
| 註冊按鈕（綠） | `#1abc9c` | `--color-success` |

### CSS 規範

#### CSS 變數定義
在 `src/styles/globals.css` 中定義全域變數：
```css
:root {
  /* Colors */
  --color-primary: #aa5486;
  --color-header-text: #fbf4db;
  --color-bg: #f8fafc;
  --color-card: #ffffff;
  --color-accent-orange: #ffa725;
  --color-accent-blue: #27548a;
  --color-danger: #d84040;
  --color-success: #1abc9c;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

#### 命名慣例
- 使用 BEM（Block, Element, Modifier）命名法
  ```css
  .button { /* Block */ }
  .button__text { /* Element */ }
  .button--primary { /* Modifier */ }
  ```

#### 響應式設計斷點
```css
/* Mobile First */
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1280px) { /* Large Desktop */ }
```

### 無障礙性（Accessibility）

#### 鍵盤導航
所有互動元素應有明顯的 `:focus-visible` 樣式：
```css
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid #aa5486;
  outline-offset: 2px;
}
```

#### 語義 HTML
- 使用語義化標籤：`<button>`、`<a>`、`<header>`、`<nav>`、`<main>`、`<footer>`
- 為圖片添加 `alt` 屬性
- 為表單添加相應的 `<label>` 標籤

### 元件設計

#### 按鈕
```jsx
// 主按鈕（橙色）
<button className="button button--primary">Ask Question</button>

// 次要按鈕（深藍）
<button className="button button--secondary">Accept</button>

// 危險按鈕（紅）
<button className="button button--danger">Cancel</button>

// 成功按鈕（綠）
<button className="button button--success">Register</button>
```

#### 卡片 / 面板
```jsx
<div className="card">
  <div className="card__header">
    <h2 className="card__title">Title</h2>
  </div>
  <div className="card__body">
    {/* Content */}
  </div>
  <div className="card__footer">
    {/* Actions */}
  </div>
</div>
```

#### 表格（響應式）
```jsx
<div className="table-container">
  <table className="table">
    <thead className="table__head">
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody className="table__body">
      <tr className="table__row">
        <td>Cell 1</td>
        <td>Cell 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

## 版本控制與 Commit 規範

### Commit Message 格式
遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Commit 類型：**
- `feat`：新功能
- `fix`：修復缺陷
- `refactor`：代碼重構（不改變功能）
- `style`：樣式調整（CSS、格式等）
- `test`：添加或修改測試
- `docs`：文檔更新
- `chore`：配置、依賴更新

**示例：**
```
feat(test-list): add sorting functionality

Add ability to sort student records by name and score.
Implement ascending/descending toggle.

Closes #42
```

## 開發工具與環境

### Node.js 版本
- 推薦使用 Node.js 18.17+
- 使用 `nvm` 或 `fnm` 管理版本

### 依賴管理
- 使用 `npm` 管理依賴
- 定期更新依賴：`npm audit fix`
- 避免直接安裝全域套件在專案中

### 運行環境
- **開發**：`npm run dev`（Turbopack，推薦）
- **生產**：`npm run build` + `npm run start`
- **MCP 伺服器**：`npm run mcp:start`

## 與 Copilot 協作的最佳實踐

1. **參考此文檔**：在要求 Copilot 產生代碼時，提及 CONVENTIONS.md
2. **明確描述**：提供具體的元件、樣式、行為期望
3. **測試驅動**：為新功能編寫測試，讓 Copilot 基於測試生成代碼
4. **審查與迭代**：檢查生成的代碼是否符合本規範，反覆調整

---

**最後更新**：2026-03-16
