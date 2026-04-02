try{require('dotenv').config({path: '.env.local'})}catch(e){}
const fetch = global.fetch || require('node-fetch');
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if(!GITHUB){console.error('GITHUB_TOKEN missing'); process.exit(1)}

const issues = [3,9,15,16,17];
const sha = process.argv[2] || (require('child_process').execSync('git rev-parse --short HEAD').toString().trim());
(async ()=>{
  for(const n of issues){
    const head = `link-issue-${n}-${sha}`;
    const title = `Link changes for issue #${n}`;
    const body = `This PR links recent changes to issue #${n}. Related commit: ${sha}\n\nCloses? No — please review.`;
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`,{
      method: 'POST',
      headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json', 'User-Agent':'script' },
      body: JSON.stringify({ title, head, base: 'main', body })
    });
    if(!res.ok){
      const txt = await res.text();
      console.error(`Failed to create PR for #${n}: ${res.status} ${res.statusText} - ${txt}`);
    } else {
      const data = await res.json();
      console.log(`Created PR for #${n}: ${data.html_url}`);
      // add PR link comment to the issue
      const commentRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues/${n}/comments`,{
        method:'POST', headers: { Authorization: `token ${GITHUB}`, 'Content-Type':'application/json', 'User-Agent':'script' },
        body: JSON.stringify({ body: `Created PR ${data.html_url} for review and linking to this issue.` })
      });
      if(!commentRes.ok){ const t = await commentRes.text(); console.error(`Failed to comment on #${n}: ${t}`) }
      else { const cdata = await commentRes.json(); console.log(`Commented on #${n}: ${cdata.html_url}`) }
    }
  }
})();
