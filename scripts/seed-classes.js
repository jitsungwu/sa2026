/**
 * Seed Firestore with classes used by the app.
 *
 * Usage:
 * 1. Install firebase-admin: `npm install firebase-admin`
 * 2. Set GOOGLE_APPLICATION_CREDENTIALS to point to your service account JSON, or provide a
 *    path to the key in the SERVICE_ACCOUNT_PATH env var.
 * 3. Run: `node scripts/seed-classes.js`
 *
 * This will create/merge documents in the `classes` collection with the following IDs:
 * - 2A: 二甲 (10 groups)
 * - 2B: 二乙 (15 groups)
 * - demo: 測試 (5 groups)
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

async function seed() {
  const classes = [
    { id: '2A', name: '二甲', groupCount: 10 },
    { id: '2B', name: '二乙', groupCount: 15 },
    { id: 'demo', name: '測試', groupCount: 5 },
  ]

  try {
    for (const c of classes) {
      await setDoc(doc(db, 'classes', c.id), { name: c.name, groupCount: c.groupCount, active: false }, { merge: true })
      console.log(`Seeded class ${c.id} (${c.name}) with ${c.groupCount} groups`)
    }
    console.log('Seeding complete.')
  } catch (err) {
    console.error('Seeding failed:', err)
    process.exit(2)
  }
}

seed().then(() => process.exit(0))
