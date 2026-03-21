"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import SignInForm from '../../components/SignInForm'

export default function SignInPage() {
  const router = useRouter()

  return (
    <div style={{ padding: 24 }}>
      <h2>登入 — 教師專用</h2>
      <p>請使用老師帳號登入以進入管理介面。</p>
      <div style={{ marginTop: 12 }}>
        <SignInForm onSuccess={() => { try { router.push('/class/monitor') } catch (e) { window.location.href = '/class/monitor' } }} />
      </div>
    </div>
  )
}
