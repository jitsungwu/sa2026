;(async () => {
  try {
    const payload = {
      classId: 'demo',
      rows: [
        { A: '01', E: '2', row: 1 },
        { A: '123456789', B: 'Zhang', D: 'Dept', row: 2 },
        { A: '987654321', B: 'Li', D: 'Dept', row: 3 }
      ]
    }

    console.log('POST /api/import/preview')
    let r = await fetch('http://localhost:3000/api/import/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    console.log('status', r.status)
    console.log(await r.text())

    console.log('\nPOST /api/import/commit')
    r = await fetch('http://localhost:3000/api/import/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    console.log('status', r.status)
    console.log(await r.text())
  } catch (e) {
    console.error('Request failed:', e)
    process.exit(1)
  }
})()
