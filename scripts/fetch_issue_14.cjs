const path = require('path');
try { require('dotenv').config({ path: path.resolve('.env.local') }); } catch (e) {}
const fetch = global.fetch || require('node-fetch');
const token = process.env.GITHUB_TOKEN;

(async () => {
  const res = await fetch('https://api.github.com/repos/jitsungwu/sa2026/issues/14', {
    headers: { Authorization: `token ${token}` }
  });
  const data = await res.json();
  console.log(data.body);
})();
