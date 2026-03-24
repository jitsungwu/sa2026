const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;

async function checkIssues() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=100`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' }
  });
  const issues = await res.json();
  
  for (const it of issues) {
    if (it.pull_request) continue;
    console.log(`\n=== Issue #${it.number}: ${it.title} ===`);
    console.log(`Labels: ${it.labels.map(l => l.name).join(', ') || '(none)'}`);
    console.log(`Body length: ${(it.body || '').length} chars`);
    // 檢查是否有 Sprint 1 MVP 驗收條件部分
    if ((it.body || '').includes('Sprint 1 MVP')) {
      console.log('✓ 包含 Sprint 1 MVP 驗收條件部分');
    } else {
      console.log('✗ 缺少 Sprint 1 MVP 驗收條件部分');
    }
  }
}

checkIssues().catch(err => {
  console.error(err);
  process.exit(1);
});
