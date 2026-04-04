import fs from 'fs'

async function run() {
  console.log('Testing import preview/commit routes via direct call')

  const previewModule = await import('../src/app/api/import/preview/route.js')
  const commitModule = await import('../src/app/api/import/commit/route.js')

  const sampleRows = [
    { A: '01', E: '2', B: '', D: '', row: 1 },
    { A: '123456789', B: '張三', D: '資管系', row: 2 },
    { A: '987654321', B: '李四', D: '資管系', row: 3 }
  ]

  const reqInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ classId: 'demo', rows: sampleRows })
  }

  // Node's global Request is available in newer Node versions
  const { Request } = globalThis
  if (typeof Request === 'undefined') {
    console.error('Global Request is not available in this Node runtime. Use Node 18+ or polyfill.')
    process.exit(1)
  }

  console.log('\nCalling preview route...')
  const previewResp = await previewModule.POST(new Request('http://localhost/api/import/preview', reqInit))
  const previewJson = await previewResp.json()
  console.log('Preview response:')
  console.log(JSON.stringify(previewJson, null, 2))

  console.log('\nCalling commit route...')
  const commitResp = await commitModule.POST(new Request('http://localhost/api/import/commit', reqInit))
  const commitJson = await commitResp.json()
  console.log('Commit response:')
  console.log(JSON.stringify(commitJson, null, 2))
}

run().catch(err => {
  console.error('Test script failed:', err)
  process.exit(2)
})
