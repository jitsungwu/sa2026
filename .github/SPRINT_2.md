# Sprint 2 — 報告組對舉手組別評分 (Report-Group Scoring)

目標：讓報告組在課堂中能對被舉手的組別給予 0–3 分，並將該分數記入 `participation_logs`，即時反映於 Scoreboard，同時保留審計紀錄與防護（權限、上限）。

- 相關 Issue（建議完成清單） 
- #7: 學生（報告組）：在台上給予 0–3 點 — 核心功能。  
- #17: 學生: 舉手 — 需確認舉手流程穩定且包含 group 與 participantId（依賴）。
- #16: 教師: 給報告組及發言組分數 — 教師給分範圍 `1–5`，可重用給分與 log 寫入邏輯。  
- #11: 教師：限制單場報告總點數上限 — 建議延後至 backlog（非本 sprint 優先）。
- #12: 教師：檢視紀錄牆並微調點數 — 支援教師補救/調整分數與 audit。  
- #10: 學生：登入後查看個人累計點數 — 反饋與驗證分數入帳（用戶端顯示）。
- #8: 學生（報告組）：虛擬座位表介面 — （選項）若報告組需從座位表選人。

優先順序與建議 Sprint 2 範圍（2 週）
- 必做（Sprint 2 核心，優先完成）
  1. #7 — 實作報告組給分 UI 與流程（3 點）
     - AC: 報告組介面可選擇目標舉手組別或手勢項目，輸入 0–3 分並送出；成功送出會在 `participation_logs` 新增記錄，包含 `classId, group, points, timestamp, handRef (若有), givenBy`。
     - 測試要點: 單元測驗寫入 `participation_logs`，E2E 模擬報告組給分並驗證 Scoreboard 更新。
  2. #17 — 確保舉手資料包含 group 與可被其他學生/報告組識別（2 點）
     - AC: `hands_raised` 每筆含 `group`、`ownerId`（participantId）與 `timestamp`；刪除/取消/resolved 處理正確。
     - 測試: E2E 驗證學生舉手後教師/其他學生可在 UI 找到該筆記錄。
  3. #11 — 單場報告總點數上限（1 點）
     - AC: 給分前檢查所屬報告或班級的剩餘可用點數，超出時回傳錯誤與 UI 訊息。
     - 測試: 單元測驗覆蓋上限邏輯，E2E 驗證限制生效。

- 可同步/次要（若時間允許）
  - #16 — 復用教師給分的後端/寫入邏輯作為共用服務（2 點）。
  - #10 — 學生個人分數檢視（1 點）。
  - #12 — 紀錄牆編輯/審核（2–3 點，較大）。

實作任務拆解（每項的具體工作）
 - UI: 報告組專用小型面板，列出當前 class 的 active `hands_raised`（依 group 聚合且可展開），每筆有「給分」操作。  
 - API / Firestore: 新增 `participation_logs` document on write；若 handRef 提供則同時更新 `hands_raised` 為 `active:false,resolved:true`。  
 - 商業邏輯: 檢核 `isOwner` 與授權（教師／TA）與報告組角色；檢查單場上限並回滾/拒絕不合法請求。  
 - 補充：教師透過教師介面給分時採 `1–5` 分制；報告組或舉手組別由學生在台上給分時採 `0–3` 分制。評分皆為整數，不允許小數或負值。API 層需根據 `givenBy` 的角色驗證分數範圍與授權。

 - 情境對應（明確三種情境）：
    1. **教師加分（全域權限）**：教師保有權利隨時對任意小組進行加分，採 `1–5` 分制（整數）。
    2. **教師提問情境**：當教師在教學中提問並由學生/小組回答時，回答小組的評分採 `0–3` 分制（整數）。
    3. **學生報告情境**：當小組上台報告，由提問或評分的小組（或報告組成員依流程）對報告小組評分，採 `0–3` 分制（整數）；教師可在該情境額外給報告小組加分（教師給分仍為 `1–5`）。

 - 計分目標：系統僅對**小組（group）**進行記分，不會直接以單一學生為主要計分單位（可由小組分配規則另行映射）。

 - 資料與聚合策略：`participation_logs` 為永久保留記錄（課程結束後由清除程序移除）；由於資料量會隨時間增長，系統不應每次即時從 `participation_logs` 重新彙總小組累計分數。建議：
    - 在 `groups` 或 `class` 文件上維護一個 denormalized 的 `group_score`（或時間窗內的聚合欄位），透過事件驅動或定期批次作業更新；
    - 或在寫入 `participation_logs` 時觸發輕量的計分工作（例如 Cloud Function / background job）去更新 denormalized 聚合，而非在讀取時重算整個日誌。 

 - 保留與清除：`participation_logs` 長期保留為審計來源，僅在課程結束或依保留政策由批次清除；即時顯示的 Scoreboard 應使用 denormalized 聚合欄位以降低查詢成本。
 - 審計: 在 `participation_logs` 或另外的 audit collection 記錄 `givenBy`, `givenAt`, `reason`（若為教師微調）。
 - 測試: 單元測、integration 測試 firebase wrapper（`src/lib/firestoreWrapper.js`），並新增/修改 E2E（例如 `e2e/04-teacher-give-points.spec.js` 類似的報告組 E2E）。

估時總結（建議以故事點）
 - #7: 3 點（0–3 分規則）；#17: 2 點；#8: 2 點；#16 (整合): 2 點；#10: 1 點；#12: 2–3 點。  
 Sprint 2 推薦上線組合（2 週衝刺）: 完成 #7 + #17 + #8 + 測試覆蓋（總約 7 點）。

 - 驗收標準總表（高階）
 - 報告組能正常挑選目標並提交 0–3 分（0 分表示不合理或亂問）。  
 - `participation_logs` 正常新增且 Scoreboard 即時反映。  
 - 無授權或超限情況下給分會被拒絕並回傳明確錯誤。  
 - 新增 E2E 覆蓋核心流程（報告組給分、Scoreboard 更新、上限拒絕）。

風險與注意事項
 - Firestore 寫入時序：需小心 race condition（建議使用 transactions 或 server-side timestamp + idempotency）。
 - 權限設計：明確定義報告組角色與授權，避免學生越權給分。  
 - E2E 穩定性：既有測試已做多次修正，新增測試時請重用現有 test helpers（`e2e` 目錄內）以維持穩定。

下一步（我可以代勞）
 - 1) 將 Sprint 2 的 selected items（#7,#17,#8,#16）拆成具體 GitHub Issues / PR checklist（我可產出 JSON/markdown 草稿）。
 - 2) 開始實作：我可先草擬 `RaiseHand` → `participation_logs` 的寫入程式碼片段與 E2E 測試範例。
