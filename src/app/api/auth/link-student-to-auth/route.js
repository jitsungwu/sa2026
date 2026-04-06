import { db } from '../../../../firebaseClient'
import { doc, getDoc, setDoc } from 'firebase/firestore'

/**
 * POST /api/auth/link-student-to-auth
 * 將Firebase Auth帳號連結到學生文檔
 * 
 * Request body:
 * { account: "413000001", userId: "firebase-uid" }
 * 
 * Response:
 * { success: true, student: { account, name, email, classId, groupId, userId } }
 * or
 * { success: false, error: "錯誤訊息" }
 */

export async function POST(request) {
  try {
    const { account, userId } = await request.json()

    // 驗證帳號格式
    if (!account || !/^\d{6,}$/.test(account)) {
      return Response.json(
        { success: false, error: '帳號格式不正確' },
        { status: 400 }
      )
    }

    // 驗證userId
    if (!userId || userId.trim().length === 0) {
      return Response.json(
        { success: false, error: 'userId不能為空' },
        { status: 400 }
      )
    }

    // 查詢全域 students 文檔
    const globalStudentRef = doc(db, 'students', account)
    const globalSnap = await getDoc(globalStudentRef)

    if (!globalSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號不存在於任何班級中' },
        { status: 404 }
      )
    }

    const globalStudentData = globalSnap.data()
    const foundClassId = globalStudentData.classId
    const foundGroupId = globalStudentData.groupId
    const foundClassStudentData = globalStudentData

    if (!foundClassId) {
      return Response.json(
        { success: false, error: '帳號班級資訊不完整' },
        { status: 400 }
      )
    }

    // 更新班級內的學生文檔，添加userId
    const classStudentRef = doc(db, `classes/${foundClassId}/students`, account)
    const updatedClassStudentData = {
      ...foundClassStudentData,
      userId,
      passwordSetAt: new Date().toISOString(),
    }

    await setDoc(classStudentRef, updatedClassStudentData)

    // 建立或更新全域學生文檔
    const email = `${account}@cloud.fju.edu.tw`
    const linkedStudentData = {
      account,
      name: foundClassStudentData.name || '',
      email,
      userId,
      classId: foundClassId,
      groupId: foundGroupId,
      passwordSetAt: new Date().toISOString(),
    }

    await setDoc(globalStudentRef, linkedStudentData)

    return Response.json({
      success: true,
      student: {
        account,
        name: foundClassStudentData.name || '',
        email,
        classId: foundClassId,
        groupId: foundGroupId,
        userId
      }
    })
  } catch (error) {
    console.error('Link student to auth error:', error)
    return Response.json(
      { success: false, error: error.message || '帳號連結失敗' },
      { status: 500 }
    )
  }
}
