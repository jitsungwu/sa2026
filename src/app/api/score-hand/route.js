import { db } from '../../../firebaseClient'
import { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc, writeBatch, increment } from '../../../lib/firestoreWrapper'

export async function POST(request) {
  try {
    const { classId, handId, points, givenByOwnerId, givenByGroup } = await request.json()

    // Validation
    if (!classId || !handId || points === undefined || !givenByOwnerId || !givenByGroup) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(points) || points < 0) {
      return Response.json(
        { error: '分數必須為 0-15 之間的整數' },
        { status: 400 }
      )
    }

    // Get the hand document from sub-collection to verify group
    const handRef = doc(db, 'classes', classId, 'hands_raised', handId)
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

    // Check if givenByOwnerId is the current scorer
    if (classData.presentingScorerOwnerId !== givenByOwnerId) {
      return Response.json(
        { error: '非報告組組長' },
        { status: 403 }
      )
    }

    const maxPoints = handData.group === classData.priorityGroupId ? 15 : 3
    if (points > maxPoints) {
      return Response.json(
        { error: `分數必須為 0-${maxPoints} 之間的整數` },
        { status: 400 }
      )
    }

    // ✨ 優化：使用 Batch Write 原子操作
    // 同時更新：舉手記錄 + 審計日誌 + 積分快取
    const batch = writeBatch(db)

    // 1. 標記舉手為已處理
    batch.update(handRef, {
      active: false,
      resolved: true,
      resolvedScore: points,
      resolvedBy: givenByGroup,
      resolvedAt: serverTimestamp()
    })

    // 2. 寫入審計日誌到子集合
    const logRef = doc(
      collection(db, 'classes', classId, 'participation_logs'),
      `${Date.now()}-${Math.random().toString(36).substring(7)}`
    )
    batch.set(logRef, {
      group: handData.group,
      points,
      timestamp: serverTimestamp(),
      handRef: handId,
      givenBy: givenByGroup,
      givenByGroup,
      givenByOwnerId,
      givenByRole: 'presenting_scorer'
    })

    // 3. 更新積分快取 (classes.scores) ⚡ 關鍵改進
    batch.update(classRef, {
      [`scores.${handData.group}`]: increment(points),
      scoresLastUpdate: serverTimestamp()
    })

    await batch.commit()

    return Response.json(
      { 
        success: true, 
        logId: logRef.id,
        message: '給分成功',
        group: handData.group,
        points,
        givenBy: givenByGroup
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
