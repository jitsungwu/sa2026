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
    console.error('GraphQL errors:', data.errors);
    throw new Error(JSON.stringify(data.errors || data, null, 2));
  }
  return data.data;
}

async function getIterationField() {
  // Get the Iteration field ID and its available iterations
  const q = `query($owner:String!, $repo:String!) {
    repository(owner:$owner, name:$repo) {
      projectsV2(first: 5) {
        nodes {
          fields(first: 50) {
            nodes {
              __typename
              ... on ProjectV2IterationField {
                id
                name
                configuration {
                  iterations {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;
  
  const data = await gql(q, { owner: OWNER, repo: REPO });
  const projects = data.repository?.projectsV2?.nodes || [];
  
  for (const proj of projects) {
    for (const field of proj.fields?.nodes || []) {
      if (field.__typename === 'ProjectV2IterationField' && field.name === 'Iteration') {
        return field;
      }
    }
  }
  return null;
}

async function searchIssuesWithLabel(label) {
  // Simple REST API search for issues with a label
  const url = `https://api.github.com/search/issues?q=repo:${OWNER}/${REPO}+label:"${label}"+type:issue&per_page=100`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

async function getIssuesByProjectIteration() {
  // Use GraphQL to find issues assigned to Iteration 2
  const q = `query($owner:String!, $repo:String!) {
    repository(owner:$owner, name:$repo) {
      issues(first: 100, states: OPEN) {
        nodes {
          number
          title
          body
          state
          labels(first: 10) {
            nodes {
              name
            }
          }
        }
      }
    }
  }`;
  
  const data = await gql(q, { owner: OWNER, repo: REPO });
  return data.repository?.issues?.nodes || [];
}

(async () => {
  try {
    console.log('Fetching issues with sprint2 label...');
    const result = await searchIssuesWithLabel('sprint2');
    const issues = result.items || [];
    
    if (issues.length === 0) {
      console.log('No issues with sprint2 label found, trying all open issues...');
      const allIssues = await getIssuesByProjectIteration();
      console.log('Found', allIssues.length, 'open issues');
      
      // Write with all issues for now
      const outPath = path.resolve('.github/SPRINT_2.md');
      let out = `# Sprint 2 — Issues in Project\n\n`;
      out += `Fetched ${allIssues.length} open issues\n\n`;
      
      for (const issue of allIssues.slice(0, 20)) {
        const labels = issue.labels?.nodes?.map(l => l.name).join(', ') || '-';
        out += `### Issue #${issue.number}: ${issue.title}\n- State: ${issue.state}\n- Labels: ${labels}\n\n`;
        if (issue.body) {
          out += issue.body.split('\n').slice(0, 15).join('\n') + '\n\n';
        }
      }
      
      fs.writeFileSync(outPath, out, 'utf8');
      console.log(`Wrote ${outPath} with ${Math.min(allIssues.length, 20)} issues`);
    } else {
      console.log('Found', issues.length, 'issues with sprint2 label');
      
      const outPath = path.resolve('.github/SPRINT_2.md');
      let out = `# Sprint 2 — Issues with sprint2 Label\n\n`;
      out += `Found ${issues.length} issues\n\n`;
      
      for (const issue of issues) {
        const labels = issue.labels?.map(l => l.name).join(', ') || '-';
        out += `### Issue #${issue.number}: ${issue.title}\n- State: ${issue.state}\n- URL: ${issue.html_url}\n- Labels: ${labels}\n\n`;
        if (issue.body) {
          out += issue.body.split('\n').slice(0, 15).join('\n') + '\n\n';
        }
      }
      
      fs.writeFileSync(outPath, out, 'utf8');
      console.log(`Wrote ${outPath} with ${issues.length} issues`);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
