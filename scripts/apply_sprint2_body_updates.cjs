const fetch = global.fetch || require('node-fetch');
const fs = require('fs');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const updates = [
  { issue: 7, note: 'Sprint 2 修改紀錄：將 #7（報告組給分）分數範圍調整為 **0–3 分**（0 分表示不合理或亂問），並更新了相關驗收標準與測試要點。' },
  { issue: 11, note: 'Sprint 2 調整：將 #11（限制單場報告總點數上限）暫不納入 Sprint 2，已移至 backlog。' },
  { issue: 8, note: 'Sprint 2 調整：將 #8（虛擬座位表 / 麥克風分配）加入 Sprint 2 必做項目，以支援報告組選人並啟用麥克風（上麥）流程。' }
  ,{ issue: 16, note: 'Sprint 2 補充：#16（教師給分及後端共用邏輯）— 明確教師介面給分採 **1–5 分**；系統亦需支援報告組/台上學生的 **0–3 分**，並由 API 根據 `givenBy.role` 驗證範圍。建議抽成共用服務執行寫入與 audit，並以 transaction 保證原子性。' }
  ,{ issue: 17, note: 'Sprint 2 補充：#17（學生舉手）— 舉手資料必須包含 `group`、`ownerId` 與 `timestamp`；報告組或台上學生給分採 **0–3 分**，系統在寫入 `participation_logs` 時需記錄 `givenBy`、`points` 並以 API 驗證範圍；如提供 handRef，應將對應 `hands_raised` 設為 resolved 並建立審計紀錄。' }
];

async function getIssue(number){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Failed to fetch issue ${number}: ${res.status}`);
  return res.json();
}

async function patchIssue(number, body){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, { method: 'PATCH', headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to patch issue ${number}: ${res.status} ${t}`);
  }
  return res.json();
}

(async ()=>{
  try{
    const timestamp = new Date().toISOString().split('T')[0];
    for (const u of updates){
      console.log(`Processing issue #${u.issue}...`);
      const it = await getIssue(u.issue);
      const existing = it.body || '';
      const marker = `\n\n---\n\n**修改紀錄 (${timestamp})**\n\n${u.note}\n`;
      const newBody = existing + marker;
      await patchIssue(u.issue, newBody);
      console.log(`Patched issue #${u.issue}`);
    }
    console.log('All done.');
  }catch(e){ console.error(e); process.exit(1); }
})();
