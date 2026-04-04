"use client"
import React, { useState } from 'react'
import SignInForm from '../../components/SignInForm'
import StudentSignInForm from '../../components/StudentSignInForm'

export default function SignInPage() {
  const [mode, setMode] = useState(null) // null | 'teacher' | 'student'

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1>課堂管理系統</h1>
      <p style={{ marginBottom: 24, fontSize: 16 }}>請選擇登入身份</p>

      {!mode && (
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            className="btn btn-primary"
            onClick={() => setMode('teacher')}
            style={{ padding: '12px 24px', fontSize: 16 }}
          >
            教師登入
          </button>
          <button
            className="btn"
            onClick={() => setMode('student')}
            style={{ padding: '12px 24px', fontSize: 16 }}
          >
            學生登入
          </button>
        </div>
      )}

      {mode === 'teacher' && (
        <div>
          <h2>教師登入</h2>
          <p>請使用老師帳號登入以進入管理介面。</p>
          <div style={{ marginTop: 12 }}>
            <SignInForm
              onSuccess={() => {
                try {
                  window.location.href = '/class/monitor'
                } catch (e) {
                  window.location.href = '/class/monitor'
                }
              }}
              onClose={() => setMode(null)}
            />
          </div>
        </div>
      )}

      {mode === 'student' && (
        <div>
          <h2>學生登入</h2>
          <p>請輸入學號及班級代碼以進入課堂互動介面。</p>
          <div style={{ marginTop: 12 }}>
            <StudentSignInForm onClose={() => setMode(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
