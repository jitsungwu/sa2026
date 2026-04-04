/**
 * Read and import student accounts from Excel file.
 * 
 * Usage:
 * node scripts/import-students-from-excel.js <excel-file-path> [classId]
 * 
 * Examples:
 * node scripts/import-students-from-excel.js "Group_list_2026-04-04(demo).xlsx" demo
 * node scripts/import-students-from-excel.js "Group_list_2026-04-04(demo).xlsx" class-A
 */

import dotenv from 'dotenv'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get directory name (for ES modules)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: '.env.local' })

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

const db = getFirestore(app)

async function importStudentsFromExcel() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.error('❌ Usage: node scripts/import-students-from-excel.js <excel-file-path> [classId]')
    console.error('Example: node scripts/import-students-from-excel.js "Group_list_2026-04-04(demo).xlsx" demo')
    process.exit(1)
  }

  const excelFilePath = args[0]
  const classId = args[1] || 'demo'
  const password = '12345678' // Default test password

  const fullPath = path.isAbsolute(excelFilePath) 
    ? excelFilePath 
    : path.resolve(__dirname, '..', excelFilePath)

  console.log(`📂 Reading Excel file: ${fullPath}`)
  console.log(`📚 Target class: ${classId}`)

  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(fullPath)

    console.log(`\n📊 Found ${workbook.worksheets.length} worksheet(s)`)
    
    let totalImported = 0

    // Process each worksheet
    for (const worksheet of workbook.worksheets) {
      console.log(`\n👥 Processing worksheet: "${worksheet.name}"`)

      const students = []

      // Read rows (skip header)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // Skip header

        // Get values from columns
        const cells = row.values
        if (!cells || cells.length < 2) return // Skip empty rows

        // Assuming: Column A = Student ID, Column B = Name, Column C = Group
        const studentAccount = cells[1] ? String(cells[1]).trim() : null
        const studentName = cells[2] ? String(cells[2]).trim() : 'Unknown'
        const groupId = cells[3] ? String(cells[3]).trim() : '1'

        if (studentAccount) {
          students.push({
            account: studentAccount,
            name: studentName,
            groupId: groupId || '1',
          })
        }
      })

      console.log(`   Found ${students.length} students in worksheet "${worksheet.name}"`)

      // Import each student
      for (const student of students) {
        try {
          // 1. Create global student document
          const globalStudentRef = doc(db, 'students', student.account)
          await setDoc(globalStudentRef, {
            name: student.name,
            account: student.account,
            password: password, // WARNING: This is a test password, should use proper authentication in production
          }, { merge: true })

          // 2. Create classroom-specific student document
          const classStudentRef = doc(db, `classes/${classId}/students`, student.account)
          await setDoc(classStudentRef, {
            name: student.name,
            account: student.account,
            groupId: student.groupId,
            password: password,
          }, { merge: true })

          console.log(`   ✓ Imported: ${student.account} - ${student.name} (Group: ${student.groupId})`)
          totalImported++
        } catch (err) {
          console.error(`   ✗ Failed to import ${student.account}: ${err.message}`)
        }
      }
    }

    console.log(`\n✅ Successfully imported ${totalImported} student(s) to class "${classId}"`)
    console.log(`📝 Test password: ${password}`)
  } catch (err) {
    console.error('❌ Import failed:', err.message)
    process.exit(2)
  }
}

importStudentsFromExcel().then(() => process.exit(0))
