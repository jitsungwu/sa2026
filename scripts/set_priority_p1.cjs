const fetch = global.fetch || require('node-fetch');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
const PROJECT_NUMBER = 2;
const TARGET_ISSUES = [7,16,17,11,12,10,8];
const TARGET_PRIORITY_NAME = 'P1';

if (!GITHUB) {
  console.error('GITHUB_TOKEN not set');
  process.exit(1);
}

async function getProject() {
  const query = `
    query {
      repository(owner: "${OWNER}", name: "${REPO}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          fields(first: 50) {
            nodes {
              ... on ProjectV2SingleSelectField { id name options { id name } }
              ... on ProjectV2Field { id name }
            }
          }
        }
      }
    }
  `;
  const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data.repository.projectV2;
}

async function getProjectItems() {
  const query = `
    query {
      repository(owner: "${OWNER}", name: "${REPO}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          items(first: 100) {
            nodes {
              id
              content { ... on Issue { number } }
            }
          }
        }
      }
    }
  `;
  const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data.repository.projectV2.items.nodes;
}

async function updateProjectItemField(projectId, itemId, fieldId, optionId) {
  const mutation = `mutation($input: UpdateProjectV2ItemFieldValueInput!) { updateProjectV2ItemFieldValue(input:$input) { projectV2Item { id } } }`;
  const variables = { input: { projectId, itemId, fieldId, value: { singleSelectOptionId: optionId } } };
  const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: mutation, variables }) });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data;
}

(async ()=>{
  try {
    console.log('Fetching project info...');
    const project = await getProject();
    const projectId = project.id;
    const priorityField = project.fields.nodes.find(f => f.name && f.name.toLowerCase().includes('priority'));
    if (!priorityField) throw new Error('Priority field not found in project');
    const option = (priorityField.options||[]).find(o => o.name === TARGET_PRIORITY_NAME);
    if (!option) throw new Error(`Priority option '${TARGET_PRIORITY_NAME}' not found`);
    const optionId = option.id;

    console.log(`Found priority field ${priorityField.name} (${priorityField.id}), option ${TARGET_PRIORITY_NAME} = ${optionId}`);

    const items = await getProjectItems();
    for (const it of items) {
      const num = it.content && it.content.number;
      if (!num) continue;
      if (TARGET_ISSUES.includes(num)) {
        console.log(`Setting Priority=${TARGET_PRIORITY_NAME} for project item (issue #${num})`);
        await updateProjectItemField(projectId, it.id, priorityField.id, optionId);
        console.log(`  ✓ Updated #${num}`);
      }
    }
    console.log('Done.');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
