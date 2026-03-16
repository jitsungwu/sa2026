const { spawn } = require('child_process')
const net = require('net')
const path = require('path')

function waitForPort(port, host = '127.0.0.1', timeout = 120000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      const sock = new net.Socket()
      sock.setTimeout(1000)
      sock.once('error', () => {
        sock.destroy()
        if (Date.now() - start > timeout) return reject(new Error(`Timeout waiting for ${host}:${port}`))
        setTimeout(check, 500)
      })
      sock.once('timeout', () => {
        sock.destroy()
        if (Date.now() - start > timeout) return reject(new Error(`Timeout waiting for ${host}:${port}`))
        setTimeout(check, 500)
      })
      sock.connect(port, host, () => {
        sock.end()
        resolve()
      })
    }
    check()
  })
}

async function main() {
  console.log('Starting Firebase emulators...')
  const emu = spawn('npx', ['-y', 'firebase-tools@latest', 'emulators:start', '--only', 'firestore,auth'], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: path.resolve(__dirname, '..')
  })

  emu.stdout.on('data', (d) => process.stdout.write(`[emu] ${d}`))
  emu.stderr.on('data', (d) => process.stderr.write(`[emu] ${d}`))

  try {
    // Wait for common emulator ports to be available
    await waitForPort(process.env.FIRESTORE_EMULATOR_PORT || 8080, process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1', 120000)
    await waitForPort(9099, '127.0.0.1', 120000)
  } catch (e) {
    console.error('Emulator did not start in time:', e)
    emu.kill()
    process.exit(1)
  }

  console.log('Emulators ready — seeding test data...')
  const seed = spawn('npm', ['run', 'emulators:seed'], { shell: true, stdio: 'inherit' })
  const seedCode = await new Promise((res) => seed.on('close', res))
  if (seedCode !== 0) {
    console.error('Seeding failed with code', seedCode)
    emu.kill()
    process.exit(seedCode)
  }

  console.log('Running Playwright E2E tests...')
  const e2e = spawn('npx', ['playwright', 'test'], { shell: true, stdio: 'inherit' })
  const e2eCode = await new Promise((res) => e2e.on('close', res))

  console.log('E2E finished. Shutting down emulators...')
  try { emu.kill() } catch (e) { console.warn('Failed to kill emulator process:', e) }

  process.exit(e2eCode)
}

main().catch(err => {
  console.error('run-e2e-with-emulator error:', err)
  process.exit(1)
})
