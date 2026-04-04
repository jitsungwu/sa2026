import { NextResponse } from 'next/server'
import { parsePreview } from '../../../../../src/lib/xlsImporter.js'
import { db } from '../../../../../src/firebaseClient.js'
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore'

export async function POST(req) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { classId, rows } = body
  if (!rows || !Array.isArray(rows) || !classId) return NextResponse.json({ error: 'Missing classId or rows' }, { status: 400 })

  let existingAccounts = new Set()
  try {
    if (db) {
      const colRef = collection(db, 'classes', classId, 'students')
      const snap = await getDocs(colRef)
      snap.forEach(d => {
        const data = d.data()
        if (data && data.account) existingAccounts.add(String(data.account))
        if (data && data.studentId) existingAccounts.add(String(data.studentId))
      })
    }
  } catch (e) {
    console.warn('Failed to query existing accounts:', e)
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
        const ref = doc(db, 'classes', classId, 'students', s.account)
        batch.set(ref, { account: s.account, name: s.name, major: s.major, groupId: g.groupId })
      }
    }
    await batch.commit()
    return NextResponse.json({ status: 'ok', importedGroups: preview.groups.length, importedStudents: preview.groups.reduce((acc, g) => acc + g.parsedCount, 0) })
  } catch (e) {
    console.error('Import commit failed:', e)
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 })
  }
}
