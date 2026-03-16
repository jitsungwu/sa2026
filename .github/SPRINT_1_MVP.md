# # Sprint 1 MVP: Real-time Classroom Interaction

## ## 1. Implementation Goals
- [ ] 多班級數據隔離 (甲/乙班)。
- [ ] 即時組別舉手競速 (毫秒級排序)。
- [ ] 自動加總積分榜。
- [ ] 教師端重置功能。

## ## 2. User Stories & Acceptance Criteria (AC)

### ### Epic 1: Teacher Control
 - **US 1.1 Monitor:** 在 `/class/monitor` 顯示即時舉手名單（教師介面，可選擇並啟動班級）。
  - **AC:** 依照 `timestamp` 升序排列。
 - **US 2.1 Raise Hand:** 在 `/class/student` 提供舉手按鈕（學生需於首頁選擇班級與組別，或以 `?group=N` 參數進入）。
  - **AC:** 新增一筆 `participation_logs` 資料。
 - `/class/student?group=N`: 學生舉手與看分頁
 - `/class/monitor`: 老師大螢幕監控頁

### ### Epic 2: Student Interaction
- **US 2.1 Raise Hand:** 在 `/class/[classId]/student` 提供舉手按鈕。
  - **AC:** 點擊後寫入 `hands_raised`；若已舉手則按鈕禁用。
- **US 2.2 Scoreboard:** 即時顯示各組積分。
  - **AC:** 加總該班所有 `participation_logs` 並依組別顯示。

## ## 3. Routing Map
- `/`: 首頁 (選擇班級)
- `/class/[classId]/student?group=N`: 學生舉手與看分頁
- `/class/[classId]/monitor`: 老師大螢幕監控頁