import { db } from '../../../../firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

/**
 * POST /api/auth/get-student-info
 * 登入後獲取學生資訊（自動偵測班級）
 * 
 * Request body:
 * { account: "413000001" }
 * 
 * Response:
 * { success: true, student: { account, name, groupId, classId, seatSelected } }
 * or
 * { success: false, error: "錯誤訊息" }
 */

export async function POST(request) {
  try {
    const { account, classId } = await request.json()

    // 驗證帳號格式
    if (!account || account.trim().length === 0) {
      return Response.json(
        { success: false, error: '帳號不能為空' },
        { status: 400 }
      )
    }

    // 查詢全域 students 文檔（不需要 classId，系統自動檢測）
    const studentDocRef = doc(db, 'students', account)
    const studentDocSnap = await getDoc(studentDocRef)

    if (!studentDocSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號不存在' },
        { status: 404 }
      )
    }

    const studentData = studentDocSnap.data()
    const detectedClassId = studentData.classId
    const groupId = studentData.groupId

    // 如果提供了 classId，驗證班級是否相符
    if (classId && detectedClassId !== classId) {
      return Response.json(
        { success: false, error: '帳號不存在或班級不符' },
        { status: 404 }
      )
    }

    // 檢查該班級的座位選擇狀態
    const layoutDocRef = doc(db, `classes/${detectedClassId}/layout`, 'grid')
    const layoutSnap = await getDoc(layoutDocRef)

    let seatSelected = false
    if (layoutSnap.exists()) {
      const layoutData = layoutSnap.data()
      seatSelected = Object.values(layoutData || {}).some(
        row => Object.values(row || {}).some(seat => seat === groupId)
      )
    }

    return Response.json({
      success: true,
      student: {
        account,
        name: studentData.name || '',
        major: studentData.major || '',
        groupId,
        classId: detectedClassId,
        seatSelected
      }
    })
  } catch (error) {
    console.error('Get student info error:', error)
    return Response.json(
      { success: false, error: error.message || '無法獲取學生資訊' },
      { status: 500 }
    )
  }
}
