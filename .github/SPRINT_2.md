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

Scenario 1: 設定評分者
- Given 報告組成員已登入，而且老師已經設定報告組別
- When 報告組別同學可以看到「我負責評分」的按鈕
- Then 第一位按下「我負責評分」的同學負責給分。

Scenario 2:  給發問組分數
- Given 報告組已經設定評分者
- When 評分者可以看到同學舉手，評分者依順序給發問組分數( 0–3 )並送出
- Then 系統新增 `participation_logs`（含 `classId, group, points, timestamp, handRef?, givenBy`）並回傳 200；Scoreboard 在可見時段反映分數變動。

Scenario 3: 非組長送分
- Given 非報告組成員送分或者非組長送分
- When 發出請求
- Then 回傳 403 + { error: "非報告組組長" }。

Scenario 4: 分數超範圍 
- Given 分數超範圍 ( 0–3 )
- When 發出請求 (如:5分)
- Then 回傳 400 + { error: "分數超範圍" }。

---
**注意事項**
#28 要能知道是否有同學設定自己為組長，萬一設定錯誤，也可以重新指定組長

---

**最終決議 (2026-04-02)**

- 分數制：教師採 1–5（整數）；報告組相關互評採 0–3（整數）；不允許小數或負值。
- 情境（明確三種）：
  1. 教師加分（全域權限）：教師可隨時對任意小組給分，採 1–5。
  2. 教師提問情境：教師提問並由學生/小組回答時，回答小組的評分採 0–3；教師可在此情境額外給分（1–5）。
  3. 學生報告情境：小組上台報告時，評分方（報告組或其他指定小組）採 0–3；教師可額外給分（1–5）。
- 計分目標：系統僅對小組（group）計分；個人分數由小組分配規則另行定義。
- 審計與資料保留：`participation_logs` 為長期保留之審計紀錄（課程結束後清除）；即時 Scoreboard 應使用 denormalized 聚合欄位或 background job 更新，避免每次從日誌重算。
- API 與實作建議：在給分 endpoint 中依 `givenBy.role` 驗證範圍（教師 1..5，報告組/學生 0..3），所有寫入與 hands resolving 建議以 transaction 或原子作業完成，並同時寫入 `participation_logs` 與更新 denormalized 聚合欄位。


### Issue #8: 學生（報告組）：虛擬座位表介面
- State: OPEN
- Labels: -
- URL: https://github.com/jitsungwu/sa2026/issues/8

身為 同學，我想要 在操作介面查看「虛擬座位表」，因此我可以 在小組分享時間知道其他組別的分布位置。

接受條件

Scenario 1：視覺化呈現教室布局
- Given (前提)：
  - 多個組別已完成座位選擇
  - 我正在「學生互動儀表板」點擊「查看座位圖」
- When (當操作發生時)： 頁面切換至網格視圖
- Then (預期結果)：
  - 系統應以網格形式呈現教室，且有人的格子必須顯示組號

Scenario 2：例外狀況
- Given (前提)：
  - 課程尚未啟動
  - 我正在「學生互動儀表板」點擊「查看座位圖」
- When (當操作發生時)： 頁面切換至網格視圖
- Then (預期結果)： 系統應回應「課程尚未啟動」

**相依註記：** Issue #8 (虛擬座位表介面) 依賴 Issue #14 (登入時選擇座位)。#8 的視覺化假設已存在座位資料（classes/.../layout）。建議先完成 #14 或提供 seed 資料以供 #8 開發/展示。

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
- State: CLOSED
- Labels: -
- URL: https://github.com/jitsungwu/sa2026/issues/10

身為 在班學生，我想要 登入後查詢自己目前的累計點數，因此我可以 瞭解自己的平時表現並適時調整參與度。

接受條件

Scenario 1：查看小組累計點數
- Given 學生登入查看分數
- When 提出要求
- Then 
  - 展示分數
  - 使用 denormalized `group_score` 欄位以提升效能（或說明為 eventual consistency）
  - UI 同時展示最後更新時間與一致性說明

**備註：** 已包含在 Dashboard 功能裡，Iteration 2 不需要這個 User Story


---

**最終決議 (2026-04-02)**

- 分數制：教師採 1–5（整數）；報告組相關互評採 0–3（整數）；不允許小數或負值。
- 情境（明確三種）：
  1. 教師加分（全域權限）：教師可隨時對任意小組給分，採 1–5。
  2. 教師提問情境：教師提問並由學生/小組回答時，回答小組的評分採 0–3；教師可在此情境額外給分（1–5）。
  3. 學生報告情境：小組上台報告時，評分方（報告組或其他指定小組）採 0–3；教師可額外給分（1–5）。
- 計分目標：系統僅對小組（group）計分；個人分數由小組分配規則另行定義。
- 審計與資料保留：`participation_logs` 為長期保留之審計紀錄（課程結束後清除）；即時 Scoreboard 應使用 denormalized 聚合欄位或 background job 更新，避免每次從日誌重算。
- API 與實作建議：在給分 endpoint 中依 `givenBy.role` 驗證範圍（教師 1..5，報告組/學生 0..3），所有寫入與 hands resolving 建議以 transaction 或原子作業完成，並同時寫入 `participation_logs` 與更新 denormalized 聚合欄位。
- Given (前提)：
  - 我的同組隊友已經在另一台手機選好了位置。
  - When (當操作發生時)：
  - 我稍後登入並選擇同一個班級與組別時。
  - Then (預期結果)：
  - 系統應偵測到「第 3 組已設定位置」，自動跳過選擇頁面，直接進入儀表板並顯示已選定的座位。

---



  ### Issue #28: 老師: 指定報告組別
  - State: OPEN
  - Labels: Sprint 2
  - URL: https://github.com/jitsungwu/sa2026/issues/28

  身為 授課教師，我想要 在系統中指定特定組別進行報告，因此我可以 讓報告組別可以給回饋的組別分數。

  驗收條件 (Acceptance Criteria)
  Scenario 1：手動指定報告組別 (Manual Selection)
  - Given (前提)： 老師已登入並選擇班級 (issue #3 )
  - When (當操作發生時)： 老師選擇組別 (如:04)，並點擊「設為報告組」按鈕。
  - Then (預期結果)：
    - Firestore 中的 `classes/[classId]` 狀態應更新 `presentingGroupId: "04"`。
    - 第四組的畫面應該切換到報告組畫面，並可以給舉手組別分數 (issue #7 )

  Scenario 2：老師切換報告組別
  - Given (前提)： 第 04 組已完成報告。
  - When (當操作發生時)： 老師選擇組別 (如:05)，並點擊「設為報告組」按鈕。
  - Then (預期結果)：
    - Firestore 中的 `classes/[classId]` 狀態應更新 `presentingGroupId: "05"`。
    - 第五組的畫面應該切換到報告組畫面，並可以給舉手組別分數 (issue #7 )
    - 第四組的畫面應該恢復到可以舉手的畫面 (issue #17)

  Scenario 3：結束報告
  - Given (前提)： 第 04 組已完成報告。
  - When (當操作發生時)： 老師點擊「結束報告」。
  - Then (預期結果)：
    - Firestore 的 `presentingGroupId` 應改回 `null`。
    - 所有組別的介面應恢復恢復到可以舉手的畫面 (issue #17)

  補充說明
  - `currentGroup` 為系統中用於處理學生「舉手加分」的欄位，與本 issue 的 `presentingGroupId`（指定正在報告的組別）用途不同，請勿混用。
  - 組別 ID 將由數字改為字串處理，並保留前置零以確保排序一致性（例如 `"04"`、`"10"`），避免字串排序時 `"10"` 在 `"2"` 之前的狀況。
  - 僅授權的老師（Teacher role）可以設定或變更 `presentingGroupId`；請在 Firestore Security Rules 或 API 層落實權限檢查以防止非授權寫入。
  - 前端應使用 `onSnapshot` 監聽 `classes/{classId}.presentingGroupId` 的變更，並在變更時即時切換報告畫面或還原為舉手畫面。
