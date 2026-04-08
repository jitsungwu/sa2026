import dotenv from 'dotenv'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore'

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

async function migrateGroupFormat() {
  try {
    console.log('Starting group format migration...\n')

    // Collections to migrate
    const collections_to_process = ['hands_raised', 'participation_logs']
    
    for (const collectionName of collections_to_process) {
      console.log(`Processing collection: ${collectionName}...`)
      
      const col = collection(db, collectionName)
      const snap = await getDocs(col)
      
      if (!snap || snap.empty) {
        console.log(`  No documents found in ${collectionName}\n`)
        continue
      }

      // Filter documents with single-digit group (1-9)
      const docsToUpdate = snap.docs.filter(d => {
        const data = d.data()
        const group = data.group
        return group && /^[1-9]$/.test(String(group))
      })

      if (docsToUpdate.length === 0) {
        console.log(`  No single-digit groups found in ${collectionName}\n`)
        continue
      }

      console.log(`  Found ${docsToUpdate.length} documents to update`)

      // Process updates in batches (max 500 per batch)
      const batchSize = 500
      for (let i = 0; i < docsToUpdate.length; i += batchSize) {
        const batch = writeBatch(db)
        const batchDocs = docsToUpdate.slice(i, i + batchSize)

        for (const docSnap of batchDocs) {
          const data = docSnap.data()
          const oldGroup = data.group
          const newGroup = String(oldGroup).padStart(2, '0')
          
          console.log(`    ${docSnap.id}: "${oldGroup}" → "${newGroup}"`)
          
          batch.update(doc(db, collectionName, docSnap.id), { group: newGroup })
        }

        await batch.commit()
        console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1} committed (${batchDocs.length} docs)\n`)
      }
    }

    console.log('✅ Migration completed successfully!')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(2)
  }
}

migrateGroupFormat().then(() => process.exit(0))
