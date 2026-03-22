# Sprint 1 MVP: Real-time Classroom Interaction

## 1. Implementation Goals
- 多班級資料隔離（不同 classId，各自獨立）。
- 即時舉手競速（毫秒級順序，按 timestamp 排序）。
- 即時積分榜（依 `participation_logs` 聚合顯示各組分數）。
- 教師端可重置/清除舉手與分數。

## 2. User Stories & Acceptance Criteria (AC)

### Epic 1: Teacher Control
- **US 1.1 Monitor:** 教師在 `/class/[classId]/monitor` 看到即時舉手名單並能啟動/停用該班監控。
  - **AC:** 舉手列表依 `timestamp` 升序顯示，並可以針對個別記錄執行標記（例如給分或移除）。
  - **AC:** 教師可按鈕執行「重置班級」，清空 `hands_raised` 並保留或匯出 `participation_logs`（視實作而定）。
- **US 1.2 Teacher Give Points:** 教師可對單筆舉手記錄或指定組別給分。
  - **AC 1.2.1 (單筆給分):** 在 `HandsMonitor` 的每筆舉手項目旁有「評分」操作，教師點擊後會：
    - 在 `participation_logs` 新增一筆紀錄，內容包含 `classId`, `group`, `points`（數字），`timestamp`（serverTimestamp），以及 `handRef`（引用被處理的 `hands_raised` 文件）。
    - 把該筆 `hands_raised` 文件更新為 `active:false` 與 `resolved:true`，以從候補隊列移除。
  - **AC 1.2.2 (任意組別給分):** 教師可輸入組別與分數並按「給指定組別分數」，操作會在 `participation_logs` 新增一筆（無 `handRef`）。
  - **AC 1.2.3 (授權檢核):** 只有被認定為班級擁有者或授權老師的使用者（`isOwner`）可執行給分或指定組別給分；非授權嘗試應被拒絕（前端以 alert 提示）。
  - **AC 1.2.4 (即時反映):** 新增 `participation_logs` 後 `Scoreboard` 應即時更新該組分數；教師介面上該手勢項目立即被標記為處理（或從列表示消）。

### Epic 2: Student Interaction
- **US 2.1 Raise Hand:** 學生在 `/class/[classId]/student?group=N`（或透過首頁選擇班級/組別）按鈕舉手。
  - **AC:** 第一次舉手會在 `hands_raised` 新增一筆（含 `classId`, `group`, `timestamp`, `displayName`），若已舉手按鈕為 disabled。
  - **AC:** 同步產生 `participation_logs`（或在教師給分時新增，視設計決定）。

- **US 2.2 Scoreboard:** 學生與教師可在畫面上即時看到各組累計分數。
  - **AC:** 從 `participation_logs` 聚合計分（按 `group`）並即時更新 UI；對同一 `classId` 隔離。

## 3. Routing Map (已實作/預期路由)
- `/`：首頁 — 選擇班級與暱稱/組別。
- `/class/[classId]/student?group=N`：學生端（舉手按鈕、個人狀態、分數檢視）。
- `/class/[classId]/monitor`：教師監控頁（舉手列表、給分、重置）。

## 4. Data Model / Firestore Collections (implementation notes)
- Top-level collections used by the app (not nested under classes):
  - `hands_raised` — 當前舉手列表（即時狀態），每筆包含 `classId` 字段以做隔離與查詢。
    - Fields: `classId`, `group`, `ownerId` (participantId 或 uid), `timestamp` (client Date), `active` (boolean), `resolved` (boolean), `cancelled` (boolean)
    - Behavior: 教師在處理時會把 hand 的 `active` 設為 `false` 並 `resolved:true`；學生取消會設 `cancelled:true`。
  - `participation_logs` — 歷史參與/給分記錄，用於聚合與回溯。
    - Fields: `classId`, `group`, `points` (number), `timestamp` (serverTimestamp), `handRef` (optional DocumentReference), `studentId` (optional)
  - `classes` — 班級設定與啟動狀態（例如 `active`, `activatedBy`, `activatedAt`, `groups` 或 `groupCount`）

**Notes:**
- `hands_raised` and `participation_logs` are queried as top-level collections filtered by `classId` (code relies on this pattern).
- Resetting / 結束課堂 是以更新文件（例如把 `hands_raised.active=false` 或把 `classes/{id}.active=false`）來實作，而非刪除歷史資料。

## 5. Components & Files (repo alignment)
- Student UI: `src/components/RaiseHandButton.jsx`, `src/components/StudentClient.jsx`.
  - `RaiseHandButton` details: 支援 `?participantId=` URL 測試參數、會產生本地 participantId、按下舉手時寫入 `hands_raised` (`timestamp` 使用 client `new Date()`)、支援取消（把 `cancelled:true`, `active:false`）。
- Monitor UI: `src/components/HandsMonitor.jsx`, `src/app/class/monitor/page.jsx`.
  - `HandsMonitor` details: 監聽 `hands_raised` where `classId==...` and `active==true` 並以 `timestamp` 升序顯示；包含 `handleAwardWithPoints`, `awardArbitraryGroup`, `handleResetAll`（把 `active:false, resolved:true`）等行為。
- Scoreboard: `src/components/Scoreboard.jsx` (監聽 `participation_logs`，按 `group` 聚合)。
- Class lifecycle / control: `src/components/EndClassButton.jsx`, `src/app/class/monitor/page.jsx`（可設定 `classes/{id}.active=false` 以結束課程）。
- Firebase wrapper & client: `src/lib/firestoreWrapper.js`, `src/firebaseClient.js`。
- Auth / Sign-in: `src/components/SignInForm.jsx`, `src/signin/page.jsx`.

## 6. Tests to Add / Verify
- Unit: 確認 `RaiseHandButton` 在已舉手情況下禁用（已含在 `__tests__`）。
- Integration / E2E: 已有 `e2e/raise-hand-active.spec.js` 等測試：
  - E2E 使用 `?participantId=` 與 `?group=` 參數模擬學生，並在教師端驗證 `HandsMonitor` 顯示與消失。
  - Monitor 頁面在 E2E 有 `E2E_DISABLE_AUTH` 本地開關以繞過登入（測試 helper 設定）。
  - 建議新增測試：教師給分（`handleAwardWithPoints`）會在 `participation_logs` 新增一筆並把對應 hand 設為 resolved，及 `awardArbitraryGroup` 的行為。

## 7. Acceptance / Delivery Notes
- MVP 範圍：專注單一 `classId` 的即時舉手與分數聚合；教師能在監控頁直接給分（產生 `participation_logs`），並把相應 `hands_raised` 文件標記為已處理（`active:false, resolved:true`）。
- 已實作重置行為：教師可「全部重置」把當前 `hands_raised` 的 `active` 設為 `false`（保留歷史以便追溯）。
- 下一步建議：明確化教師給分的 AC（UI 動作、points 欄位規則、是否允許任意組別加分），並補上相對應的 E2E 測試。

---
（檔案已與 repo 結構對齊，若要我同時補充教師給分流程與測試腳本，我可以接著新增）