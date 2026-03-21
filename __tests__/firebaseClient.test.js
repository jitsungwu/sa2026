import { describe, it, expect, vi } from 'vitest'

describe('firebaseClient exports', () => {
  it('should export auth, db, signInWithEmail, createAccountWithEmail, signOutUser, and useEmulator', async () => {
    // Mock firebase modules to avoid initialization overhead in Node environment
    vi.mock('firebase/app', () => ({
      initializeApp: vi.fn(),
      getApps: vi.fn(() => [])
    }))
    
    vi.mock('firebase/auth', () => ({
      getAuth: vi.fn(),
      createUserWithEmailAndPassword: vi.fn(),
      signInWithEmailAndPassword: vi.fn(),
      signOut: vi.fn(),
      connectAuthEmulator: vi.fn()
    }))

    vi.mock('firebase/firestore', () => ({
      getFirestore: vi.fn(),
      connectFirestoreEmulator: vi.fn()
    }))

    const mod = await import('../src/firebaseClient')

    expect(mod).toHaveProperty('auth')
    expect(mod).toHaveProperty('db')
    expect(mod).toHaveProperty('signInWithEmail')
    expect(mod).toHaveProperty('createAccountWithEmail')
    expect(mod).toHaveProperty('signOutUser')
    expect(mod).toHaveProperty('useEmulator')
    expect(typeof mod.useEmulator).toBe('boolean')
  })
})
