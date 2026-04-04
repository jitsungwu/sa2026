import { NextResponse } from 'next/server'
import { parsePreview } from '../../../../../src/lib/xlsImporter.js'
import { db } from '../../../../../src/firebaseClient.js'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'

export async function POST(req) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { classId, rows } = body
  if (!rows || !Array.isArray(rows)) return NextResponse.json({ error: 'Missing rows array' }, { status: 400 })

  // Efficient existence check via global `students/{account}` documents
  let existingAccounts = new Set()
  try {
    if (db) {
      // collect candidate account ids from rows (9-digit accounts only)
      const candidates = Array.from(new Set((rows || []).map(r => (r.A || '').toString().trim()).filter(a => /^\d{9}$/.test(a))))
      const checks = candidates.map(async (acc) => {
        try {
          const dref = doc(db, 'students', acc)
          const snap = await getDoc(dref)
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

  const result = parsePreview(rows, existingAccounts)
  return NextResponse.json({ status: 'ok', ...result })
}
