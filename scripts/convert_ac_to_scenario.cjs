const fs = require('fs');
try { require('dotenv').config({ path: '.env.local' }); } catch (e) {}
const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const sprintPath = '.github/SPRINT_2.md';
const sprint = fs.readFileSync(sprintPath, 'utf8');

function extractACBlock(num) {
  // Extract from the 'AC 補充細節' section if present by manual scanning
  const acSectionHeader = '### AC 補充細節';
  const idx = sprint.indexOf(acSectionHeader);
  const hay = idx >= 0 ? sprint.slice(idx) : sprint;
  const lines = hay.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(new RegExp('^-\\s*#' + num + '\\b'))) { start = i; break; }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start+1; i < lines.length; i++) {
    if (lines[i].trim().match(/^-\s*#\d+\b/)) { end = i; break; }
    if (lines[i].includes('- 驗收標準總表')) { end = i; break; }
  }
  const block = lines.slice(start, end).join('\n');
  return block.replace(/^[ \t]*-\s*/m, '').trim();
}

function buildScenariosFromAC(acText) {
  if (!acText) return '';
  // Split by lines and look for Given/When/Then groups
  const lines = acText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);
  const gwts = lines.filter(l => /^(Given|When|Then)/i.test(l) || /^- (Given|When|Then)/i.test(l));
  // We'll create scenarios grouping sequential Given/When/Then triples
  const scenarios = [];
  let cur = { title: 'Scenario', steps: [] };
  for (const l of gwts) {
    const clean = l.replace(/^-\s*/,'');
    if (/^Given/i.test(clean) && cur.steps.length) {
      scenarios.push(cur);
      cur = { title: 'Scenario', steps: [] };
    }
    cur.steps.push(clean);
  }
  if (cur.steps.length) scenarios.push(cur);
  // format
  let out = '';
  scenarios.forEach((s,i)=>{
    out += `Scenario ${i+1}: ${s.title}\n`;
    s.steps.forEach(step=>{
      out += `- ${step}\n`;
    });
    out += '\n';
  });
  return out.trim();
}

async function getIssue(number) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Failed to fetch issue ${number}: ${res.status}`);
  return res.json();
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

(async ()=>{
  try{
    const targets = [7,8,14,17,16,11,12,10];
    for(const n of targets) {
      const issue = await getIssue(n);
      const acBlock = extractACBlock(n);
        if (!acBlock) {
        console.log(`No AC block found for #${n}, skipping`);
        continue;
      }
        console.log(`AC block for #${n}:\n${acBlock.substring(0,300)}\n---`);
      const scenarios = buildScenariosFromAC(acBlock);
      if (!scenarios) {
        console.log(`No GWT lines for #${n}, skipping`);
        continue;
      }
      // Build replacement: find marker '**Acceptance Criteria (Given / When / Then)**' in issue body
      const marker = '**Acceptance Criteria (Given / When / Then)**';
      let newBody;
      if (issue.body && issue.body.includes(marker)) {
        newBody = issue.body.split(marker)[0] + marker + '\n\n' + scenarios + '\n';
      } else {
        // append
        newBody = (issue.body||'') + '\n\n**Acceptance Criteria (Given / When / Then)**\n\n' + scenarios + '\n';
      }
      const existingLabels = (issue.labels||[]).map(l=>l.name);
      const wanted = Array.from(new Set([...existingLabels,'sprint2','status:todo']));
      await patchIssue(n,newBody,wanted);
      console.log(`Updated issue #${n} with Scenario-formatted AC`);
    }
    console.log('All done');
  }catch(e){console.error(e);process.exit(1);} 
})();
