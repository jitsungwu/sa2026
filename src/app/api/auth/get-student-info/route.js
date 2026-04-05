import { db } from '../../../../firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

/**
 * POST /api/auth/get-student-info
 * 登入後獲取學生資訊
 * 
 * Request body:
 * { account: "413000001", classId: "demo" }
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

    // 驗證班級 ID
    if (!classId || classId.trim().length === 0) {
      return Response.json(
        { success: false, error: '班級代碼不能為空' },
        { status: 400 }
      )
    }

    // 查詢班級內的學生記錄
    const classStudentDocRef = doc(db, `classes/${classId}/students`, account)
    const classStudentSnap = await getDoc(classStudentDocRef)

    if (!classStudentSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號不存在或班級不符' },
        { status: 404 }
      )
    }

    const classStudentData = classStudentSnap.data()

    // 檢查該班級的座位選擇狀態
    const groupId = classStudentData.groupId
    const layoutDocRef = doc(db, `classes/${classId}/layout`, 'grid')
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
        name: classStudentData.name || '',
        groupId,
        classId,
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
