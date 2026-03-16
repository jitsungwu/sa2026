import { db, useEmulator } from '../firebaseClient'
import { collection, addDoc } from '../lib/firestoreWrapper'

export const TEST_CLASS_ID = 'test-local-1'

export async function createTestClass({ id = TEST_CLASS_ID, name = '測試班級', groups = [1] } = {}) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('activeClass', id)
      window.localStorage.setItem('selectedGroup', String(groups[0] || 1))
    } catch (e) {
      // ignore localStorage errors
    }
  }

  if (useEmulator && db) {
    try {
      const ref = await addDoc(collection(db, 'classes'), { name, groups, test: true })
      return { id: ref.id, createdInFirestore: true }
    } catch (err) {
      console.error('無法在 emulator 建立測試班級', err)
      return { id, createdInFirestore: false }
    }
  }

  return { id, createdInFirestore: false }
}

export function clearTestClass({ id = TEST_CLASS_ID } = {}) {
  if (typeof window !== 'undefined') {
    try {
      const current = window.localStorage.getItem('activeClass')
      if (!id || current === id) {
        window.localStorage.removeItem('activeClass')
        window.localStorage.removeItem('selectedGroup')
      }
    } catch (e) {
      // ignore
    }
  }
}

export default { TEST_CLASS_ID, createTestClass, clearTestClass }
