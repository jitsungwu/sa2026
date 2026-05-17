"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStudentAuth } from '../../../../contexts/StudentAuthContext'
import { db } from '../../../../firebaseClient'
import { doc, getDoc, onSnapshot, collection, query, orderBy } from '../../../../lib/firestoreWrapper'
import { limit } from 'firebase/firestore'
import RaiseHandButton from '../../../../components/RaiseHandButton'
import Scoreboard from '../../../../components/Scoreboard'
import PresentingGroupScorer from '../../../../components/PresentingGroupScorer'
import HandsQueue from '../../../../components/HandsQueue'
import SeatGridDisplay from '../../../../components/SeatGridDisplay'

export default function StudentDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params?.classId
  const { studentInfo, updateStudentInfo, logout } = useStudentAuth()
  const [seatInfo, setSeatInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [presentingGroupId, setPresentingGroupId] = useState(null)
  const [priorityGroupId, setPriorityGroupId] = useState(null)
  const [presentingScorerOwnerId, setPresentingScorerOwnerId] = useState(null)
  const [showSeatLayout, setShowSeatLayout] = useState(false)
  const [classActive, setClassActive] = useState(false)
  const [firstRaisedGroupId, setFirstRaisedGroupId] = useState(null)
  const [secondRaisedGroupId, setSecondRaisedGroupId] = useState(null)

  // Handle URL parameters for E2E testing (initialize studentAuth from URL if not already set)
  useEffect(() => {
    if (typeof window === 'undefined' || !classId) return
    if (studentInfo) return // Already authenticated
    
    try {
      const params = new URLSearchParams(window.location.search)
      const groupParam = params.get('group')
      const participantIdParam = params.get('participantId')
      
      if (groupParam) {
        // Set temporary studentAuth for E2E testing
        updateStudentInfo({
          account: participantIdParam || `test_student_${Date.now()}`,
          groupId: groupParam,
          classId,
          name: '測試學生'
        })
      }
    } catch (e) {
      console.warn('Failed to parse URL parameters:', e)
    }
  }, [classId, studentInfo, updateStudentInfo])

  // Query seat location from Firestore
  useEffect(() => {
    if (!studentInfo || !classId || !db) return

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
              const studentGroupId = String(studentInfo.groupId).padStart(2, '0')
              
              if (normalizedGroupId === studentGroupId) {
                // Determine zone based on column
                let zone = ''
                if (col === 1) zone = '左區'
                else if (col === 2) zone = '中區'
                else if (col === 3) zone = '右區'

                setSeatInfo({ row, col, zone })
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
  }, [studentInfo, classId])

  // Listen for presenting group info
  useEffect(() => {
    if (!classId || !db) return

    try {
      const classRef = doc(db, 'classes', classId)
      const unsub = onSnapshot(classRef, (snap) => {
        if (snap && typeof snap.data === 'function') {
          const data = snap.data() || {}
          setPresentingGroupId(data.presentingGroupId || null)
          setPriorityGroupId(data.priorityGroupId || null)
          setPresentingScorerOwnerId(data.presentingScorerOwnerId || null)
          setClassActive(data.active || false)
        } else {
          setPresentingGroupId(null)
          setPriorityGroupId(null)
          setPresentingScorerOwnerId(null)
          setClassActive(false)
        }
      }, (err) => console.error('Listen presenting group error:', err))

      return () => unsub()
    } catch (e) {
      console.error('subscribe class doc error:', e)
    }
  }, [classId, db])

  // Listen for the first two raised hands
  useEffect(() => {
    if (!classId || !db) return

    try {
      const handsRef = collection(db, `classes/${classId}/hands_raised`)
      const q = query(handsRef, orderBy('timestamp', 'asc'), limit(2))
      const unsub = onSnapshot(q, (snap) => {
        const hands = []
        if (snap && snap.docs) {
          snap.docs.forEach((doc) => {
            const data = doc.data() || {}
            if (data.status === 'active') {
              hands.push(data.groupId || null)
            }
          })
        }
        setFirstRaisedGroupId(hands[0] || null)
        setSecondRaisedGroupId(hands[1] || null)
      }, (err) => console.warn('Listen hands_raised error:', err))

      return () => unsub()
    } catch (e) {
      console.error('subscribe hands_raised error:', e)
    }
  }, [classId, db])

  // Check if user is in presenting group
  const isUserInPresentingGroup = () => {
    if (!presentingGroupId || !studentInfo) return false
    const presentingNum = parseInt(String(presentingGroupId), 10)
    const studentNum = parseInt(String(studentInfo.groupId), 10)
    return presentingNum === studentNum && !isNaN(presentingNum) && !isNaN(studentNum)
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      
      {!studentInfo ? (
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
          <span><strong>{studentInfo.account}</strong></span>
          <span>{studentInfo.name || '未提供'} | {studentInfo.groupId}組</span>
          <span>座位：{seatInfo ? `${seatInfo.zone}第 ${seatInfo.row} 排` : '未選'}</span>
          {!seatInfo && (
            <span style={{ color: '#cf1322' }}>
              <a href={`/class/${classId}/seat-selection`} style={{ color: '#0050b3' }}>重新選座位</a>
            </span>
          )}
        </div>
        {priorityGroupId && (
          <div style={{ marginTop: 12, padding: 10, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 6, color: '#0050b3' }}>
            <strong>📌 優先發問組：{priorityGroupId} 組</strong>
          </div>
        )}
      </div>

      {/* 互動功能 */}
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 6, border: '1px solid #eee' }}>
        <h2 style={{ marginTop: 0 }}>互動功能</h2>
        {priorityGroupId && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 6, color: '#0050b3' }}>
            {priorityGroupId === String(studentInfo.groupId).padStart(2, '0') ? (
              <strong>📌 你是優先發問組 {priorityGroupId} 組，請等待老師進一步指示。</strong>
            ) : (
              <span>📌 已指定優先發問組：{priorityGroupId} 組，其他組暫時尚未開放發問。</span>
            )}
          </div>
        )}
        <RaiseHandButton classId={classId} group={studentInfo.groupId} />
        <button
          onClick={() => setShowSeatLayout(!showSeatLayout)}
          style={{
            marginTop: 16,
            padding: '10px 16px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1em'
          }}
        >
          {showSeatLayout ? '隱藏座位圖' : '查看座位圖'}
        </button>
        {isUserInPresentingGroup() && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}>
            <p style={{ color: '#666', marginBottom: 16, fontSize: '1em' }}>📊 你所在的 {studentInfo.groupId} 組正在報告中</p>
            <PresentingGroupScorer 
              classId={classId} 
              group={studentInfo.groupId} 
              presentingScorerOwnerId={presentingScorerOwnerId} 
            />
          </div>
        )}
      </div>

      {/* 座位圖顯示 */}
      {showSeatLayout && (
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f0f8ff', borderRadius: 6, border: '1px solid #b3d9ff' }}>
          <h2 style={{ marginTop: 0 }}>虛擬座位表</h2>
          <div style={{ marginBottom: 12, fontSize: '0.9em', color: '#666' }}>
            {firstRaisedGroupId && <span>🔴 第一個舉手：{firstRaisedGroupId} 組</span>}
            {secondRaisedGroupId && <span style={{ marginLeft: 16 }}>🟡 第二個舉手：{secondRaisedGroupId} 組</span>}
            {!firstRaisedGroupId && !secondRaisedGroupId && <span>目前無舉手</span>}
          </div>
          {!classActive ? (
            <div style={{ padding: 16, backgroundColor: '#fff2e8', border: '1px solid #ffbb96', borderRadius: 6, color: '#d46b08', textAlign: 'center' }}>
              <strong>⚠️ 課程尚未啟動</strong>
              <p style={{ margin: '8px 0 0 0' }}>請等待教師啟動課程後查看座位表。</p>
            </div>
          ) : (
            <SeatGridDisplay 
              classId={classId} 
              interactive={false} 
              firstRaisedGroupId={firstRaisedGroupId}
              secondRaisedGroupId={secondRaisedGroupId}
            />
          )}
        </div>
      )}

      {/* 即時舉手順序 */}
      <HandsQueue classId={classId} />

      {/* 即時積分榜 */}
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 6, border: '1px solid #eee' }}>
        <h2 style={{ marginTop: 0 }}>即時積分榜</h2>
        <Scoreboard classId={classId} />
      </div>

      {/* 登出按鈕 */}
      <div>
        <button
          onClick={async () => {
            await logout()
            router.push('/signin')
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
