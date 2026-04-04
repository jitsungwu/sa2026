"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StudentSignInForm({ onSuccess, onClose }) {
  const router = useRouter()
  const [account, setAccount] = useState('')
  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const doSignIn = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/student-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, classId })
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || '登入失敗')
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

      // 重定向：若座位已選則進儀表板，否則進座位選擇
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
        <div style={{ marginBottom: 8 }}>
          <label>學號（9位數字）</label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="123456789"
            style={{ width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
            required
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>班級代碼</label>
          <input
            type="text"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            placeholder="e.g., class-A"
            style={{ width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
            required
          />
        </div>
        {error ? <div style={{ color: 'red', marginBottom: 8, fontSize: 14 }}>{error}</div> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !account || !classId}
          >
            {loading ? '驗證中...' : '登入'}
          </button>
          {onClose ? (
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              關閉
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
