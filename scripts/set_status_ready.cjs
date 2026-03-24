const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
const PROJECT_NUMBER = 2;
const PROJECT_ID = 'PVT_kwHOALmg9s4BScZQ';
const STATUS_FIELD_ID = 'PVTSSF_lAHOALmg9s4BScZQzg_-duE';
const READY_OPTION_ID = 'e18bf179';

if (!GITHUB) {
  console.error('GITHUB_TOKEN not set in environment');
  process.exit(1);
}

async function getProjectItems() {
  const query = `
    query {
      repository(owner: "${OWNER}", name: "${REPO}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                  title
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  
  if (!res.ok) throw new Error(`GraphQL query failed: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  return data.data.repository.projectV2.items.nodes;
}

async function updateProjectItemStatus(itemId, issueName) {
  const mutation = `
    mutation {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: "${PROJECT_ID}"
          itemId: "${itemId}"
          fieldId: "${STATUS_FIELD_ID}"
          value: { singleSelectOptionId: "${READY_OPTION_ID}" }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `;
  
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: mutation }),
  });
  
  if (!res.ok) throw new Error(`GraphQL mutation failed: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  return data;
}

(async () => {
  try {
    console.log('Fetching Project items...');
    const items = await getProjectItems();
    
    const itemMap = new Map();
    items.forEach(item => {
      if (item.content && item.content.number !== undefined) {
        itemMap.set(item.content.number, item.id);
      }
    });
    
    console.log(`Found ${itemMap.size} issues in project\n`);
    
    const statusIssues = [3, 9];
    for (const issueNum of statusIssues) {
      const itemId = itemMap.get(issueNum);
      if (!itemId) {
        console.log(`✗ Issue #${issueNum} not found in project`);
        continue;
      }
      
      await updateProjectItemStatus(itemId, `#${issueNum}`);
      console.log(`✓ Issue #${issueNum} set to Status: Ready`);
    }
    
    console.log('\n✓ Done. Issues #3 and #9 are now Ready.');
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
