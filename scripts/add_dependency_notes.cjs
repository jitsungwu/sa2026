const fetch = global.fetch || require('node-fetch');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const updates = [
  { issue: 8, note: `**相依註記 (2026-04-02)**\n\n- Issue #8 (虛擬座位表介面) 依賴 Issue #14 (登入時選擇座位)。#8 的視覺化假設已存在座位資料（classes/.../layout）。建議先完成 #14 或提供 seed 資料以供 #8 開發/展示。` },
  { issue: 14, note: `**相依註記 (2026-04-02)**\n\n- Issue #14 (登入時選擇座位) 為 Issue #8 (虛擬座位表介面) 的前置需求。完成 #14 可確保 #8 的視覺化功能能正確呈現真實座位資料。` }
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

async function postComment(number, body){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}/comments`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' }, body: JSON.stringify({ body }) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to post comment to ${number}: ${res.status} ${t}`);
  }
  return res.json();
}

(async ()=>{
  try{
    const ts = new Date().toISOString().split('T')[0];
    for (const u of updates){
      console.log(`Processing issue #${u.issue}...`);
      const it = await getIssue(u.issue);
      const existing = it.body || '';
      const marker = `\n\n---\n\n${u.note}\n`;
      const newBody = existing + marker;
      await patchIssue(u.issue, newBody);
      console.log(`Patched issue #${u.issue}`);
      const commentBody = `更新通知：已在 issue body 加入相依註記（${ts}）。請參閱 issue body 最下方。`;
      const comment = await postComment(u.issue, commentBody);
      console.log(`Posted comment to #${u.issue}: ${comment.html_url}`);
    }
    console.log('All done.');
  }catch(e){ console.error(e); process.exit(1); }
})();
