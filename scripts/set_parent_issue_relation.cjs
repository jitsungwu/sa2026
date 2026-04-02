const fetch = global.fetch || require('node-fetch');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
const PROJECT_NUMBER = 2;
const CHILD_ISSUE = 8; // item to set parent on
const PARENT_ISSUE = 14; // item to reference

if (!GITHUB) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

async function getProject() {
  const query = `
    query {
      repository(owner: "${OWNER}", name: "${REPO}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          fields(first:50) { nodes { __typename ... on ProjectV2Field { id name } ... on ProjectV2SingleSelectField { id name } } }
          items(first:100) { nodes { id content { ... on Issue { number } } } }
        }
      }
    }
  `;
  const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data.repository.projectV2;
}

async function updateParentField(projectId, itemId, fieldId, parentItemId) {
  const mutation = `
    mutation($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        projectV2Item { id }
      }
    }
  `;
  const variables = { input: { projectId, itemId, fieldId, value: { itemId: parentItemId } } };
  const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: mutation, variables }) });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data;
}

(async ()=>{
  try{
    const project = await getProject();
    const projectId = project.id;
    const parentField = project.fields.nodes.find(f => f.name === 'Parent issue');
    if (!parentField) throw new Error('Parent issue field not found');
    const items = project.items.nodes;
    const map = new Map(items.map(it => [it.content && it.content.number, it.id]));
    const childItemId = map.get(CHILD_ISSUE);
    const parentItemId = map.get(PARENT_ISSUE);
    if (!childItemId) throw new Error(`Project item for issue #${CHILD_ISSUE} not found`);
    if (!parentItemId) throw new Error(`Project item for issue #${PARENT_ISSUE} not found`);
    console.log(`Setting Parent issue field (${parentField.id}) on item ${childItemId} -> ${parentItemId}`);
    const r = await updateParentField(projectId, childItemId, parentField.id, parentItemId);
    console.log('Update response:', JSON.stringify(r));
    console.log('Done');
  }catch(e){ console.error(e); process.exit(1); }
})();
