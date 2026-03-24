#!/usr/bin/env node

(async () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN not set');
    process.exit(1);
  }

  console.log('=== Token Type & Permissions Diagnostic ===\n');

  // Check token prefix
  console.log('Token prefix:', token.substring(0, 10) + '...');
  if (token.startsWith('ghp_')) {
    console.log('✓ Token prefix indicates CLASSIC PAT (ghp_)\n');
  } else if (token.startsWith('github_pat_')) {
    console.log('✗ Token prefix indicates FINE-GRAINED token (github_pat_)\n');
  } else {
    console.log('? Unknown token type\n');
  }

  // Test with /user REST endpoint (check if token is valid)
  console.log('Test 1: REST /user endpoint...');
  const res1 = await fetch('https://api.github.com/user', {
    method: 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  console.log('Status:', res1.status);
  if (res1.ok) {
    const user = await res1.json();
    console.log('User:', user.login);
  } else {
    const err = await res1.json();
    console.log('Error:', err.message);
  }

  // Test with /user/repos (classic token typically support this)
  console.log('\nTest 2: REST /user/repos endpoint...');
  const res2 = await fetch('https://api.github.com/user/repos?per_page=1', {
    method: 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  console.log('Status:', res2.status);
  if (res2.ok) {
    console.log('✓ Can access user repos (classic token feature)');
  } else {
    console.log('✗ Cannot access user repos');
  }

  // Test GraphQL to check if this token supports projects
  console.log('\nTest 3: GraphQL viewer.projectsV2 (requires project scope)...');
  const query = 'query { viewer { projectsV2(first: 1) { nodes { id title } } } }';
  const res3 = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  const data3 = await res3.json();
  if (data3.errors && data3.errors[0]?.message.includes('FORBIDDEN')) {
    console.log('✗ No project scope (FORBIDDEN)');
    console.log('  → Token needs "project" scope added');
  } else if (data3.data && data3.data.viewer) {
    console.log('✓ Has project scope access');
  } else {
    console.log('? Unexpected response:', data3);
  }

  // Test classic project access (REST API endpoint)
  console.log('\nTest 4: REST /user/projects (classic projects, deprecated but good indicator)...');
  const res4 = await fetch('https://api.github.com/user/projects', {
    method: 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  console.log('Status:', res4.status);
  if (res4.status === 410) {
    console.log('Note: Classic projects API deprecated (expected)');
  }

  console.log('\n=== RECOMMENDATION ===');
  if (!token.startsWith('ghp_')) {
    console.log('⚠️  Your token does NOT appear to be a Classic PAT.');
    console.log('Please regenerate with "Tokens (classic)" and ensure:');
    console.log('  1. Select scopes: repo, project, admin:org (if needed)');
    console.log('  2. Copy and set as GITHUB_TOKEN environment variable');
    console.log('  3. Run this diagnostic again to verify');
  } else {
    console.log('✓ Token appears to be Classic PAT format.');
    console.log('But it still lacks "project" scope (see Test 3).');
    console.log('Regenerate with "project" scope checked.');
  }
})();
