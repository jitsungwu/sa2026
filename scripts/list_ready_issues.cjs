const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
const PROJECT_NUMBER = 2;
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
                  body
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    field {
                      ... on ProjectV2SingleSelectField {
                        name
                      }
                    }
                    name
                  }
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

(async () => {
  try {
    console.log('Fetching Project items and their statuses...\n');
    const items = await getProjectItems();
    
    const readyItems = items.filter(item => {
      if (!item.content || item.content.number === undefined) return false;
      
      const statusField = item.fieldValues.nodes.find(fv => 
        fv.field && fv.field.name === 'Status'
      );
      
      return statusField && statusField.name === 'Ready';
    });
    
    console.log(`=== Ready User Stories (${readyItems.length}) ===\n`);
    
    if (readyItems.length === 0) {
      console.log('(None)');
    } else {
      readyItems.forEach((item, idx) => {
        console.log(`${idx + 1}. #${item.content.number} - ${item.content.title}`);
        console.log(`   URL: https://github.com/${OWNER}/${REPO}/issues/${item.content.number}`);
        console.log();
      });
    }
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
