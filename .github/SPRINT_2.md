# Sprint 2 — 報告組對舉手組別評分 (Report-Group Scoring)

目標：讓報告組在課堂中能對被舉手的組別給予 0–3 分，並將該分數記入 `participation_logs`，即時反映於 Scoreboard，同時保留審計紀錄與防護（權限、上限）。

 - 相關 Issue（建議完成清單）
 - #7: 學生（報告組）：在台上給予 0–3 點 — 核心功能。（P1）
 - #8: 學生（報告組）：虛擬座位表介面 — （選項）若報告組需從座位表選人。（P1；依賴：#14）
 - #14: （前置）修正座位表 / 選人流程以支援 #8。（P1）
 - #17: 學生: 舉手 — 需確認舉手流程穩定且包含 group 與 participantId（依賴）。（P1）
 - #16: 教師: 給報告組及發言組分數 — 教師給分範圍 `1–5`，可重用給分與 log 寫入邏輯。（P1）
 - #11: 教師：限制單場報告總點數上限 — 建議延後至 backlog（非本 sprint 優先）。（P1）
 - #12: 教師：檢視紀錄牆並微調點數 — 支援教師補救/調整分數與 audit。（P1）
 - #10: 學生：登入後查看個人累計點數 — 反饋與驗證分數入帳（用戶端顯示）。（P1）

優先順序與建議 Sprint 2 範圍（2 週）

### AC 補充細節（逐項，Given / When / Then）

- #7（報告組給分）
   - Given 報告組成員登入於報告介面，When 選擇目標並輸入合法分數 0–3 並送出，Then 系統新增 `participation_logs`（含 `classId, group, points, timestamp, handRef?, givenBy`）並回傳 200；Scoreboard 在可見時段反映分數變動。
   - Given 非報告組成員送分，When 發出請求，Then 回傳 403 + { error: "forbidden" }。
   - Given 分數超範圍，When 發出請求，Then 回傳 400 + { error: "invalid_points" }。
   - Given 相同 `handRef` 或相同 idempotency token 已處理，When 重複送出，Then 回傳 409 並不重複計分。

- #17（舉手資料）
   - Given 學生按下舉手，When 系統建立 `hands_raised`，Then 該記錄包含 `group, ownerId, timestamp, resolved:false` 並可被授權者查閱。
   - Given 手勢被處理（例如給分），When 處理完成，Then 系統由授權者或系統將 `resolved` 設為 true；owner 可在短時內取消。

- #11（單場報告上限）
   - Given `class.sessionId` 與 `remaining_report_points` 存在，When 嘗試給分且超出剩餘，Then 回傳 400 並顯示原因且不寫入 log。
   - Given 剩餘足夠，When 成功扣減，Then API 以 transaction 原子扣減 `remaining_report_points` 並寫入 `participation_logs`。
   - Given 教師 override，When 教師執行 override，Then 系統允許並在 log 中記錄 `overrideBy` 與 `reason`。

- #8（虛擬座位表 / 選人）
   - Given 報告組進入選人流程，When 選擇座位並確認，Then 系統回傳 `handRef` 或 `participantId` 以供後續給分使用，並在 UI 顯示占用狀態（first-write wins）。
   - Given 座位表映射失敗，When 使用者無法選人，Then UI 提供手動輸入 `participantId` 的備援流程。

- #14（座位表資料模型）
   - Given 需要支援座位表，When 設計資料結構，Then 在 `class` doc 或 `seating` collection 下提供 `seats: [{ seatId, participantId, group }]`，並支援原子更新或樂觀鎖以避免 race condition。

- #16（教師給分整合）
   - Given 教師或 TA 發出給分請求，When 請求被授權，Then API 檢查分數範圍 `1–5` 並在 `participation_logs` 記錄 `reason` 與 `approvedBy`（若為 override）。

- #12（紀錄牆編輯/微調）
   - Given 教師需調整分數，When 執行調整，Then 系統新增 adjustment record（包含 `adjustedBy, adjustedAt, reason`）而非覆寫原始 log；UI 顯示原始值與調整差異。

- #10（學生個人分數檢視）
   - Given 學生登入查看分數，When 展示分數，Then 使用 denormalized `group_score` 欄位以提升效能（或說明為 eventual consistency）；UI 同時展示最後更新時間與一致性說明。

- 測試與權限共通建議：在關鍵寫入採 transaction 或 server-side guard，並增加 E2E 覆蓋 race condition 與權限邊界測試。

 - 驗收標準總表（高階）
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

### AC 補充細節（逐項）

- #7（報告組給分）
   - 錯誤回應：非報告組成員送分 → 403 + { error: "forbidden" }。
   - 無效分數 → 400 + { error: "invalid_points" }。
   - 重複送出：以 `handRef` 或 idempotency token 檢查並回傳 409，避免重複計分。
   - 寫入內容：`participation_logs` 須含 `classId, group, points, timestamp, handRef (可選), givenBy`。

- #17（舉手資料）
   - `hands_raised` 每筆需含 `group, ownerId, timestamp, resolved:boolean`。
   - `resolved` 由授權者（teacher/TA）或系統在處理完成時設定；owner 可短時間內取消。
   - 權限：只有 class 的 teacher/TA 或 hand owner 可變更 `resolved`。

- #11（單場報告上限）
   - 範圍：以 `class.sessionId` 定義「單場」。
   - 建議在 `class` doc 維護 `remaining_report_points`，API 在寫入前以 transaction 檢查並原子扣減。
   - 教師 override：允許，但須記錄 `overrideBy` 與 `reason`。

- #8（虛擬座位表 / 選人）
   - 選人操作應回傳 `handRef` 或 `participantId` 以供後續給分。
   - 權限：僅報告組成員可在其報告階段選人；同時選人以 first-write wins，UI 顯示占用狀態。
   - 備援：若座位表無效或映射失敗，UI 提供手動輸入 participantId 的備援流程。

- #14（座位表資料模型）
   - 建議資料模型：在 `class` 文件或 `seating` collection 下維護 `seats: [{ seatId, participantId, group }]`。
   - 操作需支援原子性或樂觀鎖定，避免多人同時選同一位學生造成 race condition。

- #16（教師給分整合）
   - API 需驗證 role（teacher/TA），分數範圍 `1–5`。
   - 教師相關操作在 `participation_logs` 中記錄 `reason` 與 `approvedBy`（若為 override）。

- #12（紀錄牆編輯/微調）
   - 編輯採新增 adjustment record（而非覆寫原始 log）；調整需包含 `adjustedBy, adjustedAt, reason`。
   - UI/ API 顯示原始值與調整差異以利稽核。

- #10（學生個人分數檢視）
   - 建議使用 denormalized `group_score` 欄位以提升讀取效能；說明更新頻率（寫入時觸發 background update 或定時批次）。
   - 若顯示即時值，UI 應展現最後更新時間與一致性說明。

- 測試與權限共通建議：在關鍵寫入（計分/扣點/調整）採 transaction 或 server-side guard，並補強 E2E 測試覆蓋 race condition 與權限邊界。

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
