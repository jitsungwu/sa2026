# Sprint 3 — Issues: #5, #36, #37, #8

## Sprint 3 目標（概述）
本次 Sprint 目標：設定「優先/報告組別（presenting group）」機制與相關行為調整，包含教師指定/切換報告組、報告結束的狀態還原、與座位表/舉手流程的整合。

本檔將整理 Issue #5、#36、#37、#8（以及與 presenting-group 高關聯的 Issue）之需求、接受準則與需澄清問題，供開發與產品確認。

---

## Issue #8: 學生（報告組）：虛擬座位表介面
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/8

簡要說明
- 使用者故事：身為同學，我想要在操作介面查看「虛擬座位表」，因此我可以在小組分享時間知道其他組別的分布位置。

接受條件
- Scenario 1：視覺化呈現教室布局
  - Given：多個組別已完成座位選擇；使用者在「學生互動儀表板」點擊「查看座位圖」
  - When：頁面切換至網格視圖
  - Then：系統以網格呈現教室，且有人位置的格子顯示組號

- Scenario 2：例外狀況
  - Given：課程尚未啟動
  - When：使用者點擊「查看座位圖」
  - Then：系統回應「課程尚未啟動」提示

相依註記
- Issue #8 依賴 Issue #14（登入時選擇座位）。座位資料儲存在 `classes/.../layout`。

需澄清問題（建議在 Product/Design/Backend 會議確認）
- 資料來源與格式：`classes/{classId}/layout` 的 schema 是否已定案？範例 JSON 或 seed 資料可提供嗎？
- 權限：所有學生可以查看完整座位表，還是僅限同班同學？是否需遮罩特定資訊？
- 更新時機：是否需 realtime updates（onSnapshot）或只在載入時讀一次？
- 顯示內容：格子要顯示組號、姓名、照片或僅顯示 occupied/empty？是否顯示空座位編號？
- 畫面尺寸與 pagination：大型班級（>100 人）如何呈現？是否需要縮放/分頁？
- 行為互動：是否可點選某個格子查看該組詳細（例如組員清單、分數）？
- 無座位情況：若座位資料不完整或尚未選位，UI 要如何提示？
- 視覺規格：是否遵循 `.github/SCAFFOLD_UI_SPEC.md` 的設計系統？有無 mockup 可提供？

---

## Presenting-group（優先/報告組）關鍵需求（跨 Issue 彙整）

- 權限與 API
  - 只有 Teacher 角色能設定 `presentingGroupId`；在 Firestore 或 API 層要有明確權限驗證。
  - 建議變更透過單一 endpoint（或 transaction）完成：更新 `classes/{classId}.presentingGroupId` 並寫入 `participation_logs`（如需）。

- 前端行為
  - 前端應用 `onSnapshot` 即時監聽 `classes/{classId}.presentingGroupId`，變更時切換成報告組畫面或還原為舉手畫面。
  - 切換時需有過渡提示（例如 toast 或 banner），並在 UI 明確顯示目前的 `presentingGroupId`。

- 報告結束與還原
  - 老師點擊「結束報告」時，`presentingGroupId` 設回 `null`，並在所有連線端恢復舉手功能。

- 與座位表（Issue #8）的整合
  - 當某組設定為 `presentingGroupId`，座位表與儀表板在該組格子應標示「正在報告」狀態。

- 例外與邊界條件
  - 若未授權使用者嘗試設定 `presentingGroupId`，API 回 403。
  - 若指定組別不存在或格式錯誤，API 回 400 並說明錯誤原因。

- 測試要點（E2E / 單元）
  - 驗證 Teacher 能設定/切換/結束報告組；學生端即時收到變更並切換畫面。
  - 驗證未授權角色嘗試設定會回 403。
  - 驗證切換時 `hands`、`layout` 等狀態行為符合預期（如需清空或保留，需產品定義）。

---

---

## Issue #5: 教師：設定優先發言組
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/5

說明
- 身為 授課教師，我想要 每次報告設定一組同學優先發問，因此我可以讓各組有更公平的發言機會並且讓發問可以更有深度。

接受條件
- Given: 老師已指定報告組。
- When: 老師指定「優先發問組」時。
- Then: 系統需清空現有 active 舉手，並自動為優先組新增一筆 active 紀錄。
- And: 鎖定其他非優先組別的舉手按鈕（直到老師手動解鎖）。

補充說明
- (原需求) 希望系統自動對發言名單進行權重排序（發言少者優先），但已調整為：
  - 不需權重排序；改為每次報告設定一組同學優先發問三分鐘，三分鐘後開放全班發問。

需澄清問題
需澄清問題（已回覆）
- 發問時間提醒的功能屬於 Issue #4，尚未開發前由老師手動計時（決定：老師手動）。
- 舉手資料不必保存（決定：不需 persist 舉手資料，僅作即時狀態）。
- 舉手鎖定可採全班鎖定（決定：class-wide 鎖定；優先發問組不需舉手，報告組直接給分）。
- 簡化流程：優先組一次僅一組，不需排隊（決定：只有一個 priority group，無排隊機制）。

---

---

## Issue #36: 老師: 設定報告組之後限制舉手
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/36

說明
- 老師指定報告組之後，限制各組舉手，改善 #28，為了確保教學流程順暢，需加入自動化清理邏輯。

接受條件
- Given: 老師透過 #28 的功能指定了新的報告組。
- When: 系統寫入 presentingGroupId 時。
- Then: 必須同時執行 `hands_raised` 集合的批次更新，將該班級所有 `status: "active"` 轉為 `resolved`。
- And: 將 `isGeneralRaisingEnabled` 狀態重置為 `false`。

需澄清問題（已回覆）
- 資料量小（上限約 15 組），不需要考慮原子性（決定：不需 transaction，分批或單次更新皆可）。
- `isGeneralRaisingEnabled` 儲存在 `classes/{classId}`（決定：欄位位置為 `classes/{classId}`）。
- UI 層需顯示 banner 或提示，告知學生當前為「尚未開放發問」狀態（決定：顯示 banner）。

---

---

## Issue #37: 報告組給予優先組評分
 - State: OPEN
 - URL: https://github.com/jitsungwu/sa2026/issues/37

說明
 - 身為 報告組評分者，
   我想要 給予優先發問組更高上限的評分（0-15 分），
   因此我可以 針對具備深度與挑戰性的提問給予實質的高額回饋。

接受條件
## 驗收條件 (Acceptance Criteria)
### 場景一：優先發問組的特殊評分介面
 - Given (前提)： 第 04 組為報告組，第 02 組被設定為「優先發問組」且已自動舉手。
 - When (當操作發生時)： 第 04 組的評分者點擊第 02 組的舉手卡片進行評分。
 - Then (預期結果)：
   - 系統應識別該組為 priorityGroupId。
   - [關鍵差異]：評分按鈕或輸入框的範圍應自動調整為 0-15 分（而非一般組別的 0-3 分）。

### 場景二：驗證分數寫入與範圍
 - Given (前提)： 報告組正在評分優先發問組。
 - When (當操作發生時)： 評分者輸入 12 分並送出。
 - Then (預期結果)：
   - `participation_logs` 應新增紀錄：groupId: "02", points: 12, givenBy: "group-04"。
   - 若輸入超過 15 分或低於 0 分，系統應回傳 400 錯誤並阻斷寫入。

需澄清問題
需澄清問題（已回覆）
- 請在 API 層檢查權限與分數範圍（決定：先於 API 層檢查，暫不使用 Firestore rules）。
- 同時應只有一人寫入資料，不會有一致性問題（決定：單一寫入者，無需特別一致性處理）。
- 允許學生直接輸入較大範圍分數，但必須防呆：限制為整數、最小 0、最大 15（決定：整數驗證，0..15）。

需澄清問題（預設檢查清單）
- 核心行為：使用者要完成的任務是什麼？
- 資料一致性：是否需要 atomic write 或 background job 支援聚合？
- 權限：誰可讀/寫？是否需在 Firestore rules 中加入限制？

---

## 綜合待澄清清單（優先順序建議）
1. 請提供 Issue #5、#36、#37 的完整 Issue 文本（或允許我存取 repo 的 GitHub Issues）。
2. 對於 Issue #8：請提供 `classes/{classId}/layout` 的範例資料與設計 mockups（若有）。
3. 確認每個 Issue 的優先度與預估時程，以便納入 Sprint 計畫。

---

## 下一步建議
- 若您要我繼續：
  1. 我可以幫您從 GitHub 把四個 Issue 的原始內容抓下來並完整填入本檔（需 GitHub 存取權或您貼上 Issue 內容）。
  2. 或您可把 Issue 內容貼在回覆中，我會直接把細節補齊並回填接受準則與測試建議。

---

_檔案由 Copilot 自動產生為草稿；請確認 Issue 狀態與內容後，我會依回覆更新文件並標註完成的 TODO。_
