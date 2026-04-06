import { db } from '../../../../../firebaseClient'
import { doc, getDoc, runTransaction } from 'firebase/firestore'

/**
 * POST /api/class/reserve-seat
 * Body: { classId, groupId, row, col, idempotencyToken? }
 */
export async function POST(request) {
  try {
    const { classId, groupId, row, col } = await request.json()

    if (!classId || !groupId) {
      return Response.json({ success: false, error: 'classId/groupId required' }, { status: 400 })
    }

    const r = parseInt(row, 10)
    const c = parseInt(col, 10)
    if (Number.isNaN(r) || Number.isNaN(c)) {
      return Response.json({ success: false, error: 'row/col must be numbers' }, { status: 400 })
    }

    const layoutDocRef = doc(db, `classes/${classId}/layout`, 'grid')

    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(layoutDocRef)
      const layout = snap.exists() ? snap.data() : {}

      // Check if this coordinate is already taken
      const rowObj = layout[r] || {}
      const existing = rowObj[c]
      if (existing && existing !== groupId) {
        return { success: false, conflict: true, occupiedBy: existing }
      }

      // Check if this group already has a seat
      for (const rr of Object.keys(layout)) {
        const cols = layout[rr] || {}
        for (const cc of Object.keys(cols)) {
          if (cols[cc] === groupId) {
            return { success: true, alreadySet: true, seat: { row: parseInt(rr, 10), col: parseInt(cc, 10) } }
          }
        }
      }

      // Reserve the seat
      const newRow = { ...(layout[r] || {}) }
      newRow[c] = groupId
      const newLayout = { ...(layout || {}) }
      newLayout[r] = newRow

      tx.set(layoutDocRef, newLayout, { merge: true })

      return { success: true, seat: { row: r, col: c } }
    })

    if (!result.success) {
      if (result.conflict) {
        return Response.json({ success: false, error: '座位已被佔用', occupiedBy: result.occupiedBy }, { status: 409 })
      }
      return Response.json({ success: false, error: '無法預約座位' }, { status: 400 })
    }

    return Response.json({ success: true, seat: result.seat })
  } catch (error) {
    console.error('Reserve seat error:', error)
    return Response.json({ success: false, error: error.message || 'reserve seat failed' }, { status: 500 })
  }
}
