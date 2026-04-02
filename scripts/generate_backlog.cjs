const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.resolve('.env.local') }); } catch (e) {}
const fetch = global.fetch || require('node-fetch');

const OWNER = process.env.PROJECT_OWNER || 'jitsungwu';
const REPO = process.env.PROJECT || 'sa2026';
const PROJECT_NUMBER = parseInt(process.env.PROJECT_NUMBER || '2', 10);
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set in .env.local'); process.exit(1); }

async function gql(query) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GraphQL failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data;
}

(async () => {
  try {
    const query = `
    query {
      repository(owner: "${OWNER}", name: "${REPO}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          title
          items(first: 100) {
            nodes {
              id
              content { ... on Issue { number title body state url } }
              fieldValues(first: 50) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue { field { ... on ProjectV2SingleSelectField { id name } } name }
                }
              }
            }
          }
        }
      }
    }
    `;

    const data = await gql(query);
    const project = data.repository.projectV2;
    if (!project) throw new Error('Project not found');
    const items = project.items.nodes || [];

    const matched = [];
    for (const item of items) {
      if (!item.content || item.content.number === undefined) continue;
      const fv = (item.fieldValues && item.fieldValues.nodes) || [];
      const status = fv.find(n => n.field && n.field.name === 'Status');
      if (status && status.name === 'Backlog') matched.push(item.content);
    }

    const outPath = path.resolve('.github/backlog.md');
    let out = `# Backlog — Issues with Project Status = Backlog\n\n`;
    if (matched.length === 0) out += '_No issues found where Project Status == Backlog._\n';
    else {
      for (const issue of matched) {
        out += `### Issue #${issue.number}: ${issue.title}\n- State: ${issue.state}\n- URL: ${issue.url}\n\n${issue.body ? issue.body.split('\n').slice(0,20).join('\n') : ''}\n\n`;
      }
    }
    fs.writeFileSync(outPath, out, 'utf8');
    console.log(`Wrote ${outPath} with ${matched.length} issues`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
