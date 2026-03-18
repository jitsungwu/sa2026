import dotenv from 'dotenv'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'

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

async function clearActiveHands() {
  try {
    const col = collection(db, 'hands_raised')
    const q = query(col, where('active', '==', true))
    const snap = await getDocs(q)
    if (!snap || snap.empty) {
      console.log('No active hands to clear')
      return
    }
    const deletes = snap.docs.map(d => deleteDoc(doc(db, 'hands_raised', d.id)))
    await Promise.all(deletes)
    console.log(`Cleared ${deletes.length} active hand(s)`)
  } catch (err) {
    console.error('Failed to clear active hands:', err)
    process.exit(2)
  }
}

clearActiveHands().then(() => process.exit(0))
