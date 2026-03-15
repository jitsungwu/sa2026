"use client"
import React, { useEffect, useState } from 'react'
import { auth, signInWithGoogle, signOutUser } from '../firebaseClient'
import { onAuthStateChanged } from 'firebase/auth'

export default function HomePage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const un = onAuthStateChanged(auth, (u) => setUser(u))
    return () => un()
  }, [])

  return (
    <div className="hero">
      <div>
        <h1>Next.js (App Router) + Firebase</h1>
        <p>
          <a href="/test-list">檢視 Test 集合</a>
        </p>
        {user ? (
          <div className="auth-info">
            <p>Signed in as {user.displayName || user.email}</p>
            <button className="btn" onClick={() => signOutUser()}>Sign out</button>
          </div>
        ) : (
          <div>
            <p>Not signed in</p>
            <button className="btn btn-primary" onClick={() => signInWithGoogle()}>Sign in with Google</button>
          </div>
        )}
      </div>
    </div>
  )
}