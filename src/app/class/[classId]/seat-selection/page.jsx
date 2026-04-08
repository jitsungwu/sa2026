"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SeatGridDisplay from '../../../../../components/SeatGridDisplay'

export default function SeatSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params?.classId
  const [student, setStudent] = useState(null)
  const [loadingSeat, setLoadingSeat] = useState(false)
  const [message, setMessage] = useState(null)

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

  const handleReserve = async (r, c) => {
    if (loadingSeat) return
    setMessage(null)

    setLoadingSeat(true)
    try {
      const res = await fetch(`/api/class/${classId}/reserve-seat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, groupId: student.groupId, row: r, col: c })
      })

      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          const formattedOccupiedBy = String(json.occupiedBy || '其他').padStart(2, '0')
          setMessage({ type: 'error', text: `此位置已被第 ${formattedOccupiedBy} 組選取` })
        } else {
          setMessage({ type: 'error', text: json.error || '預約座位失敗' })
        }
        setLoadingSeat(false)
        return
      }

      // Success: seat reserved. UI will update via onSnapshot; navigate to dashboard
      setMessage({ type: 'success', text: '座位已選定，正在導向儀表板…' })
      
      // Update localStorage to reflect seat selection
      const updatedStudent = { ...student, seatSelected: true }
      localStorage.setItem('studentAuth', JSON.stringify(updatedStudent))
      
      setTimeout(() => router.push(`/class/${classId}/dashboard`), 800)
    } catch (e) {
      console.error(e)
      setMessage({ type: 'error', text: '網路錯誤，請稍後重試' })
    } finally {
      setLoadingSeat(false)
    }
  }

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
      <h1>座位選擇</h1>
      <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6 }}>
        <p><strong>學號：</strong> {student.account}</p>
        <p><strong>姓名：</strong> {student.name || '未提供'}</p>
        <p><strong>組別：</strong> {student.groupId}</p>
        <p><strong>班級：</strong> {student.classId}</p>
      </div>

      {/* 使用可重用的座位表組件 - 互動模式 */}
      <SeatGridDisplay
        classId={classId}
        interactive={true}
        currentGroupId={student.groupId}
        onReserve={handleReserve}
        loading={loadingSeat}
        message={message}
      />

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