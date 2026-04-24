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
    // 获取所有班级
    const classesSnap = await getDocs(collection(db, 'classes'))
    if (!classesSnap || classesSnap.empty) {
      console.log('No classes found')
      return
    }
    
    let totalCleared = 0
    for (const classDoc of classesSnap.docs) {
      const classId = classDoc.id
      // 从每个班级的 hands_raised 子集合中清除
      const col = collection(db, 'classes', classId, 'hands_raised')
      const q = query(col, where('active', '==', true))
      const snap = await getDocs(q)
      
      if (snap && !snap.empty) {
        const deletes = snap.docs.map(d => deleteDoc(doc(db, 'classes', classId, 'hands_raised', d.id)))
        await Promise.all(deletes)
        console.log(`Cleared ${deletes.length} active hand(s) from class ${classId}`)
        totalCleared += deletes.length
      }
    }
    console.log(`Total cleared: ${totalCleared} active hand(s)`)
  } catch (err) {
    console.error('Failed to clear active hands:', err)
    process.exit(2)
  }
}

clearActiveHands().then(() => process.exit(0))
