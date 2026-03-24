const fs = require('fs');
const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) {
  console.error('GITHUB_TOKEN not set in environment');
  process.exit(1);
}

const sprintPath = '.github/SPRINT_1_MVP.md';
const sprint = fs.readFileSync(sprintPath, 'utf8');

// 正確的 Issue → User Story 對應
const issueMapping = {
  2: { us: 'US 1.1', title: '教師：透過 Excel 批次匯入學生名單' },
  3: { us: 'US 1.1', title: '教師：在介面中切換班級' },
  4: { us: 'US 1.1', title: '教師：設定倒數計時與提醒音效' },
  5: { us: 'US 1.2', title: '教師：發言名單權重排序（優先發言少者）' },
  6: { us: 'US 2.1', title: '教師：含隨機擾動的抽點功能' },
  7: { us: 'US 2.1', title: '學生（報告組）：在台上給予 1–5 點' },
  8: { us: 'US 2.2', title: '學生（報告組）：虛擬座位表介面' },
  9: { us: 'US 2.2', title: '學生（被發問者）：即時加分通知' },
  10: { us: 'US 2.2', title: '學生：登入後查看個人累計點數' },
  11: { us: 'US 1.2', title: '教師：限制單場報告總點數上限' },
  12: { us: 'US 1.2', title: '教師：檢視紀錄牆並微調點數' },
  13: { us: 'US 4.3', title: '助教：匯出全班點數總表（Excel）' },
};

function extractUS(usString) {
  // 從 SPRINT 內容中提取對應 US 的部分（包括其後的所有 AC）
  const marker = `- **${usString}`;
  const start = sprint.indexOf(marker);
  if (start === -1) return null;
  
  // 找下一個 US marker 或 section header
  let end = sprint.indexOf('\n- **US ', start + 1);
  if (end === -1) end = sprint.indexOf('\n## ', start + 1);
  if (end === -1) end = sprint.length;
  
  const section = sprint.slice(start, end).trim();
  return section;
}

async function getIssues() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=100`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Failed to fetch issues: ${res.status}`);
  return res.json();
}

async function patchIssue(number, body, labels) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, labels }),
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
    const results = [];
    
    for (const it of issues) {
      if (it.pull_request) continue;
      
      const mapped = issueMapping[it.number];
      if (!mapped) {
        console.log(`Skip issue #${it.number} - not in mapping`);
        continue;
      }
      
      let append = '\n\n**Sprint 1 MVP — 驗收條件**\n\n';
      const ac = extractUS(mapped.us);
      if (ac) {
        append += ac.split('\n').map(line => '> ' + line).join('\n');
      } else {
        append += `> (無法在 SPRINT_1_MVP.md 中找到 ${mapped.us} 的驗收條件)`;
      }
      
      const newBody = (it.body || '').split('\n\n**Sprint 1 MVP')[0].trim() + append;
      const existingLabels = (it.labels || []).map(l => l.name);
      const wanted = Array.from(new Set([...existingLabels, 'sprint1/mvp', 'status:todo']));
      
      await patchIssue(it.number, newBody, wanted);
      console.log(`✓ Updated issue #${it.number} → ${mapped.us}`);
      results.push({ number: it.number, us: mapped.us });
    }
    
    console.log('\n=== Summary ===');
    console.log('Updated issues:');
    results.forEach(r => console.log(`  #${r.number} → ${r.us}`));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
