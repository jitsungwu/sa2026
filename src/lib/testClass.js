import { db, useEmulator } from '../firebaseClient'
import { collection, addDoc, setDoc, doc } from '../lib/firestoreWrapper'

export const TEST_CLASS_ID = 'test-local-1'

export async function createTestClass({ id = TEST_CLASS_ID, name = '測試班級', groups = [1] } = {}) {
  // Create test class in Firestore when available (emulator or real)
  if (db) {
    try {
      const ref = await addDoc(collection(db, 'classes'), { name, groups, test: true, active: true, currentGroup: groups[0] || 1 })
      return { id: ref.id, createdInFirestore: true }
    } catch (err) {
      console.error('無法在 Firestore 建立測試班級', err)
      return { id, createdInFirestore: false }
    }
  }

  return { id, createdInFirestore: false }
}

export function clearTestClass({ id = TEST_CLASS_ID } = {}) {
  // For emulator-based tests, the test harness should delete the Firestore doc if needed.
}

export default { TEST_CLASS_ID, createTestClass, clearTestClass }
