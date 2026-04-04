import { db } from '../../../../firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

/**
 * POST /api/auth/student-signin
 * 驗證學生帳號（9位數字學號）是否存在於指定班級
 * 
 * Request body:
 * { account: "123456789", classId: "class-A" }
 * 
 * Response:
 * { success: true, student: { account, name, major, groupId } }
 * or
 * { success: false, error: "帳號不存在或班級不符" }
 */

export async function POST(request) {
  try {
    const { account, classId } = await request.json()

    // 驗證帳號格式
    if (!account || !/^\d{9}$/.test(account)) {
      return Response.json(
        { success: false, error: '帳號需為 9 位數字' },
        { status: 400 }
      )
    }

    // 驗證班級 ID
    if (!classId) {
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
        { success: false, error: '帳號不存在' },
        { status: 404 }
      )
    }

    const studentData = studentDocSnap.data()

    // 2. 查詢班級內的學生記錄確保帳號屬於該班級
    const classStudentDocRef = doc(db, `classes/${classId}/students`, account)
    const classStudentSnap = await getDoc(classStudentDocRef)

    if (!classStudentSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號不存在或班級不符' },
        { status: 404 }
      )
    }

    const classStudentData = classStudentSnap.data()

    // 3. 檢查該班級的座位選擇狀態
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
