"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { db } from '../../../../firebaseClient'
import { doc, onSnapshot } from 'firebase/firestore'

export default function SeatSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params?.classId
  const [student, setStudent] = useState(null)
  const [layout, setLayout] = useState({})
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

  // Subscribe to realtime layout updates
  useEffect(() => {
    if (!classId || !db) return
    const layoutDocRef = doc(db, `classes/${classId}/layout`, 'grid')
    const unsub = onSnapshot(layoutDocRef, (snap) => {
      setLayout(snap.exists() ? snap.data() : {})
    }, (err) => {
      console.warn('layout onSnapshot error:', err)
    })
    return () => unsub()
  }, [classId])

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

  const rows = 8

  const handleReserve = async (r, c) => {
    if (loadingSeat) return
    setMessage(null)
    const occupant = (layout[r] || {})[c]
    if (occupant && occupant !== String(student.groupId)) {
      const formattedOccupant = String(occupant).padStart(2, '0')
      setMessage({ type: 'error', text: `此位置已被第 ${formattedOccupant} 組選取` })
      return
    }

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

  return (
    <div style={{ padding: 24 }}>
      <h1>座位選擇</h1>
      <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6 }}>
        <p><strong>學號：</strong> {student.account}</p>
        <p><strong>姓名：</strong> {student.name || '未提供'}</p>
        <p><strong>組別：</strong> {student.groupId}</p>
        <p><strong>班級：</strong> {student.classId}</p>
      </div>

      {message && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, backgroundColor: message.type === 'error' ? '#ffe6e6' : '#e6ffed' }}>
          {message.text}
        </div>
      )}

      {/* Whiteboard marker at front (top) */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ width: 'calc(33.333% - 8px)', padding: '12px 16px', backgroundColor: '#8b5fbf', color: 'white', borderRadius: 8, textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.08)' }}>
          白板（前方）
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 20 }}>
        {/* Zones displayed left-to-right: left (6 rows), middle (8 rows), right (8 rows) */}
        {/* Each zone occupies equal width */}
        {[
          { key: 'left', rows: 6, col: 1, label: '左區' },
          { key: 'middle', rows: 8, col: 2, label: '中區' },
          { key: 'right', rows: 8, col: 3, label: '右區' }
        ].map((zone) => (
          <div key={zone.key} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>{zone.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from({ length: zone.rows }).map((_, ri) => {
                const r = ri + 1
                const occupant = (layout[r] || {})[zone.col]
                const isMine = occupant && String(occupant) === String(student.groupId)
                const disabled = !!occupant && !isMine
                return (
                  <button
                    key={`${zone.key}-r${r}`}
                    disabled={disabled || loadingSeat}
                    onClick={() => handleReserve(r, zone.col)}
                    style={{
                      height: 40,
                      width: '100%',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      backgroundColor: isMine ? '#ffd966' : (disabled ? '#f2f2f2' : 'white'),
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {occupant ? `第 ${String(occupant).padStart(2, '0')} 組` : `${zone.label}第 ${r} 排`}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

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
