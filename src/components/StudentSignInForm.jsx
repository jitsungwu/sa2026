"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmail } from '../firebaseClient'

export default function StudentSignInForm({ onSuccess, onClose }) {
  const router = useRouter()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const doSignIn = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 生成 email
      const email = `${account.trim()}@cloud.fju.edu.tw`
      
      // 使用 Firebase Authentication 登入
      const userCredential = await signInWithEmail(email, password)

      // 登入成功後，查詢學生資訊（系統自動檢測班級）
      const response = await fetch('/api/auth/get-student-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: account.trim() })
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || '無法獲取學生資訊')
        return
      }

      // 登入成功，儲存學生資訊到 localStorage
      const studentInfo = data.student
      localStorage.setItem('studentAuth', JSON.stringify({
        account: studentInfo.account,
        name: studentInfo.name,
        groupId: studentInfo.groupId,
        classId: studentInfo.classId,
        seatSelected: studentInfo.seatSelected,
        timestamp: new Date().toISOString()
      }))

      if (onSuccess) {
        onSuccess(studentInfo)
      }

      // 重定向：若座位已選則進儀表板，否則進座位選擇（使用返回的 classId）
      const classId = studentInfo.classId
      const redirectUrl = studentInfo.seatSelected
        ? `/class/${classId}/dashboard`
        : `/class/${classId}/seat-selection`
      
      try {
        router.push(redirectUrl)
      } catch (e) {
        window.location.href = redirectUrl
      }
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, maxWidth: 420 }}>
      <h3>學生登入</h3>
      <form onSubmit={doSignIn}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>帳號（學號）</label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="e.g., 413000001"
            style={{ width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
            required
            disabled={loading}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>密碼</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="輸入密碼"
            style={{ width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
            required
            disabled={loading}
          />
        </div>
        {error ? (
          <div style={{ color: '#d32f2f', marginBottom: 12, fontSize: 14, padding: 8, backgroundColor: '#ffebee', borderRadius: 4 }}>
            ✗ {error}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !account || !password}
            style={{ flex: 1 }}
          >
            {loading ? '驗證中...' : '登入'}
          </button>
          {onClose ? (
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              返回
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
