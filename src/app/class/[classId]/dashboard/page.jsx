"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../../firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

export default function StudentDashboardPage() {
  const params = useParams()
  const classId = params?.classId
  const [student, setStudent] = useState(null)
  const [seatInfo, setSeatInfo] = useState(null)
  const [loading, setLoading] = useState(false)

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

  // Query seat location from Firestore
  useEffect(() => {
    if (!student || !classId || !db) return

    const fetchSeatInfo = async () => {
      setLoading(true)
      try {
        const layoutDocRef = doc(db, `classes/${classId}/layout`, 'grid')
        const layoutSnap = await getDoc(layoutDocRef)

        if (layoutSnap.exists()) {
          const layoutData = layoutSnap.data()
          
          // Find the seat for this group
          for (const [rowStr, rowData] of Object.entries(layoutData)) {
            const row = parseInt(rowStr, 10)
            if (typeof rowData !== 'object') continue
            
            for (const [colStr, groupId] of Object.entries(rowData)) {
              const col = parseInt(colStr, 10)
              const normalizedGroupId = String(groupId).padStart(2, '0')
              const studentGroupId = String(student.groupId).padStart(2, '0')
              
              if (normalizedGroupId === studentGroupId) {
                // Determine zone based on column
                let zone = ''
                if (col === 1) zone = '左區'
                else if (col === 2) zone = '中區'
                else if (col === 3) zone = '右區'

                setSeatInfo({ row, col, zone })
                // 更新 localStorage 的 seatSelected，確保一致性
                const updatedStudent = { ...student, seatSelected: true }
                localStorage.setItem('studentAuth', JSON.stringify(updatedStudent))
                setStudent(updatedStudent)
                return
              }
            }
          }
          
          // 沒有找到座位，說明未選座位
          setSeatInfo(null)
        } else {
          setSeatInfo(null)
        }
      } catch (error) {
        console.error('Error fetching seat info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSeatInfo()
  }, [student, classId])

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
      <h1>學生互動儀表板</h1>
      <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6 }}>
        <p><strong>學號：</strong> {student.account}</p>
        <p><strong>姓名：</strong> {student.name || '未提供'}</p>
        <p><strong>組別：</strong> {student.groupId}</p>
        <p><strong>班級：</strong> {student.classId}</p>
        <p><strong>座位位置：</strong> {seatInfo ? `${seatInfo.zone}第 ${seatInfo.row} 排` : '未選座位'}</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2>功能列表（開發中）</h2>
        <ul>
          <li>舉手機制</li>
          <li>查看累計分數</li>
          <li>選擇座位</li>
          <li>虛擬座位表</li>
        </ul>
      </div>

      <div>
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
