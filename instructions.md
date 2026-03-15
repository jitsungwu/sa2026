前端設計更新說明
=================

目的
----
將專案前端視覺樣式調整為參考站 ClassCue 的配色與設計風格，並改善響應式與無障礙性。

主要變更檔案
---------------
- `src/styles/globals.css`：新增設計變數（色票、圓角）、全域樣式、響應式與 focus 樣式。
- `src/app/layout.jsx`：新增標頭（header）與頁腳（footer）結構。
- `src/app/page.jsx`：首頁改用語意化 class，套用新的樣式。
- `src/app/test-list.jsx`：表格改為響應式容器並套用全域樣式。

配色（來自 ClassCue）
----------------------
- 主色（Header / Footer）： #aa5486
- 文字（Header）： #fbf4db
- 背景： #f8fafc
- 卡片 / 面板： #ffffff
- 按鈕（橙色/問問題）： #ffa725
- 按鈕（深藍/接受）： #27548a
- 取消按鈕（紅）： #d84040
- 註冊按鈕（綠）： #1abc9c

設計要點
--------
- 使用 CSS 變數以便全站統一管理色票與圓角。
- 提供 `:focus-visible` 樣式以改善鍵盤可及性。
- 增加平滑過渡與 hover / active 動畫以提升互動感。
- 在多個斷點 (1024 / 768 / 480) 下微調排版與間距。

如何預覽與測試
-----------------
- 啟動開發伺服器：
  ```powershell
  npm run dev
  ```
- 單元測試：
  ```powershell
  npm run test
  ```
- E2E 測試（Playwright）：
  ```powershell
  npx playwright test
  ```

提交資訊
--------
- Commit: `refactor: improve page design with ClassCue color palette and responsive styles` （已推到 `main` 分支）

後續建議
--------
- 若要更貼近參考站，可決定是否換用相同網路字型（此變更可再由我代為加入）。
- 若須微調色彩或對比度，我可針對特定元件提供備選色票供你挑選。

檔案位置
-------
說明檔： [instructions.md](instructions.md)

如需我直接替你把這些說明合併到 README 或 `.github` 中的特定文件，告訴我目標檔案即可。
