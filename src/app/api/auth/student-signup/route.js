import { db } from '../../../../firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

/**
 * POST /api/auth/student-signup
 * 驗證帳號是否存在於班級中
 * 
 * 注意：密碼驗證由 Firebase Authentication 處理
 * 帳號連結由前端完成後呼叫 `/api/auth/link-student-to-auth` 進行
 * 
 * Request body:
 * { account: "413000001" }
 * 
 * Response:
 * { success: true, message: "帳號驗證成功", classId, groupId }
 * or
 * { success: false, error: "錯誤訊息" }
 */

export async function POST(request) {
  try {
    const { account } = await request.json()

    // 1. 驗證帳號格式
    if (!account || !/^\d{6,}$/.test(account)) {
      return Response.json(
        { success: false, error: '帳號需為至少 6 位數字' },
        { status: 400 }
      )
    }

    // 2. 查詢全域 students 文檔
    const globalStudentRef = doc(db, 'students', account)
    const globalSnap = await getDoc(globalStudentRef)

    if (!globalSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號不存在於任何班級中，請聯絡老師' },
        { status: 404 }
      )
    }

    const studentData = globalSnap.data()
    const foundClassId = studentData.classId
    const foundGroupId = studentData.groupId

    if (!foundClassId || !foundGroupId) {
      return Response.json(
        { success: false, error: '帳號班級資訊不完整' },
        { status: 400 }
      )
    }

    // 3. 檢查帳號是否已有 Firebase Auth 帳號（userId）
    if (studentData.userId) {
      return Response.json(
        { success: false, error: '帳號已存在，請直接登入' },
        { status: 409 }
      )
    }

    return Response.json({
      success: true,
      message: '帳號驗證成功',
      classId: foundClassId,
      groupId: foundGroupId
    }, { status: 200 })
  } catch (error) {
    console.error('Student signup validation error:', error)
    return Response.json(
      { success: false, error: error.message || '帳號驗證失敗' },
      { status: 500 }
    )
  }
}
