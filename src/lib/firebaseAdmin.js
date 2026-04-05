/**
 * Firebase Admin SDK initialization for server-side operations
 * This should only be used in Next.js API routes and server components
 */

import * as admin from 'firebase-admin'

let adminApp = null

// Initialize Firebase Admin SDK
function initializeAdmin() {
  if (adminApp) {
    return adminApp
  }

  try {
    // Try to initialize from environment variables
    const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY
    
    if (!serviceAccountKey) {
      // If no explicit key, try GOOGLE_APPLICATION_CREDENTIALS
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        adminApp = admin.initializeApp()
        console.info('Initialized Firebase Admin from GOOGLE_APPLICATION_CREDENTIALS')
        return adminApp
      }
      throw new Error('FIREBASE_ADMIN_SDK_KEY or GOOGLE_APPLICATION_CREDENTIALS env var not set')
    }

    // Parse the service account key
    const serviceAccount = JSON.parse(serviceAccountKey)

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })

    console.info('Initialized Firebase Admin SDK')
    return adminApp
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err.message)
    throw err
  }
}

// Get admin auth instance
export function getAdminAuth() {
  if (!adminApp) {
    initializeAdmin()
  }
  return admin.auth(adminApp)
}

// Get admin firestore instance
export function getAdminDb() {
  if (!adminApp) {
    initializeAdmin()
  }
  return admin.firestore(adminApp)
}

export { admin }
