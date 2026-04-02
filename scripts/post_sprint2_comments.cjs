const fs = require('fs');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
const fetch = global.fetch || require('node-fetch');
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const comments = [
  { issue: 7, body: '更新通知：Sprint 2 規格已調整 — `#7`（報告組給分）分數範圍修改為 **0–3 分**（0 分表示不合理或亂問），已將此更新列入 Sprint 2 的驗收標準與測試要點。' },
  { issue: 11, body: '更新通知：Sprint 2 範圍調整 — `#11`（限制單場報告總點數上限）暫不排入 Sprint 2，將保留於 backlog，必要時再排入後續 Sprint。' },
  { issue: 8, body: '更新通知：Sprint 2 範圍調整 — `#8`（虛擬座位表 / 麥克風分配）已加入為 Sprint 2 必做項目，以支援報告組選人並啟用麥克風（上麥）流程。' }
];

(async () => {
  for (const c of comments) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${c.issue}/comments`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json', 'User-Agent': 'sprint-script' },
      body: JSON.stringify({ body: c.body })
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`Failed to post comment to #${c.issue}: ${res.status} ${res.statusText} - ${txt}`);
    } else {
      const data = await res.json();
      console.log(`Posted comment to #${c.issue}: ${data.html_url}`);
    }
  }
})();
