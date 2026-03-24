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

function extractUS(usNum) {
  const marker = `- **US ${usNum}`;
  const start = sprint.indexOf(marker);
  if (start === -1) return null;
  // find next US marker or next section header
  let end = sprint.indexOf('\n- **US ', start + 1);
  if (end === -1) end = sprint.indexOf('\n##', start + 1);
  if (end === -1) end = sprint.length;
  const section = sprint.slice(start, end);
  return section.trim();
}

const acMap = {
  '1.1': extractUS('1.1'),
  '1.2': extractUS('1.2'),
  '2.1': extractUS('2.1'),
  '2.2': extractUS('2.2'),
};

async function getIssues() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=100`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Failed to fetch issues: ${res.status}`);
  return res.json();
}

function chooseACForTitle(title) {
  title = title || '';
  if (/舉手|Raise Hand|hands_raised|舉手列表/i.test(title)) return { us: '2.1', ac: acMap['2.1'] };
  if (/積分榜|Scoreboard|累計點數|分數|分數榜/i.test(title)) return { us: '2.2', ac: acMap['2.2'] };
  if (/給分|評分|點數/i.test(title)) return { us: '1.2', ac: acMap['1.2'] };
  if (/監控|Monitor|重置|重設|Reset|監看/i.test(title)) return { us: '1.1', ac: acMap['1.1'] };
  return null;
}

async function patchIssue(number, body, labels) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' , 'Content-Type':'application/json'},
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
      const pick = chooseACForTitle(it.title);
      let append = '\n\n**Sprint 1 MVP — 驗收條件**\n';
      if (pick && pick.ac) {
        append += pick.ac.replace(/^/gm, '> ');
      } else if (pick && !pick.ac) {
        append += '> (找到相關 User Story，但 SPRINT_1_MVP.md 無具體 AC 條目)';
      } else {
        append += '> (此 Issue 在 SPRINT_1_MVP.md 未找到對應的驗收條件，請補充。)';
      }

      const newBody = (it.body || '') + append;
      const existingLabels = (it.labels || []).map(l => l.name);
      const wanted = Array.from(new Set([...existingLabels, 'sprint1/mvp', 'status:todo']));
      await patchIssue(it.number, newBody, wanted);
      console.log(`Updated issue #${it.number} - ${it.title}`);
      results.push({ number: it.number, title: it.title });
    }
    console.log('Done. Updated issues:', results.map(r => `#${r.number}`).join(', '));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
