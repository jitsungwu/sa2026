const path = require('path');
try { require('dotenv').config({ path: path.resolve('.env.local') }); } catch (e) {}
const fetch = global.fetch || require('node-fetch');
const OWNER = process.env.PROJECT_OWNER || 'jitsungwu';
const REPO = process.env.PROJECT_NAME || 'sa2026';
const PROJECT_NUMBER = parseInt(process.env.PROJECT_NUMBER || '2', 10);
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set in .env.local'); process.exit(1); }

async function gql(query, variables){
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${GITHUB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (!res.ok || data.errors) throw new Error(JSON.stringify(data.errors || data, null, 2));
  return data.data;
}

(async ()=>{
  const q = `query($owner:String!, $repo:String!, $number:Int!){
    repository(owner:$owner, name:$repo){
      projectV2(number:$number){
        id
        title
        fields(first:50){ nodes{ __typename ... on ProjectV2SingleSelectField{ name id } ... on ProjectV2IterationField{ name id } } }
        items(first:50){ nodes{ content{ __typename ... on Issue{ number title } } fieldValues(first:50){ nodes{ __typename ... on ProjectV2ItemFieldSingleSelectValue{ name } ... on ProjectV2ItemFieldIterationValue{ } ... on ProjectV2ItemFieldTextValue{ text } ... on ProjectV2ItemFieldNumberValue{ number } } } } }
      }
    }
  }`;
  try{
    const data = await gql(q, { owner: OWNER, repo: REPO, number: PROJECT_NUMBER });
    console.log(JSON.stringify(data, null, 2));
  }catch(e){ console.error(e); process.exit(1); }
})();
