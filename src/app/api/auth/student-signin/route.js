import { db } from '../../../../firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

/**
 * POST /api/auth/student-signin
 * 驗證學生帳號及密碼，檢查是否屬於指定班級
 * 
 * Request body:
 * { account: "123456789", password: "12345678", classId: "demo" }
 * 
 * Response:
 * { success: true, student: { account, name, groupId, classId, seatSelected } }
 * or
 * { success: false, error: "錯誤訊息" }
 */

export async function POST(request) {
  try {
    const { account, password, classId } = await request.json()

    // 驗證帳號格式
    if (!account || account.trim().length === 0) {
      return Response.json(
        { success: false, error: '帳號不能為空' },
        { status: 400 }
      )
    }

    // 驗證密碼
    if (!password || password.length < 6) {
      return Response.json(
        { success: false, error: '密碼格式不正確' },
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

    // 1. 查詢全域 students/{account} 文檔
    const studentDocRef = doc(db, 'students', account)
    const studentDocSnap = await getDoc(studentDocRef)

    if (!studentDocSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號或密碼錯誤' },
        { status: 401 }
      )
    }

    const studentData = studentDocSnap.data()

    // 2. 驗證密碼
    // WARNING: 生產環境應使用加密比對，此為簡易實作
    if (studentData.password !== password) {
      return Response.json(
        { success: false, error: '帳號或密碼錯誤' },
        { status: 401 }
      )
    }

    // 3. 查詢班級內的學生記錄確保帳號屬於該班級
    const classStudentDocRef = doc(db, `classes/${classId}/students`, account)
    const classStudentSnap = await getDoc(classStudentDocRef)

    if (!classStudentSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號不存在或班級不符' },
        { status: 404 }
      )
    }

    const classStudentData = classStudentSnap.data()

    // 4. 檢查該班級的座位選擇狀態
    // 如果該組已選座位，則返回座位資訊；否則返回需要選座位的信號
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
        name: studentData.name || classStudentData.name,
        major: studentData.major || classStudentData.major,
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
