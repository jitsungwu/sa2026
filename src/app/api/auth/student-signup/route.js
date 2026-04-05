import { db } from '../../../../firebaseClient'
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore'

/**
 * POST /api/auth/student-signup
 * 建立新的學生帳號
 * 系統自動查找該學號在哪個班級已經存在，並設定密碼
 * 
 * Request body:
 * { account: "413000001", name: "學生姓名", password: "12345678" }
 * 
 * Response:
 * { success: true, message: "帳號建立成功", student: { account, name, email, classId, groupId } }
 * or
 * { success: false, error: "錯誤訊息" }
 */

export async function POST(request) {
  try {
    const { account, name, password } = await request.json()

    // 1. 驗證帳號格式
    if (!account || !/^\d{6,}$/.test(account)) {
      return Response.json(
        { success: false, error: '帳號需為至少 6 位數字' },
        { status: 400 }
      )
    }

    // 2. 驗證姓名
    if (!name || name.trim().length === 0) {
      return Response.json(
        { success: false, error: '姓名不能為空' },
        { status: 400 }
      )
    }

    // 3. 驗證密碼
    if (!password || password.length < 6) {
      return Response.json(
        { success: false, error: '密碼至少需 6 個字元' },
        { status: 400 }
      )
    }

    // 4. 檢查帳號是否已存在於全域 students 集合
    const existingStudentRef = doc(db, 'students', account)
    const existingSnap = await getDoc(existingStudentRef)

    if (existingSnap.exists()) {
      return Response.json(
        { success: false, error: '帳號已存在，請直接登入' },
        { status: 409 }
      )
    }

    // 5. 查詢該學號在哪些班級中已經存在（應該只有一個）
    let foundClassId = null
    let foundGroupId = null
    let foundClassStudentData = null

    // 搜尋所有班級下的 students 子集合
    const classesRef = collection(db, 'classes')
    const classSnap = await getDocs(classesRef)

    for (const classDoc of classSnap.docs) {
      const classId = classDoc.id
      const classStudentRef = doc(db, `classes/${classId}/students`, account)
      const classStudentSnap = await getDoc(classStudentRef)

      if (classStudentSnap.exists()) {
        foundClassId = classId
        foundGroupId = classStudentSnap.data().groupId
        foundClassStudentData = classStudentSnap.data()
        break
      }
    }

    if (!foundClassId) {
      return Response.json(
        { success: false, error: '帳號不存在於任何班級中，請聯絡老師' },
        { status: 404 }
      )
    }

    // 6. 自動生成 email
    const email = `${account}@cloud.fju.edu.tw`

    // 7. 建立全域學生文檔（設定密碼）
    const studentData = {
      account,
      name: name.trim(),
      email,
      password, // WARNING: 生產環境應使用加密或 OAuth
      createdAt: new Date().toISOString(),
    }

    await setDoc(existingStudentRef, studentData)

    // 8. 更新班級內的學生文檔（設定密碼和 email）
    const classStudentRef = doc(db, `classes/${foundClassId}/students`, account)
    const updatedClassStudentData = {
      ...foundClassStudentData,
      name: name.trim(),
      email,
      password,
      passwordSetAt: new Date().toISOString(),
    }

    await setDoc(classStudentRef, updatedClassStudentData)

    return Response.json({
      success: true,
      message: '帳號建立成功',
      student: {
        account,
        name: name.trim(),
        email,
        classId: foundClassId,
        groupId: foundGroupId
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Student signup error:', error)
    return Response.json(
      { success: false, error: error.message || '帳號建立失敗' },
      { status: 500 }
    )
  }
}
