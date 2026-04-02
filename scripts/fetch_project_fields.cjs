const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.resolve('.env.local') }); } catch (e) {}
const fetch = global.fetch || require('node-fetch');
const OWNER = process.env.PROJECT_OWNER || 'jitsungwu';
const PROJECT_NUMBER = parseInt(process.env.PROJECT_NUMBER || '2', 10);
const GITHUB = process.env.GITHUB_TOKEN;
if (!GITHUB) { console.error('GITHUB_TOKEN not set in .env.local'); process.exit(1); }
const GRAPHQL = 'https://api.github.com/graphql';
async function gql(query, variables){
  const res = await fetch(GRAPHQL, { method:'POST', headers:{ Authorization: `bearer ${GITHUB}`, 'Content-Type':'application/json' }, body: JSON.stringify({ query, variables }) });
  const data = await res.json();
  if (!res.ok || data.errors) throw new Error(JSON.stringify(data.errors || data, null, 2));
  return data.data;
}
(async ()=>{
  try{
    const q = `query($login:String!, $number:Int!){ user(login:$login){ projectV2(number:$number){ id title fields(first:50){ nodes{ id name __typename ... on ProjectV2SingleSelectField{ settings } ... on ProjectV2IterationField{ configuration } ... on ProjectV2FieldCommon{ } } } } } }`;
    const data = await gql(q, { login: OWNER, number: PROJECT_NUMBER });
    fs.writeFileSync('project_fields_debug.json', JSON.stringify(data, null, 2));
    console.log('Wrote project_fields_debug.json');
  }catch(e){ console.error(e); process.exit(1); }
})();
