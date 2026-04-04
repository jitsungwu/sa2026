/**
 * Seed Firestore with test student accounts.
 *
 * Usage:
 * 1. Install firebase-admin: `npm install firebase-admin`
 * 2. Set GOOGLE_APPLICATION_CREDENTIALS to point to your service account JSON
 * 3. Run: `node scripts/seed-test-students.js`
 *
 * This will create test student accounts:
 * - Account: 123456789, Class: class-A (for E2E testing)
 * - Account: 987654321, Class: demo (for Emulator testing)
 */

import dotenv from 'dotenv'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

// load .env.local when present
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

async function seedStudents() {
  // Test students for E2E tests
  const testStudents = [
    {
      account: '123456789',
      name: '測試學生A',
      classId: 'class-A',
      groupId: '1',
    },
    {
      account: '987654321',
      name: '測試學生B',
      classId: 'demo',
      groupId: '1',
    },
  ]

  try {
    for (const student of testStudents) {
      // 1. Create global student document
      const globalStudentRef = doc(db, 'students', student.account)
      await setDoc(globalStudentRef, {
        name: student.name,
        account: student.account,
      }, { merge: true })
      console.log(`✓ Created global student: ${student.account} (${student.name})`)

      // 2. Create classroom-specific student document
      const classStudentRef = doc(db, `classes/${student.classId}/students`, student.account)
      await setDoc(classStudentRef, {
        name: student.name,
        account: student.account,
        groupId: student.groupId,
      }, { merge: true })
      console.log(`✓ Created student in class ${student.classId}: ${student.account}`)
    }

    console.log('\n✅ Successfully seeded test student accounts!')
  } catch (err) {
    console.error('❌ Seeding failed:', err.message)
    process.exit(2)
  }
}

seedStudents().then(() => process.exit(0))
