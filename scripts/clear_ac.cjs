const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) {
  console.error('GITHUB_TOKEN not set in environment');
  process.exit(1);
}

async function getIssues() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=100`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Failed to fetch issues: ${res.status}`);
  return res.json();
}

async function patchIssue(number, body) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH issue ${number} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

(async () => {
  try {
    const issues = await getIssues();
    
    for (const it of issues) {
      if (it.pull_request) continue;
      
      // 移除 "**Sprint 1 MVP — 驗收條件**" 之後的所有內容
      const body = (it.body || '');
      if (!body.includes('**Sprint 1 MVP')) {
        console.log(`Skip #${it.number} - no AC section found`);
        continue;
      }
      
      const newBody = body.split('**Sprint 1 MVP')[0].trim();
      await patchIssue(it.number, newBody);
      console.log(`✓ Cleared AC from issue #${it.number}`);
    }
    
    console.log('\nDone. All acceptance criteria cleared.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
