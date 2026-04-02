const fetch = global.fetch || require('node-fetch');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const issues = [7, 16, 17];

const note = `**最終決議 (2026-04-02)**

- 分數制：教師採 1–5（整數）；報告組相關互評採 0–3（整數）；不允許小數或負值。
- 情境（明確三種）：
  1. 教師加分（全域權限）：教師可隨時對任意小組給分，採 1–5。
  2. 教師提問情境：教師提問並由學生/小組回答時，回答小組的評分採 0–3；教師可在此情境額外給分（1–5）。
  3. 學生報告情境：小組上台報告時，評分方（報告組或其他指定小組）採 0–3；教師可額外給分（1–5）。
- 計分目標：系統僅對小組（group）計分；個人分數由小組分配規則另行定義。
- 審計與資料保留：\`participation_logs\` 為長期保留之審計紀錄（課程結束後清除）；即時 Scoreboard 應使用 denormalized 聚合欄位或 background job 更新，避免每次從日誌重算。
- API 與實作建議：在給分 endpoint 中依 \`givenBy.role\` 驗證範圍（教師 1..5，報告組/學生 0..3），所有寫入與 hands resolving 建議以 transaction 或原子作業完成，並同時寫入 \`participation_logs\` 與更新 denormalized 聚合欄位。

如無異議，我們將依此規格實作；若需我同步更新其他 issues 或建立 PR，請回覆指示.`;

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
    for (const num of issues){
      console.log(`Processing issue #${num}...`);
      const it = await getIssue(num);
      const existing = it.body || '';
      const marker = `\n\n---\n\n${note}\n`;
      const newBody = existing + marker;
      await patchIssue(num, newBody);
      console.log(`Patched issue #${num}`);
    }
    console.log('All done.');
  }catch(e){ console.error(e); process.exit(1); }
})();
