import { NextResponse } from 'next/server'
import { parsePreview } from '../../../../../src/lib/xlsImporter.js'
import { db } from '../../../../../src/firebaseClient.js'
import { doc, writeBatch, getDoc } from 'firebase/firestore'

export async function POST(req) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { classId, rows } = body
  if (!rows || !Array.isArray(rows) || !classId) return NextResponse.json({ error: 'Missing classId or rows' }, { status: 400 })

  // Check existence via global `students/{account}` docs for efficiency
  let existingAccounts = new Set()
  try {
    if (db) {
      const candidates = Array.from(new Set((rows || []).map(r => (r.A || '').toString().trim()).filter(a => /^\d{9}$/.test(a))))
      const checks = candidates.map(async (acc) => {
        try {
          const sref = doc(db, 'students', acc)
          const snap = await getDoc(sref)
          if (snap && snap.exists && snap.exists()) existingAccounts.add(acc)
        } catch (e) {
          // ignore per-account failures
        }
      })
      await Promise.all(checks)
    }
  } catch (e) {
    console.warn('Failed to query existing global students:', e)
  }

  const preview = parsePreview(rows, existingAccounts)
  if (preview.errors && preview.errors.length > 0) {
    return NextResponse.json({ status: 'error', code: 'IMPORT_VALIDATION_FAILED', errors: preview.errors }, { status: 400 })
  }

  if (!db) return NextResponse.json({ error: 'Firestore not initialized on server' }, { status: 500 })

  const batch = writeBatch(db)
  try {
    for (const g of preview.groups) {
      for (const s of g.students) {
        const studentRef = doc(db, 'students', s.account)
        // write student doc with classId and groupId for lookup
        batch.set(studentRef, { account: s.account, name: s.name, major: s.major, classId, groupId: g.groupId })
      }
    }
    await batch.commit()
    return NextResponse.json({ status: 'ok', importedGroups: preview.groups.length, importedStudents: preview.groups.reduce((acc, g) => acc + g.parsedCount, 0) })
  } catch (e) {
    console.error('Import commit failed:', e)
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 })
  }
}
