# Backlog — Issues with Project Status = Backlog

### Issue #2: 教師：透過 Excel 批次匯入學生名單
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/2

身為 授課教師，我想要 透過上傳 Excel 檔案批次匯入名單，因此我可以 確保學生資訊準確並快速開啟課程。

### Issue #4: 教師：設定倒數計時與提醒音效
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/4

身為 授課教師，我想要 設定各階段的倒數計時與提醒音效，因此我可以 準確掌控教學進度而不需頻頻看錶。

### Issue #6: 教師：含隨機擾動的抽點功能
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/6

身為 授課教師，我想要 在冷場時使用隨機抽點功能，因此我可以 主動挑選低參與度的同學發言以活絡課堂氣氛。

### Issue #7: 學生（報告組）：在台上給予 1–5 點
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/7

身為 報告組同學，我想要 在台上直接點選發問同學並給予 1-5 點，因此我可以 實質回饋對我們報告有幫助的建議。

### Issue #8: 學生（報告組）：虛擬座位表介面
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/8

身為 同學，我想要 在操作介面查看「虛擬座位表」，因此我可以 在小組分享時間知道其他組別的分布位置。
Scenario 1: 視覺化呈現教室布局
Given (前提)： 
* 多個組別已完成座位選擇。
* 我正在「學生互動儀表板」點擊「查看座位圖」。
When (當操作發生時)： * 頁面切換至網格視圖。
Then (預期結果)： * 系統應以網格形式呈現教室，且有人的格子必須顯示組號。

Scenario 2: 例外狀況
Given (前提)： 
* 課程尚未啟動。
* 我正在「學生互動儀表板」點擊「查看座位圖」。
When (當操作發生時)： * 頁面切換至網格視圖。
Then (預期結果)： * 系統應以回應「課程尚未啟動」。

### Issue #5: 教師：發言名單權重排序（優先發言少者）
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/5

身為 授課教師，我想要 系統自動對發言名單進行權重排序（發言少者優先），因此我可以 引導學生將發言權交給尚未參與的同學。

### Issue #11: 教師：限制單場報告總點數上限
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/11

身為 授課教師，我想要 限制單場報告的總點數上限，因此我可以 防止學生濫發點數，維持成績的鑑別度。

### Issue #12: 教師：檢視紀錄牆並微調點數
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/12

身為 授課教師，我想要 審視紀錄牆並能微調點數，因此我可以 修正不合理的給分，確保評分符合教學目標。

### Issue #10: 學生：登入後查看個人累計點數
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/10

身為 在班學生，我想要 登入後查詢自己目前的累計點數，因此我可以 瞭解自己的平時表現並適時調整參與度。

### Issue #13: 助教：匯出全班點數總表（Excel）
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/13

身為 助教 (TA)，我想要 一鍵匯出全班的點數總表（Excel），因此我可以 快速將數據轉入學校的官方成績系統。

### Issue #14: 學生: 登入時選擇座位 (位置設定)
- State: OPEN
- URL: https://github.com/jitsungwu/sa2026/issues/14

身為 同學，我想要 在登入時於「虛擬座位表」選擇我的座位，因此我可以 提供組別的實體位置供系統紀錄。
Scenario 1: 首次選擇組別位置 (Happy Path)
Given (前提)： 
* 我已進入甲班頁面並選定為「第 3 組」。
* 系統顯示 白板在前，並且由右到左有三大區，左邊有6排、中間有8排、右邊有8排的教室網格。
When (當操作發生時)： 
* 我點擊座標 (行2, 列3) 的空白方格並確認。
Then (預期結果)： * 系統應在 Firestore 的 classes/class-A/layout 中更新該座標為 groupId: 3。
該方格顏色應立即變更為我所屬組別的高亮色，並導向互動儀表板。

Scenario 2: 防止座位衝突 (Conflict Prevention)
Given (前提)：
 * 「第 1 組」已經選擇了座標 (行1, 列1)。
When (當操作發生時)：
 * 我（第 3 組）嘗試點擊已被佔用的 (行1, 列1) 時。
Then (預期結果)： 
* 系統應顯示提示「此位置已被第 1 組選取」，且不允許我提交。介面應透過 onSnapshot 即時更新，將已被選取的格子設為 disabled。

Scenario 3: 組員重複選擇處理 (Group Consensus)
Given (前提)：

