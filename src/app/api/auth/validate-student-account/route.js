import { db } from '../../../../firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

/**
 * POST /api/auth/validate-student-account
 * 驗證學號是否存在於某個班級中
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

      // 驗證帳號格式
    if (!account || !/^\d{6,}$/.test(account)) {
      return Response.json(
        { success: false, error: '帳號需為至少 6 位數字' },
        { status: 400 }
      )
    }

    // 查詢全域 students 文檔
    const studentDocRef = doc(db, 'students', account)
    const studentSnap = await getDoc(studentDocRef)

    if (!studentSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號不存在於任何班級中，請聯絡老師' },
        { status: 404 }
      )
    }

    const studentData = studentSnap.data()
    const foundClassId = studentData.classId
    const foundGroupId = studentData.groupId

    if (!foundClassId || !foundGroupId) {
      return Response.json(
        { success: false, error: '帳號班級資訊不完整' },
        { status: 400 }
      )
    }

    return Response.json({
      success: true,
      message: '帳號驗證成功',
      classId: foundClassId,
      groupId: foundGroupId
    })
  } catch (error) {
    console.error('Student account validation error:', error)
    return Response.json(
      { success: false, error: error.message || '帳號驗證失敗' },
      { status: 500 }
    )
  }
}
