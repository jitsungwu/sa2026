import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}


const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'

// Diagnostics: check env presence at runtime (only in browser)
if (typeof window !== 'undefined') {
  const present = {
    apiKey: !!firebaseConfig.apiKey,
    authDomain: !!firebaseConfig.authDomain,
    projectId: !!firebaseConfig.projectId,
    storageBucket: !!firebaseConfig.storageBucket,
    appId: !!firebaseConfig.appId,
  }
  console.info('Firebase config presence:', present, 'useEmulator=', useEmulator)
}

let app
let auth
let db
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }
  auth = getAuth(app)
  db = getFirestore(app)
} catch (err) {
  // Do not throw generic errors; provide actionable console output for debugging
  console.error('Firebase initialization error:', err)
  // Export placeholders to avoid crashes in the UI; components should handle missing `auth` gracefully
  auth = null
  db = null
}

// If enabled via env, automatically connect to local emulators for faster
// local development. Controlled by `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`.
if (useEmulator && typeof window !== 'undefined') {
  try {
    const fsHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost'
    const fsPort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10)
    const authUrl = process.env.NEXT_PUBLIC_AUTH_EMULATOR_URL || 'http://localhost:9099'

    if (db) {
      connectFirestoreEmulator(db, fsHost, fsPort)
      console.info(`Connected Firestore emulator at ${fsHost}:${fsPort}`)
    }

    if (auth) {
      try {
        connectAuthEmulator(auth, authUrl, { disableWarnings: true })
        console.info(`Connected Auth emulator at ${authUrl}`)
      } catch (e) {
        // connectAuthEmulator may throw on older SDKs; surface the error but don't crash
        console.warn('connectAuthEmulator failed:', e)
      }
    }
  } catch (e) {
    console.warn('Failed to connect to Firebase emulators:', e)
  }
}

const provider = new GoogleAuthProvider()
const signInWithGoogle = () => signInWithPopup(auth, provider)

const signOutUser = async () => {
  try {
    await signOut(auth)
  } finally {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('activeClass')
        window.localStorage.removeItem('selectedGroup')
      } catch (e) {
        // ignore localStorage errors
      }
    }
  }
}

export { auth, db, signInWithGoogle, signOutUser, useEmulator }