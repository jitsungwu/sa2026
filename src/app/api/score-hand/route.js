import { db } from '../../../firebaseClient'
import { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc } from '../../../lib/firestoreWrapper'

export async function POST(request) {
  try {
    const { classId, handId, points, givenBy } = await request.json()

    // Validation
    if (!classId || !handId || points === undefined || !givenBy) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (points < 0 || points > 3 || !Number.isInteger(points)) {
      return Response.json(
        { error: '分數必須為 0-3 之間的整數' },
        { status: 400 }
      )
    }

    // Get the hand document to verify group
    const handRef = doc(db, 'hands_raised', handId)
    const handSnap = await getDoc(handRef)

    if (!handSnap.exists()) {
      return Response.json(
        { error: '舉手記錄不存在' },
        { status: 404 }
      )
    }

    const handData = handSnap.data()

    // Get class to verify scorer
    const classRef = doc(db, 'classes', classId)
    const classSnap = await getDoc(classRef)

    if (!classSnap.exists()) {
      return Response.json(
        { error: '班級不存在' },
        { status: 404 }
      )
    }

    const classData = classSnap.data()

    // Check if givenBy is the current scorer
    if (classData.presentingScorerOwnerId !== givenBy) {
      return Response.json(
        { error: '非報告組組長' },
        { status: 403 }
      )
    }

    // Mark hand as resolved
    await updateDoc(handRef, {
      active: false,
      resolved: true,
      resolvedScore: points,
      resolvedBy: givenBy,
      resolvedAt: serverTimestamp()
    })

    // Add to participation_logs
    const logRef = await addDoc(collection(db, 'participation_logs'), {
      classId,
      group: handData.group,
      points,
      timestamp: serverTimestamp(),
      handRef: handId,
      givenBy,
      givenByRole: 'presenting_scorer'
    })

    return Response.json(
      { 
        success: true, 
        logId: logRef.id,
        message: '給分成功'
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Score hand error:', err)
    return Response.json(
      { error: err.message || '給分失敗' },
      { status: 500 }
    )
  }
}
