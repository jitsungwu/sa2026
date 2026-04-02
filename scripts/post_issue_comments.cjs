const fs = require('fs');
try { require('dotenv').config({ path: '.env.local' }); } catch(e){}
const fetch = global.fetch || require('node-fetch');
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const comments = [
  { issue: 9, body: '已在 main 分支提交變更：新增學生端即時加分驗證的 E2E 斷言；相關測試已通過，並將 Issue 標記為 In review。' },
  { issue: 15, body: '已在 main 分支提交變更：在教師監控頁加入 Scoreboard，並確認 E2E 測試通過；建議審查並關閉此 Issue。' },
];

(async () => {
  for (const c of comments) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${c.issue}/comments`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `token ${GITHUB}`,
        'Content-Type': 'application/json',
        'User-Agent': 'script'
      },
      body: JSON.stringify({ body: c.body }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Failed to post comment to #${c.issue}: ${res.status} ${res.statusText} - ${text}`);
    } else {
      const data = await res.json();
      console.log(`Posted comment to #${c.issue}: ${data.html_url}`);
    }
  }
})();
