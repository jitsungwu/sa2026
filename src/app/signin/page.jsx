"use client"
import React, { useState } from 'react'
import SignInForm from '../../components/SignInForm'
import StudentSignInForm from '../../components/StudentSignInForm'
import StudentSignUpForm from '../../components/StudentSignUpForm'

export default function SignInPage() {
  const [mode, setMode] = useState(null) // null | 'teacher' | 'student-signin' | 'student-signup'

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
            onClick={() => setMode('student-signin')}
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

      {mode === 'student-signin' && (
        <div>
          <h2>學生登入</h2>
          <p>請輸入帳號、密碼及班級代碼以進入課堂互動介面。</p>
          <div style={{ marginTop: 12 }}>
            <StudentSignInForm onClose={() => setMode(null)} />
          </div>
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6, textAlign: 'center' }}>
            <p style={{ marginBottom: 8 }}>還沒有帳號？</p>
            <button
              className="btn btn-secondary"
              onClick={() => setMode('student-signup')}
              style={{ padding: '8px 16px' }}
            >
              建立帳號
            </button>
          </div>
        </div>
      )}

      {mode === 'student-signup' && (
        <div>
          <h2>學生帳號建立</h2>
          <p>建立您的學生帳號，設定密碼後即可登入。</p>
          <div style={{ marginTop: 12 }}>
            <StudentSignUpForm 
              onClose={() => setMode(null)}
              onSuccess={() => {
                // 建立成功後返回登入頁面
                setTimeout(() => setMode(null), 2000)
              }}
            />
          </div>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              className="btn btn-link"
              onClick={() => setMode('student-signin')}
              style={{ padding: '8px 0', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← 返回登入
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
