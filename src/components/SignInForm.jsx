"use client"
import React, { useState } from 'react'
import { signInWithEmail, createAccountWithEmail } from '../firebaseClient'

export default function SignInForm({ onSuccess, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const doSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      const cred = await signInWithEmail(email, password)
      if (onSuccess) onSuccess(cred && cred.user)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const doCreate = async () => {
    setError(null)
    setLoading(true)
    try {
      const cred = await createAccountWithEmail(email, password)
      if (onSuccess) onSuccess(cred && cred.user)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, maxWidth: 420 }}>
      <h3>使用 Email 登入</h3>
      <div style={{ marginBottom: 8 }}>
        <label>電子郵件</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" style={{ width: '100%', padding: 8, marginTop: 4 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>密碼</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密碼" style={{ width: '100%', padding: 8, marginTop: 4 }} />
      </div>
      {error ? <div style={{ color: 'red', marginBottom: 8 }}>{error}</div> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={doSignIn} disabled={loading}>登入</button>
        <button className="btn" onClick={doCreate} disabled={loading}>建立帳號</button>
        {onClose ? <button className="btn" onClick={onClose}>關閉</button> : null}
      </div>
    </div>
  )
}
