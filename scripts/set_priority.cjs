const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) {
  console.error('GITHUB_TOKEN not set in environment');
  process.exit(1);
}

async function getIssue(number) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Failed to fetch issue ${number}: ${res.status}`);
  return res.json();
}

async function patchIssue(number, labels) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH issue ${number} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

(async () => {
  try {
    const priorityIssues = [3, 9];
    
    for (const num of priorityIssues) {
      const issue = await getIssue(num);
      const existingLabels = (issue.labels || []).map(l => l.name);
      
      // 移除其他優先級標籤，加入 priority:critical
      const newLabels = existingLabels
        .filter(l => !l.startsWith('priority:'))
        .concat(['priority:critical']);
      
      await patchIssue(num, newLabels);
      console.log(`✓ Issue #${num} marked as priority:critical`);
      console.log(`  Labels: ${newLabels.join(', ')}`);
    }
    
    console.log('\nDone. Issues #3 and #9 are now marked as highest priority.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
