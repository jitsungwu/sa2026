const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
const PROJECT_NUMBER = 2;

if (!GITHUB) {
  console.error('GITHUB_TOKEN not set in environment');
  process.exit(1);
}

async function getIssues() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=100`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Failed to fetch issues: ${res.status}`);
  return res.json();
}

async function patchIssue(number, labels) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${number}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels }),
  });
  if (!res.ok) throw new Error(`PATCH issue ${number} failed: ${res.status}`);
  return res.json();
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
              fieldValues(first: 20) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    field {
                      name
                    }
                    name
                  }
                }
              }
            }
          }
          fields(first: 20) {
            nodes {
              __typename
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
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
  return data.data.repository.projectV2;
}

async function updateProjectItemField(itemId, fieldId, optionId) {
  const mutation = `
    mutation {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: "PVT_kwHOALmg9s4BScZQ"
          itemId: "${itemId}"
          fieldId: "${fieldId}"
          value: { singleSelectOptionId: "${optionId}" }
        }
      ) {
        clientMutationId
      }
    }
  `;
  
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutation }),
  });
  
  if (!res.ok) throw new Error(`GraphQL mutation failed: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  return data;
}

(async () => {
  try {
    console.log('Step 1: Clearing all labels from issues...');
    const issues = await getIssues();
    for (const it of issues) {
      if (it.pull_request) continue;
      await patchIssue(it.number, []);
      console.log(`  ✓ Cleared labels from #${it.number}`);
    }
    
    console.log('\nStep 2: Fetching Project (v2) fields and items...');
    const project = await getProjectItems();
    
    console.log('Project fields:');
    project.fields.nodes.forEach(field => {
      if (field.__typename === 'ProjectV2SingleSelectField') {
        console.log(`  - ${field.name} (ID: ${field.id})`);
        field.options.forEach(opt => console.log(`    • ${opt.name} (${opt.id})`));
      }
    });
    
    console.log('\nProject items:');
    const priorityMap = new Map();
    project.items.nodes.forEach(item => {
      if (item.content && item.content.number !== undefined) {
        priorityMap.set(item.content.number, { itemId: item.id, title: item.content.title });
        console.log(`  #${item.content.number}: ${item.content.title}`);
      }
    });
    
    console.log('\n✓ To set priority via Project fields, provide the Priority field ID and option IDs.');
    console.log('  Example: Call updateProjectItemField() with priorityMap and field details.');
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
