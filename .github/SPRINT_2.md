# Sprint 2 — Issues in Project Iteration = Iteration 2

## 🎯 Sprint Goal

讓報告組在課堂中能對被舉手的組別給予 0–3 分，並將該分數記入 `participation_logs`，即時反映於 Scoreboard，同時保留審計紀錄與防護（權限、上限）。

### 核心目標
1. **報告組互動評分** — 報告組成員可在台上對舉手/發言小組進行 0–3 分評分
2. **即時計分反饋** — 評分結果即時更新至 `participation_logs` 和 Scoreboard
3. **虛擬座位表支持** — 報告組可透過座位表介面選人並記錄發言者
4. **權限與防護** — 確保只有授權者可進行給分，防止越權與重複計分
5. **審計與溯源** — 完整記錄所有計分操作供教師檢視與微調

---

### Issue #2: 教師：透過 Excel 批次匯入學生名單
- State: OPEN
- Labels: -
- URL: https://github.com/jitsungwu/sa2026/issues/2

身為 授課教師，我想要 透過上傳 Excel 檔案批次匯入名單，因此我可以 確保學生資訊準確並快速開啟課程。
檔案格式說明 (Excel Structure)
檔案並非單純的扁平 Table，而是以「組別列」作為區隔的層級結構。
視覺範例：
| 帳號 (Col A) | 姓名 (Col B) | 系級 (Col D) | 成員數 (Col E) |
| :--- | :--- | :--- | :--- |
| 01 | | | 5 |
| 413401194 | 張XX | (日)資管系 | |
| 413401390 | 吳XX | (日)資管系 | |
| 02 | | | 5 |
| 413401209 | 黃XX | (日)資管系 | |

解析邏輯定義：組別標題列 (Group Header Row): 當 Column A 長度 $\le 2$（例如 "01"）且 Column E 有值時，此列為組別定義，更新當前組別編號。學生資料列 (Student Data Row): 當 Column A 長度 $> 5$（學號格式）時，此列為學生資料，應歸屬於「最近一次出現的組別編號」。

Scenario 1：成功解析並匯入階層式名單
- Given (前提)： 老師已進入甲班管理頁面，並擁有一份符合上述層級格式的 Excel 檔案。
- When (當操作發生時)： 老師上傳該檔案並點擊「解析預覽」。
- Then (預期結果)：
  -  系統應正確識別出「01」組包含張XX、吳XX等 5 位同學。
  - 系統應正確識別出「02」組包含黃XX等 5 位同學。

### Issue #7: 學生（報告組）：給予舉手組點數
- State: OPEN
- Labels: -
- URL: https://github.com/jitsungwu/sa2026/issues/7

身為 報告組同學，我想要 在台上直接點選發問同學並給予 **0-3 分**，因此我可以 實質回饋對我們報告有幫助的建議。

接受條件
Scenario 1: 
- Given 報告組成員登入於報告介面
- When 選擇目標並輸入合法分數 0–3 並送出
- Then 系統新增 `participation_logs`（含 `classId, group, points, timestamp, handRef?, givenBy`）並回傳 200；Scoreboard 在可見時段反映分數變動。

Scenario 2:
- Given 非報告組成員送分
- When 發出請求
- Then 回傳 403 + { error: "非報告組" }。

Scenario 3: 
- Given 分數超範圍
- When 發出請求
- Then 回傳 400 + { error: "分數超範圍" }。

Scenario 4:
- Given 相同 `handRef` 或相同 idempotency token 已處理

### Issue #8: 學生（報告組）：虛擬座位表介面
- State: OPEN
- Labels: -
- URL: https://github.com/jitsungwu/sa2026/issues/8

身為 同學，我想要 在操作介面查看「虛擬座位表」，因此我可以 在小組分享時間知道其他組別的分布位置。
Scenario 1: 視覺化呈現教室布局
* Given (前提)： 
  * 多個組別已完成座位選擇。
  * 我正在「學生互動儀表板」點擊「查看座位圖」。
* When (當操作發生時)：
  * 頁面切換至網格視圖。
* Then (預期結果)： 
  * 系統應以網格形式呈現教室，且有人的格子必須顯示組號。

Scenario 2: 例外狀況
* Given (前提)： 
  * 課程尚未啟動。
  * 我正在「學生互動儀表板」點擊「查看座位圖」。
* When (當操作發生時)： 
  * 頁面切換至網格視圖。
* Then (預期結果)：
  * 系統應以回應「課程尚未啟動」。

---

### Issue #24: 學生：登入系統
- State: OPEN
- Labels: Sprint 2
- URL: https://github.com/jitsungwu/sa2026/issues/24

身為 在班學生，我想要 登入系統存取課堂介面，因此我可以 參與舉手、查看分數、選擇座位等課堂互動。

**技術背景：**
- `src/app/signin` 目前為教師登入介面 (`SignInForm.jsx`)
- 需新增學生登入分支／模式
- 兩種帳號系統應支援不同權限（教師 vs 學生）

Scenario 1：學生首次登入
- Given 學生打開應用程式
- When 選擇「學生登入」並輸入有效帳號（與班級綁定）
- Then 
  - 系統驗證帳號存在於該班級
  - 導向座位選擇介面（Issue #14）或儀表板（若座位已選）

Scenario 2：教師登入（現有功能保留）
- Given 教師打開應用程式
- When 選擇「教師登入」並輸入郵件
- Then 系統驗證後導向教師管理面板

Scenario 3：登入失敗
- Given 學生輸入不存在的帳號或班級不符
- When 提交登入
- Then 顯示錯誤訊息「帳號不存在或班級不符」

---

### Issue #10: 學生：登入後查看小組累計點數
- State: OPEN
- Labels: -
- URL: https://github.com/jitsungwu/sa2026/issues/10

身為 在班學生，我想要 登入後查詢自己目前的累計點數，因此我可以 瞭解自己的平時表現並適時調整參與度。

Scenario 1:
- Given 學生登入查看分數
- When 提出要求
- Then 
  - 展示分數
  - 使用 denormalized `group_score` 欄位以提升效能（或說明為 eventual consistency）
  - UI 同時展示最後更新時間與一致性說明。


### Issue #14: 學生: 登入時選擇座位 (位置設定)
- State: OPEN
- Labels: -
- URL: https://github.com/jitsungwu/sa2026/issues/14

身為 同學，我想要 在登入時於「虛擬座位表」選擇我的座位，因此我可以 提供組別的實體位置供系統紀錄。
Scenario 1: 首次選擇組別位置 (Happy Path)
- Given (前提)： 
  - 我已登入，系統自動檢查班級及組別。
  - 系統顯示 白板在前，並且由右到左有三大區，左邊有6排、中間有8排、右邊有8排的教室網格。
- When (當操作發生時)： 
  - 我點擊座標 (行2, 列3) 的空白方格並確認。
- Then (預期結果)： 
  - 系統應在 Firestore 的 classes/class-A/layout 中更新該座標為 groupId: 3。
  - 該方格顏色應立即變更為我所屬組別的高亮色，並導向互動儀表板。

Scenario 2: 防止座位衝突 (Conflict Prevention)
- Given (前提)：
  - 「第 1 組」已經選擇了座標 (行1, 列1)。
- When (當操作發生時)：
  - 我（第 3 組）嘗試點擊已被佔用的 (行1, 列1) 時。
- Then (預期結果)： 
  - 系統應顯示提示「此位置已被第 1 組選取」，且不允許我提交。介面應透過 onSnapshot 即時更新，將已被選取的格子設為 disabled。

Scenario 3: 組員重複選擇處理 (Group Consensus)
- Given (前提)：
  - 我的同組隊友已經在另一台手機選好了位置。
- When (當操作發生時)：
  - 我稍後登入並選擇同一個班級與組別時。
- Then (預期結果)：
  - 系統應偵測到「第 3 組已設定位置」，自動跳過選擇頁面，直接進入儀表板並顯示已選定的座位。

---

**相依註記 (2026-04-02)**

- Issue #14 (登入時選擇座位) 為 Issue #8 (虛擬座位表介面) 的前置需求。完成 #14 可確保 #8 的視覺化功能能正確呈現真實座位資料。

---

## Implementation Details — Issue #2: Excel 匯入規格與驗證

以下為本次開發（Issue #2）確認之最終需求與技術驗證規則，請以此作為前後端實作與測試依據。

### 核心決議（已確認）
- 支援檔案類型：僅支援 `.xls`（處理第一張工作表，index 0）。
- 組號處理：保留原字串（例如 "01"），不可自動轉為數字。若檔案出現重複 `groupId`（相同字串出現多次），視為錯誤並停止匯入（錯誤碼：`DUPLICATE_GROUP`）。
- 學號格式：必須為 9 位數字（正則：`^\d{9}$`）；不符合視為錯誤並停止匯入（錯誤碼：`INVALID_ACCOUNT`）。
- 成員數一致性：每個 group header 的宣告人數（Col E）必須等於實際解析到的學生數；若不相符，停止匯入並回報錯誤（錯誤碼：`COUNT_MISMATCH`）。
- 既有學生處理：若解析到的學生（相同學號）已存在於目標 class，視為錯誤並停止匯入（錯誤碼：`DUPLICATE_ACCOUNT`）。
- 上傳流程：在實際匯入前，必須提供「解析預覽」頁面，顯示解析後的 groups、students、以及 `errors` / `warnings`；若 `errors` 非空，匯入按鈕需被禁用。

### 解析規則（逐列處理）
- 讀取第一張工作表，從第一列向下掃描。對每一列，取得欄位值：ColA、ColB、ColD、ColE（以 Excel 的 A/B/D/E 欄位為準）。
- Group Header 判斷：若 `trim(ColA).length <= 2` 且 `ColE` 有數字值，則此列為 group header：
  - `groupId` = 原始 `trim(ColA)`（字串）
  - `declaredCount` = parseInt(ColE)
  - 設定 `currentGroup = groupId`
- Student Row 判斷：若 `ColA` 符合正則 `^\d{9}$`，則為學生資料列：
  - 建立 student 物件：`{ account: ColA, name: ColB, major: ColD, row: <excel-row-number> }`
  - 將 student 加入 `currentGroup` 的 student 清單。
- 其他列：視為忽略列（會在 preview 顯示為 warning），但不會影響 group 資料結構。

注意：若在遇到任何 student row 時尚未出現 `currentGroup`（也就是檔案先出現學生列），視為格式錯誤並停止解析（錯誤碼：`MISSING_GROUP_HEADER`）。

### 驗證邏輯（Preview 階段與伺服器端重驗證）
- 在 Preview 階段執行下列檢查（若有任何一項 fail，加入 `errors` 並禁止匯入）：
  1. `groupId` 重複檢查：若相同 `groupId` 出現多個 group header，回報 `DUPLICATE_GROUP`。
  2. 學號格式檢查：每個 student.account 必須符合 `^\d{9}$`，否則 `INVALID_ACCOUNT`。
  3. 既有學生檢查：向服務端查詢目標 class 是否已含該 account；若存在，回報 `DUPLICATE_ACCOUNT`（包含該 row 與 account）。
  4. 成員數一致性：對每個 group, 若 `parsedCount !== declaredCount`，回報 `COUNT_MISMATCH`（包含 declared / parsed）。
- 伺服器端匯入 API 在真正寫入資料前必須重新執行相同驗證，避免 TOCTOU 問題（race condition）。

### 錯誤代碼範例與 API 回應格式
- 失敗回應範例：
```
{
  "status": "error",
  "code": "IMPORT_VALIDATION_FAILED",
  "errors": [
    {"type":"DUPLICATE_GROUP","message":"groupId '01' 出現多次"},
    {"row":12,"type":"DUPLICATE_ACCOUNT","message":"學號 413401194 已存在於 class-A"},
    {"group":"02","type":"COUNT_MISMATCH","declared":5,"parsed":4}
  ]
}
```
- 成功回應範例（匯入完成）：
```
{
  "status":"ok",
  "importedGroups":2,
  "importedStudents":10
}
```

### Preview UI 要求
- 上傳後顯示解析預覽頁面：列出每個 `groupId` 的 `declaredCount`、`parsedCount`、以及該 group 的 `students`（含原始列號）。
- 顯示 `errors`（紅）與 `warnings`（黃）；若 `errors` 非空，禁用「確認匯入」按鈕並顯示錯誤摘要。
- 若使用者在 preview 同意並按下「確認匯入」，前端呼叫匯入 API，API 再次驗證並執行寫入。

### 邊界情況（測試清單）
- 檔案格式錯誤（非 `.xls` 或損毀）。
- 檔案中先出現 student rows（缺少 group header）。
- 重複 `groupId`（應報錯）。
- 任一 `student.account` 非 9 位數字（應報錯）。
- `declaredCount` 與 parsed 不符（應報錯）。
- 解析到已在 class 中存在的學號（應報錯）。
- 空白列或註解列應被忽略並在 preview 顯示為 warning。

---

請確認上述內容無誤；我確認後會繼續建立解析器的初始實作與單元測試範本。

