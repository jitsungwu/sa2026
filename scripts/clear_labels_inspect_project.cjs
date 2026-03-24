const fetch = global.fetch || require('node-fetch');

const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const GITHUB = process.env.GITHUB_TOKEN;
const PROJECT_NUMBER = 2;

if (!GITHUB) {
  console.error('GITHUB_TOKEN not set in environment');
  process.exit(1);
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

async function getIssues() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=100`;
  const res = await fetch(url, { headers: { Authorization: `token ${GITHUB}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`Failed to fetch issues: ${res.status}`);
  return res.json();
}

async function getProjectInfo() {
  const query = `
    query {
      repository(owner: "${OWNER}", name: "${REPO}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          title
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2IterationField {
                id
                name
              }
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

(async () => {
  try {
    console.log('Step 1: Clearing all labels from 12 issues...');
    const issues = await getIssues();
    for (const it of issues) {
      if (it.pull_request) continue;
      await patchIssue(it.number, []);
      console.log(`  ✓ #${it.number} labels cleared`);
    }
    
    console.log('\nStep 2: Fetching Project (v2) fields...');
    const project = await getProjectInfo();
    console.log(`\nProject: "${project.title}"`);
    console.log(`Project ID: ${project.id}`);
    console.log('\nAvailable Fields:');
    
    const priorityField = project.fields.nodes.find(f => f.name.toLowerCase().includes('priority'));
    
    project.fields.nodes.forEach(field => {
      const marker = field === priorityField ? ' ← PRIORITY' : '';
      if (field.options) {
        console.log(`\n  📋 ${field.name} (${field.id})${marker}`);
        field.options.forEach(opt => console.log(`     • ${opt.name} (${opt.id})`));
      } else {
        console.log(`  📌 ${field.name} (${field.id})${marker}`);
      }
    });
    
    if (priorityField && priorityField.options) {
      console.log(`\n✓ Priority field found: "${priorityField.name}"`);
      console.log('Next: Update #3 and #9 with highest priority option');
    } else {
      console.log('\n⚠ No Priority field found in Project. Create one in GitHub Project settings first.');
    }
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
