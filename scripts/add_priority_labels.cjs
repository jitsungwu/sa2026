const fetch = global.fetch || require('node-fetch');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const issues = [7,16,17];
const label = 'P1';

async function addLabel(number){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}/labels`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' }, body: JSON.stringify([label]) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to add label to issue ${number}: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data;
}

(async ()=>{
  try{
    for (const n of issues){
      console.log(`Adding label ${label} to issue #${n}...`);
      const resp = await addLabel(n);
      console.log(`Issue #${n} labels now: ${resp.map(l=>l.name).join(', ')}`);
    }
    console.log('Done.');
  }catch(e){ console.error(e); process.exit(1); }
})();
