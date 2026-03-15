# Firebase MCP 伸歷器安裝與配置指南

根據 [Firebase 官方文件](https://firebase.google.com/docs/ai-assistance/mcp-server?hl=zh-tw)，本專案已安裝 Firebase MCP 伸歷器支援。

## 快速開始

### 啟動 MCP 伸歷器

用以下命令啟動 Firebase MCP 伸歷器：

```bash
npm run mcp:start
```

或指定專案目錄：

```bash
npm run mcp:start:with-dir
```

## 配置 AI 工具

根據你使用的 AI 工具，在對應的配置檔案中添加 Firebase MCP 伸歷器設定。

### Claude Desktop

編輯 `~/.claude_desktop_config.json` (macOS/Linux) 或 `%APPDATA%\Claude\claude_config.json` (Windows)：

```json
{
  "mcpServers": {
    "firebase-mcp-server": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp", "--dir", "/path/to/project"]
    }
  }
}
```

### VS Code 搭配 Copilot

在 VS Code 設定中配置 MCP Server。或使用 MCP 相關擴充。

### Gemini CLI

執行以下指令配置 Firebase MCP：

```bash
gemini config set mcp firebase-mcp-server
```

或直接編輯 Gemini 配置檔案，添加：

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp", "--dir", "."]
    }
  }
}
```

### Cline / Cursor / Windsurf

在編輯器設定中配置 MCP Servers，使用相同的命令格式。

## Firebase MCP 伸歷器功能

Firebase MCP 伸歷器提供以下功能：

### 提示（Prompts）
- `/firebase:init` - 初始化 Firebase 服務
- `/firebase:deploy` - 部署應用程式

### 工具（Tools）
- **驗證 (Auth)**: 管理使用者、設定驗證
- **Firestore**: 讀寫文件、查詢資料
- **Storage**: 管理檔案儲存
- **Functions**: 查看日誌
- **Realtime Database**: 讀寫資料
- **Data Connect**: 執行 GraphQL 操作
- **Messaging**: 傳送通知訊息
- **Crashlytics**: 查看崬殳報告

### 資源（Resources）
- Firebase 文檢
- 初始化指南
- 安全規則指南

## 前置需求

1. **Node.js 和 npm**：確保已安裝
2. **Firebase 登入**：執行 `firebase login` 或 `npx firebase login --no-localhost` 若無法自動開啟網頁流覽器
3. **Firebase 專案**：在 `firebase.json` 中配置或透過環境變數設定

## 驗證設置

驗證 MCP 伸歷器是否正確配置：

```bash
npx firebase-tools@latest mcp --generate-tool-list
```

此命令會列出所有可用工具。

## 選用設定

### 只啟用特定功能

```bash
npm run mcp:start -- --only auth,firestore,storage
```

### 指定專案目錄

已在 npm scripts 中配置為當前目錄（`.`）。若需更改，編輯 `package.json` 中的 `--dir` 伊數。

## 故障排查

### 權限錯誤 (403)

若出現 403 錯誤，表示登入的帳戶無權存取該 Firebase 專案：

```bash
firebase logout
firebase login
```

確保登入帳戶有該 Firebase 專案的存取權限。

### 連接失敗

確認 Firebase 配置正確：

```bash
npx firebase projects:list
```

### 找不到專案

若 `firebase.json` 未正確配置或專案 ID 不存在，請：

```bash
firebase init
```

## 相關文件

- [Firebase 官方 MCP 文件](https://firebase.google.com/docs/ai-assistance/mcp-server?hl=zh-tw)
- [Firebase 代理程式技能](https://firebase.google.com/docs/ai-assistance/agent-skills?hl=zh-tw)
- [firebase-tools GitHub](https://github.com/firebase/firebase-tools/tree/master/src/mcp)