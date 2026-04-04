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
  - 我已進入甲班頁面並選定為「第 3 組」。
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

