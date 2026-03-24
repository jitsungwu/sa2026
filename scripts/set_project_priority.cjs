const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
const PROJECT_NUMBER = 2;
const PROJECT_ID = 'PVT_kwHOALmg9s4BScZQ';
const PRIORITY_FIELD_ID = 'PVTSSF_lAHOALmg9s4BScZQzg_-eYA';
const P0_OPTION_ID = '79628723';

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

async function updateProjectItemPriority(itemId, issueName) {
  const mutation = `
    mutation {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: "${PROJECT_ID}"
          itemId: "${itemId}"
          fieldId: "${PRIORITY_FIELD_ID}"
          value: { singleSelectOptionId: "${P0_OPTION_ID}" }
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
    
    console.log(`\nFound ${itemMap.size} issues in project\n`);
    
    const priorityIssues = [3, 9];
    for (const issueNum of priorityIssues) {
      const itemId = itemMap.get(issueNum);
      if (!itemId) {
        console.log(`✗ Issue #${issueNum} not found in project`);
        continue;
      }
      
      await updateProjectItemPriority(itemId, `#${issueNum}`);
      console.log(`✓ Issue #${issueNum} set to Priority P0`);
    }
    
    console.log('\n✓ Done. Issues #3 and #9 are now P0 priority in GitHub Project.');
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
