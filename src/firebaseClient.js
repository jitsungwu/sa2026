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

// This project does not use Firebase emulators in tests or CI. Unit tests
// mock `firebase/*` modules instead of relying on emulator connectivity.
// The `useEmulator` export remains for feature-flagging or local experimentation,
// but runtime connections to emulators are intentionally omitted here.

const provider = new GoogleAuthProvider()
const signInWithGoogle = () => signInWithPopup(auth, provider)
const signOutUser = () => signOut(auth)

export { auth, db, signInWithGoogle, signOutUser, useEmulator }