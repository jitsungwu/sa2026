const fetch = global.fetch || require('node-fetch');
// load local env (e.g. .env.local) so the script can read GITHUB_TOKEN
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv is optional; if not installed, the script will still check process.env
}

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
          id
          fields(first: 20) {
            nodes {
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
                        id
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
  return data.data.repository.projectV2;
}

async function searchMergedPRsReferencingIssue(issueNumber) {
  const query = `
    query {
      search(query: "repo:${OWNER}/${REPO} is:pr is:merged #${issueNumber}", type: ISSUE, first: 10) {
        nodes {
          ... on PullRequest {
            number
            mergedAt
            url
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

  if (!res.ok) throw new Error(`GraphQL search failed: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL search errors: ${JSON.stringify(data.errors)}`);
  const nodes = data.data.search.nodes || [];
  return nodes.filter(n => n.mergedAt);
}

async function updateProjectItemStatus(projectId, itemId, fieldId, optionId) {
  const mutation = `
    mutation($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        projectV2Item {
          id
        }
      }
    }
  `;

  const variables = {
    input: {
      projectId,
      itemId,
      fieldId,
      value: { singleSelectOptionId: optionId },
    },
  };

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `token ${GITHUB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!res.ok) throw new Error(`GraphQL update failed: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL update errors: ${JSON.stringify(data.errors)}`);
  return data;
}

(async () => {
  try {
    console.log('Fetching Project items, fields, and their statuses...\n');
    const project = await getProjectItems();

    const projectFields = project.fields.nodes;
    const items = project.items.nodes;
    const projectId = project.id;

    // find Status field and option ids
    const statusField = projectFields.find(f => f.name === 'Status');
    if (!statusField) throw new Error('Status field not found in project');
    const optionMap = {};
    statusField.options.forEach(o => { optionMap[o.name] = o.id; });

    const readyItems = items.filter(item => {
      if (!item.content || item.content.number === undefined) return false;
      const sf = item.fieldValues.nodes.find(fv => fv.field && fv.field.name === 'Status');
      return sf && sf.name === 'Ready';
    });

    console.log(`=== Ready User Stories (${readyItems.length}) ===\n`);

    if (readyItems.length === 0) {
      console.log('(None)');
    } else {
      for (let idx = 0; idx < readyItems.length; idx++) {
        const item = readyItems[idx];
        const issueNumber = item.content.number;
        console.log(`${idx + 1}. #${issueNumber} - ${item.content.title}`);
        console.log(`   URL: https://github.com/${OWNER}/${REPO}/issues/${issueNumber}`);

        // determine if there's a merged PR referencing the issue
        const mergedPRs = await searchMergedPRsReferencingIssue(issueNumber);
        const newStatusName = mergedPRs.length > 0 ? 'In review' : 'In progress';

        // current status field id/value
        const currentStatus = item.fieldValues.nodes.find(fv => fv.field && fv.field.name === 'Status');
        const currentStatusName = currentStatus ? currentStatus.name : null;

        console.log(`   Detected merged PRs: ${mergedPRs.length}`);

        if (currentStatusName === newStatusName) {
          console.log(`   Status already '${newStatusName}', skipping update.`);
        } else {
          const fieldId = statusField.id;
          const optionId = optionMap[newStatusName];
          if (!optionId) {
            console.log(`   Option '${newStatusName}' not found in Status field — skipping update.`);
          } else {
            try {
              await updateProjectItemStatus(projectId, item.id, fieldId, optionId);
              console.log(`   Updated Status -> '${newStatusName}'.`);
            } catch (e) {
              console.log(`   Failed to update status: ${e.message}`);
            }
          }
        }

        console.log();
      }
    }
    // If FORCE_MARK_IN_REVIEW is provided, force-update listed issue numbers to 'In review'
    const forceList = process.env.FORCE_MARK_IN_REVIEW
    if (forceList) {
      const nums = forceList.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean)
      if (nums.length > 0) {
        console.log('\nForcing In review for issues:', nums.join(','))
        for (const num of nums) {
          const item = items.find(it => it.content && it.content.number === num)
          if (!item) {
            console.log(` Issue #${num} not found in project items`) ; continue
          }
          const current = item.fieldValues.nodes.find(fv => fv.field && fv.field.name === 'Status')
          const currentName = current ? current.name : null
          if (currentName === 'In review') { console.log(` Issue #${num} already In review`); continue }
          const optionId = optionMap['In review']
          if (!optionId) { console.log("Option 'In review' not found on Status field"); break }
          try {
            await updateProjectItemStatus(projectId, item.id, statusField.id, optionId)
            console.log(` Issue #${num} -> In review`)
          } catch (e) {
            console.log(` Failed to update #${num}: ${e.message}`)
          }
        }
      }
    }
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
