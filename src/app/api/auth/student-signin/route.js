import { db } from '../../../../firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

/**
 * POST /api/auth/student-signin
 * 驗證學生帳號是否屬於指定班級、檢查座位選擇狀態
 * 
 * 注意：password 驗證由 Firebase Authentication 處理，此 API 只驗證班級成員
 * 
 * Request body:
 * { account: "123456789", classId: "demo" }
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

    // 1. 查詢班級內的學生記錄確保帳號屬於該班級
    const classStudentDocRef = doc(db, `classes/${classId}/students`, account)
    const classStudentSnap = await getDoc(classStudentDocRef)

    if (!classStudentSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號不存在或班級不符' },
        { status: 404 }
      )
    }

    const classStudentData = classStudentSnap.data()

    // 2. 檢查全域 students 文檔
    const studentDocRef = doc(db, 'students', account)
    const studentDocSnap = await getDoc(studentDocRef)
    const studentData = studentDocSnap.exists() ? studentDocSnap.data() : {}

    // 3. 檢查該班級的座位選擇狀態
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
        name: classStudentData.name || studentData.name || '',
        major: classStudentData.major || studentData.major || '',
        groupId,
        classId,
        seatSelected
      }
    })
  } catch (error) {
    console.error('Student signin error:', error)
    return Response.json(
      { success: false, error: error.message || '登入驗證失敗' },
      { status: 500 }
    )
  }
}
