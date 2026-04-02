const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.resolve('.env.local') }); } catch (e) {}
const fetch = global.fetch || require('node-fetch');

const OWNER = process.env.PROJECT_OWNER || 'jitsungwu';
const PROJECT_NUMBER = parseInt(process.env.PROJECT_NUMBER || '2', 10);
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set in .env.local'); process.exit(1); }

const GRAPHQL = 'https://api.github.com/graphql';
async function gql(query, variables) {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { Authorization: `bearer ${GITHUB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (!res.ok || data.errors) throw new Error(JSON.stringify(data.errors || data, null, 2));
  return data.data;
}

async function getProject() {
  const q = `query($login:String!, $number:Int!){ user(login:$login){ projectV2(number:$number){ id title url } } }`;
  const data = await gql(q, { login: OWNER, number: PROJECT_NUMBER });
  return data.user.projectV2;
}

async function fetchItems(projectId) {
  const items = [];
  let after = null;
  while (true) {
    const q = `query($projectId:ID!, $after:String){
      node(id:$projectId){
        ... on ProjectV2{
          items(first:100, after:$after){
            pageInfo{ hasNextPage endCursor }
            nodes{
              id
              content{ __typename ... on Issue{ number title url body state labels(first:20){ nodes{ name } } } }
              fieldValues(first:50){ nodes{
                __typename
                projectField{ name }
                ... on ProjectV2ItemFieldIterationValue{ iteration{ id title } }
                ... on ProjectV2ItemFieldTextValue{ text }
                ... on ProjectV2ItemFieldNumberValue{ number }
                ... on ProjectV2ItemFieldSingleSelectValue{ singleSelectOption{ id name } }
              } }
            }
          }
        }
      }
    }`;
    const data = await gql(q, { projectId, after });
    const node = data.node;
    if (!node || !node.items) break;
    const page = node.items;
    for (const n of page.nodes) items.push(n);
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return items;
}

(async ()=>{
  try {
    const proj = await getProject();
    if (!proj) { console.log('Project not found'); process.exit(0); }
    console.log('Project:', proj.title, proj.id);
    const items = await fetchItems(proj.id);
    console.log('Fetched items:', items.length);

    const matched = [];
    for (const it of items) {
      if (!it.content || it.content.__typename !== 'Issue') continue;
      const fvs = it.fieldValues && it.fieldValues.nodes ? it.fieldValues.nodes : [];
      for (const fv of fvs) {
        if (!fv || !fv.projectField) continue;
        if ((fv.projectField.name || '').toLowerCase() === 'status') {
          // check iteration or text or singleSelect
          if (fv.__typename === 'ProjectV2ItemFieldIterationValue' && fv.iteration && fv.iteration.title === 'In review') matched.push(it.content);
          if (fv.__typename === 'ProjectV2ItemFieldTextValue' && fv.text && fv.text.trim().toLowerCase() === 'in review') matched.push(it.content);
          if (fv.__typename === 'ProjectV2ItemFieldSingleSelectValue' && fv.singleSelectOption && fv.singleSelectOption.name === 'In review') matched.push(it.content);
        }
      }
    }

    const outPath = path.resolve('.github/SPRINT_1.md');
    let out = `# Sprint 1 — Issues with Project Status = In review\n\n`;
    if (matched.length === 0) out += '_No issues found where Project Status == In review._\n';
    else for (const issue of matched) {
      const labels = issue.labels && issue.labels.nodes ? issue.labels.nodes.map(l=>l.name).join(', ') : '-';
      out += `### Issue #${issue.number}: ${issue.title}\n- State: ${issue.state}\n- Labels: ${labels}\n- URL: ${issue.url}\n\n${issue.body ? issue.body.split('\n').slice(0,20).join('\n') : ''}\n\n`;
    }
    fs.writeFileSync(outPath, out, 'utf8');
    console.log(`Wrote ${outPath} with ${matched.length} issues`);
  } catch (e) { console.error(e); process.exit(1); }
})();
