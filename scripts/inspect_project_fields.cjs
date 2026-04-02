const fetch = global.fetch || require('node-fetch');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
const OWNER = 'jitsungwu';
const REPO = 'sa2026';
const PROJECT_NUMBER = 2;

async function inspect() {
  const query = `
    query {
      repository(owner: "${OWNER}", name: "${REPO}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          title
          fields(first:50) {
            nodes {
              __typename
              ... on ProjectV2SingleSelectField { id name options { id name } }
              ... on ProjectV2IterationField { id name }
              ... on ProjectV2Field { id name }
            }
          }
        }
      }
    }
  `;
  const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `token ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  const project = data.data.repository.projectV2;
  console.log('Project:', project.title, project.id);
  project.fields.nodes.forEach(f => {
    console.log('---');
    console.log('typename:', f.__typename);
    console.log('name:', f.name || '(no name)');
    console.log('id:', f.id);
    if (f.options) f.options.forEach(o => console.log('  option:', o.name, o.id));
  });
}

inspect().catch(e=>{ console.error(e); process.exit(1); });
