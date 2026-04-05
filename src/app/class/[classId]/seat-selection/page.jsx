"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function SeatSelectionPage() {
  const params = useParams()
  const classId = params?.classId
  const [student, setStudent] = useState(null)

  useEffect(() => {
    const authStr = typeof window !== 'undefined' ? localStorage.getItem('studentAuth') : null
    if (authStr) {
      try {
        setStudent(JSON.parse(authStr))
      } catch (e) {
        console.error('Failed to parse student auth:', e)
      }
    }
  }, [])

  if (!student) {
    return (
      <div style={{ padding: 24 }}>
        <p>未登入或登入已過期，請重新登入。</p>
        <a href="/signin" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          回到登入頁面
        </a>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>座位選擇（Issue #14 - 開發中）</h1>
      <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6 }}>
        <p><strong>學號：</strong> {student.account}</p>
        <p><strong>姓名：</strong> {student.name || '未提供'}</p>
        <p><strong>組別：</strong> {student.groupId}</p>
        <p><strong>班級：</strong> {student.classId}</p>
      </div>

      <p style={{ color: '#666', marginBottom: 24 }}>
        此功能正在開發中。按照 Issue #14 的規格實作座位選擇介面。
      </p>

      <div>
        <a
          href={`/class/${classId}/dashboard`}
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 4,
            marginRight: 8
          }}
        >
          返回儀表板
        </a>
        <a
          href="/signin"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#f03',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 4
          }}
          onClick={() => localStorage.removeItem('studentAuth')}
        >
          登出
        </a>
      </div>
    </div>
  )
}
