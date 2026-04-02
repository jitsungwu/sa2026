try { require('dotenv').config({ path: '.env.local' }); } catch (e) {}
const fetch = global.fetch || require('node-fetch');
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const prs = [18,19,20,21,22];

(async () => {
  for (const pr of prs) {
    try {
      const url = `https://api.github.com/repos/${OWNER}/${REPO}/pulls/${pr}/merge`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB}`,
          'Content-Type': 'application/json',
          'User-Agent': 'script'
        },
        body: JSON.stringify({ commit_title: `Merge PR #${pr} via script`, merge_method: 'merge' })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`PR #${pr} merged: ${data.sha}`);
      } else {
        console.error(`Failed to merge PR #${pr}: ${res.status} ${res.statusText} - ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error(`Error merging PR #${pr}:`, err.message);
    }
  }
})();
