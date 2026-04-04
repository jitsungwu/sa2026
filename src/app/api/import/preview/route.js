import { NextResponse } from 'next/server'
import { parsePreview } from '../../../../../src/lib/xlsImporter.js'
import { db } from '../../../../../src/firebaseClient.js'
import { collection, getDocs } from 'firebase/firestore'

export async function POST(req) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { classId, rows } = body
  if (!rows || !Array.isArray(rows)) return NextResponse.json({ error: 'Missing rows array' }, { status: 400 })

  let existingAccounts = new Set()
  try {
    if (db && classId) {
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

  const result = parsePreview(rows, existingAccounts)
  return NextResponse.json({ status: 'ok', ...result })
}
