import dotenv from 'dotenv'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

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

async function listAllHands() {
  try {
    const col = collection(db, 'hands_raised')
    const snap = await getDocs(col)
    if (!snap || snap.empty) {
      console.log('No hands_raised documents')
      return
    }
    console.log('hands_raised docs:')
    for (const d of snap.docs) {
      console.log(d.id, JSON.stringify(d.data()))
    }
  } catch (err) {
    console.error('Failed to list hands:', err)
    process.exit(2)
  }
}

listAllHands().then(() => process.exit(0))
