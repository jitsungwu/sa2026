const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.resolve('.env.local') }); } catch (e) {}
const fetch = global.fetch || require('node-fetch');

const OWNER = process.env.PROJECT_OWNER || 'jitsungwu';
const REPO = process.env.PROJECT_NAME || 'sa2026';
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
  if (!res.ok || data.errors) {
    throw new Error(JSON.stringify(data.errors || data, null, 2));
  }
  return data.data;
}

async function fetchProjectItems() {
  // Query the entire project with all field values properly typed
  const q = `query($owner:String!, $repo:String!, $number:Int!) {
    repository(owner: $owner, name: $repo) {
      projectV2(number: $number) {
        id
        title
        items(first: 100) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            content {
              __typename
              ... on Issue {
                number
                title
                body
                url
                state
                labels(first: 20) {
                  nodes {
                    name
                  }
                }
              }
            }
            fieldValues(first: 50) {
              nodes {
                __typename
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                }
                ... on ProjectV2ItemFieldIterationValue {
                  title
                  id
                }
                ... on ProjectV2ItemFieldTextValue {
                  text
                }
              }
            }
          }
        }
      }
    }
  }`;

  try {
    const data = await gql(q, { owner: OWNER, repo: REPO, number: 2 });
    return data.repository?.projectV2?.items?.nodes || [];
  } catch (e) {
    console.error('Query failed:', e.message);
    throw e;
  }
}

(async () => {
  try {
    console.log('Fetching ProjectV2 items and field values...');
    const items = await fetchProjectItems();
    console.log('Fetched', items.length, 'items');

    const matched = [];
    
    for (const item of items) {
      if (!item.content || item.content.__typename !== 'Issue') continue;
      
      const fieldVals = item.fieldValues?.nodes || [];
      let hasIteration2 = false;
      
      // Check if this item has Iteration 2
      for (const fv of fieldVals) {
        // If it's an iteration field value, check its title
        if (fv.__typename === 'ProjectV2ItemFieldIterationValue') {
          if (fv.title && fv.title.includes('Iteration 2')) {
            hasIteration2 = true;
            break;
          }
        }
      }
      
      if (hasIteration2) {
        matched.push(item.content);
      }
    }

    console.log('Found', matched.length, 'issues with Iteration 2');

    const outPath = path.resolve('.github/SPRINT_2.md');
    let out = `# Sprint 2 — Issues in Project Iteration = Iteration 2\n\n`;
    
    if (matched.length === 0) {
      out += '_No issues found where Project Iteration == Iteration 2._\n';
    } else {
      for (const issue of matched) {
        const labels = issue.labels?.nodes?.map(l => l.name).join(', ') || '-';
        out += `### Issue #${issue.number}: ${issue.title}\n`;
        out += `- State: ${issue.state}\n`;
        out += `- Labels: ${labels}\n`;
        out += `- URL: ${issue.url}\n\n`;
        if (issue.body) {
          out += issue.body.split('\n').slice(0, 20).join('\n') + '\n\n';
        }
      }
    }
    
    fs.writeFileSync(outPath, out, 'utf8');
    console.log(`✓ Wrote ${outPath} with ${matched.length} issues`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
