const fs = require('fs');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const sprintPath = '.github/SPRINT_2.md';
const sprint = fs.readFileSync(sprintPath, 'utf8');

function extractListLine(num) {
  const re = new RegExp('^- \\#' + num + ':[^\n]*', 'm');
  const m = sprint.match(re);
  return m ? m[0].replace(/^ - /, '') : null;
}

function extractACBlock(num) {
  // AC section uses a bullet '- #7（...）' under 'AC 補充細節' header
  const re = new RegExp('^- \\#' + num + '[\s\S]*?(?=\n- \\#\\d|\n- 驗收標準總表|$)', 'm');
  const m = sprint.match(re);
  if (!m) return null;
  // remove leading ' - '
  return m[0].replace(/^ - /m, '').trim();
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

async function getIssue(number) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Failed to fetch issue ${number}: ${res.status}`);
  return res.json();
}

(async () => {
  try {
    const targets = [7,8,14,17,16,11,12,10];
    for (const n of targets) {
      const issue = await getIssue(n);
      const listLine = extractListLine(n) || '';
      const ac = extractACBlock(n) || '';
      const append = `\n\n**User Story (from SPRINT_2.md)**\n${listLine}\n\n**Acceptance Criteria (Given / When / Then)**\n${ac}`;
      const newBody = (issue.body || '') + append;
      const existingLabels = (issue.labels || []).map(l=>l.name);
      const wanted = Array.from(new Set([...existingLabels, 'sprint2', 'status:todo']));
      await patchIssue(n, newBody, wanted);
      console.log(`Patched issue #${n}`);
    }
    console.log('Done.');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
