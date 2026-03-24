#!/usr/bin/env node

(async () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN not set');
    process.exit(1);
  }

  console.log('=== Token Diagnostic ===\n');

  // Test 1: Check viewer via GraphQL
  console.log('Test 1: GraphQL viewer...');
  const query1 = 'query { viewer { login name } }';
  const res1 = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: query1 })
  });
  const data1 = await res1.json();
  console.log('Viewer:', data1);

  // Test 2: Check REST API access to user projects (classic API)
  console.log('\nTest 2: REST API user projects access...');
  const res2 = await fetch('https://api.github.com/user/projects', {
    method: 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  console.log('Status:', res2.status);
  const data2 = await res2.json();
  console.log('Response:', JSON.stringify(data2, null, 2));

  // Test 3: Try GraphQL to get Projects v2
  console.log('\nTest 3: GraphQL Projects v2 access (user level)...');
  const query3 = 'query { viewer { projectsV2(first: 1) { nodes { id title } } } }';
  const res3 = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: query3 })
  });
  const data3 = await res3.json();
  console.log('ProjectsV2:', data3);
})();
