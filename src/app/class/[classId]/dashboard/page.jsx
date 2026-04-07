"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../../firebaseClient'
import { doc, getDoc, onSnapshot } from '../../../../lib/firestoreWrapper'
import RaiseHandButton from '../../../../components/RaiseHandButton'
import Scoreboard from '../../../../components/Scoreboard'
import PresentingGroupScorer from '../../../../components/PresentingGroupScorer'

export default function StudentDashboardPage() {
  const params = useParams()
  const classId = params?.classId
  const [student, setStudent] = useState(null)
  const [seatInfo, setSeatInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [presentingGroupId, setPresentingGroupId] = useState(null)
  const [presentingScorerOwnerId, setPresentingScorerOwnerId] = useState(null)

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

  // Listen for presenting group info
  useEffect(() => {
    if (!classId || !db) return

    try {
      const classRef = doc(db, 'classes', classId)
      const unsub = onSnapshot(classRef, (snap) => {
        if (snap && typeof snap.data === 'function') {
          const data = snap.data() || {}
          setPresentingGroupId(data.presentingGroupId || null)
          setPresentingScorerOwnerId(data.presentingScorerOwnerId || null)
        } else {
          setPresentingGroupId(null)
          setPresentingScorerOwnerId(null)
        }
      }, (err) => console.error('Listen presenting group error:', err))

      return () => unsub()
    } catch (e) {
      console.error('subscribe class doc error:', e)
    }
  }, [classId])

  // Check if user is in presenting group
  const isUserInPresentingGroup = () => {
    if (!presentingGroupId || !student) return false
    const presentingNum = parseInt(String(presentingGroupId), 10)
    const studentNum = parseInt(String(student.groupId), 10)
    return presentingNum === studentNum && !isNaN(presentingNum) && !isNaN(studentNum)
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      
      {!student ? (
        <>
          <h1 style={{ fontSize: '2em' }}>未登入</h1>
          <p style={{ fontSize: '1em' }}>未登入或登入已過期，請重新登入。</p>
          <a href="/signin" style={{ color: '#0070f3', textDecoration: 'underline' }}>
            回到登入頁面
          </a>
        </>
      ) : (
        <>
          <h1>學生互動儀表板</h1>
      
      {/* 個人資訊 */}
      <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6, border: '1px solid #ddd' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: '1em', alignItems: 'center', flexWrap: 'wrap' }}>
          <span><strong>{student.account}</strong></span>
          <span>{student.name || '未提供'} | {student.groupId}組</span>
          <span>座位：{seatInfo ? `${seatInfo.zone}第 ${seatInfo.row} 排` : '未選'}</span>
          {!seatInfo && (
            <span style={{ color: '#cf1322' }}>
              <a href={`/class/${classId}/seat-selection`} style={{ color: '#0050b3' }}>重新選座位</a>
            </span>
          )}
        </div>
      </div>

      {/* 互動功能 */}
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 6, border: '1px solid #eee' }}>
        <h2 style={{ marginTop: 0 }}>互動功能</h2>
        <RaiseHandButton classId={classId} group={student.groupId} />
        
        {isUserInPresentingGroup() && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}>
            <p style={{ color: '#666', marginBottom: 16, fontSize: '1em' }}>📊 你所在的 {student.groupId} 組正在報告中</p>
            <PresentingGroupScorer 
              classId={classId} 
              group={student.groupId} 
              presentingScorerOwnerId={presentingScorerOwnerId} 
            />
          </div>
        )}
      </div>

      {/* 即時積分榜 */}
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 6, border: '1px solid #eee' }}>
        <h2 style={{ marginTop: 0 }}>即時積分榜</h2>
        <Scoreboard classId={classId} />
      </div>

      {/* 登出按鈕 */}
      <div>
        <button
          onClick={() => {
            localStorage.removeItem('studentAuth')
            window.location.href = '/signin'
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f03',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          登出
        </button>
      </div>
        </>
      )}
    </div>
  )
}
