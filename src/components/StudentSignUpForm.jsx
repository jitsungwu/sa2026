"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAccountWithEmail } from '../firebaseClient'

export default function StudentSignUpForm({ onClose, onSuccess }) {
  const router = useRouter()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // 驗證密碼匹配
    if (password !== confirmPassword) {
      setError('密碼不相符')
      return
    }

    // 驗證密碼長度
    if (password.length < 6) {
      setError('密碼至少需 6 個字元')
      return
    }

    setLoading(true)

    try {
      // 1. 先驗證帳號是否存在於班級中
      const validationResponse = await fetch('/api/auth/validate-student-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: account.trim() })
      })

      const validationData = await validationResponse.json()
      if (!validationData.success) {
        setError(validationData.error || '帳號驗證失敗')
        setLoading(false)
        return
      }

      // 2. 使用Firebase Authentication建立帳號
      const email = `${account.trim()}@cloud.fju.edu.tw`
      const userCredential = await createAccountWithEmail(email, password)

      // 3. 更新Firestore文檔，添加userId
      const updateResponse = await fetch('/api/auth/link-student-to-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: account.trim(),
          userId: userCredential.user.uid
        })
      })

      const updateData = await updateResponse.json()
      if (!updateData.success) {
        setError(updateData.error || '帳號連結失敗')
        return
      }

      setSuccess(true)
      setAccount('')
      setPassword('')
      setConfirmPassword('')

      if (onSuccess) {
        onSuccess(updateData.student)
      }
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, maxWidth: 420 }}>
      <h3>建立學生帳號</h3>
      {success ? (
        <div style={{ 
          padding: 16, 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          borderRadius: 4, 
          marginBottom: 16 
        }}>
          <strong>✓ 帳號建立成功！</strong>
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 14 }}>
            現在可以用帳號和密碼登入。
          </p>
        </div>
      ) : (
        <form onSubmit={handleSignUp}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>學號</label>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="e.g., 413000001"
              style={{ width: '100%', padding: 8, boxSizing: 'border-box', marginBottom: 4 }}
              required
              disabled={loading}
              pattern="\d{6,}"
              title="學號需為至少 6 位數字"
            />
            <small style={{ color: '#666' }}>至少 6 位數字</small>
          </div>

          {/* 姓名已由匯入資料提供，介面不需顯示姓名欄位 */}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 個字元"
              style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>確認密碼</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再輸入一次密碼"
              style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && (
            <div style={{ color: '#d32f2f', marginBottom: 12, fontSize: 14, padding: 8, backgroundColor: '#ffebee', borderRadius: 4 }}>
              ✗ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !account || !password || !confirmPassword}
              style={{ flex: 1 }}
            >
              {loading ? '建立中...' : '確認建立'}
            </button>
            {onClose && (
              <button
                type="button"
                className="btn"
                onClick={onClose}
                disabled={loading}
              >
                取消
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
