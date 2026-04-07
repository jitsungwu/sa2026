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
  const [activeTab, setActiveTab] = useState('seat') // 'seat', 'raise', 'reporting'
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
          <h1>未登入</h1>
          <p>未登入或登入已過期，請重新登入。</p>
          <a href="/signin" style={{ color: '#0070f3', textDecoration: 'underline' }}>
            回到登入頁面
          </a>
        </>
      ) : (
        <>
          <h1>學生互動儀表板</h1>
      
      {/* 學生基本資訊 */}
      <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6 }}>
        <p><strong>學號：</strong> {student.account}</p>
        <p><strong>姓名：</strong> {student.name || '未提供'}</p>
        <p><strong>組別：</strong> {student.groupId}</p>
        <p><strong>班級：</strong> {student.classId}</p>
        <p><strong>座位位置：</strong> {seatInfo ? `${seatInfo.zone}第 ${seatInfo.row} 排` : '未選座位'}</p>
      </div>

      {/* Tab 導航 */}
      <div style={{ marginBottom: 20, borderBottom: '2px solid #ddd', display: 'flex', gap: 0 }}>
        <button
          onClick={() => setActiveTab('seat')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'seat' ? '#1890ff' : '#f0f0f0',
            color: activeTab === 'seat' ? '#fff' : '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'seat' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          📍 座位信息
        </button>
        <button
          onClick={() => setActiveTab('raise')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'raise' ? '#1890ff' : '#f0f0f0',
            color: activeTab === 'raise' ? '#fff' : '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'raise' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          ✋ 舉手/積分
        </button>
        {isUserInPresentingGroup() && (
          <button
            onClick={() => setActiveTab('reporting')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'reporting' ? '#52c41a' : '#f0f0f0',
              color: activeTab === 'reporting' ? '#fff' : '#000',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'reporting' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            📊 報告組評分
          </button>
        )}
      </div>

      {/* Tab 內容 */}
      <div style={{ marginBottom: 20 }}>
        {/* 座位信息 Tab */}
        {activeTab === 'seat' && (
          <div>
            <h2>座位信息</h2>
            {seatInfo ? (
              <div style={{ padding: 12, backgroundColor: '#e6f7ff', borderRadius: 4 }}>
                <p><strong>位置：</strong> {seatInfo.zone}第 {seatInfo.row} 排</p>
                <p style={{ fontSize: '0.9em', color: '#666' }}>提示：需要更改座位請先<a href={`/class/${classId}/seat-selection`}>重新選擇</a></p>
              </div>
            ) : (
              <div style={{ padding: 12, backgroundColor: '#fff7e6', borderRadius: 4, color: '#856404' }}>
                <p>⚠️ 未選座位，請立即<a href={`/class/${classId}/seat-selection`} style={{ color: '#0050b3' }}>選擇座位</a></p>
              </div>
            )}
          </div>
        )}

        {/* 舉手/積分 Tab */}
        {activeTab === 'raise' && (
          <div>
            <h2>舉手/積分榜</h2>
            <div style={{ marginBottom: 16 }}>
              <h3>舉手操制</h3>
              <RaiseHandButton classId={classId} group={student.groupId} />
            </div>
            <div>
              <h3>即時積分榜</h3>
              <Scoreboard classId={classId} />
            </div>
          </div>
        )}

        {/* 報告組評分 Tab */}
        {activeTab === 'reporting' && isUserInPresentingGroup() && (
          <div>
            <h2>報告組評分介面</h2>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff3cd', borderRadius: 4 }}>
              <p style={{ margin: 0, color: '#856404' }}>
                ℹ️ 你所在的 {student.groupId} 組正在報告中
              </p>
            </div>
            <RaiseHandButton classId={classId} group={student.groupId} />
            <PresentingGroupScorer 
              classId={classId} 
              group={student.groupId} 
              presentingScorerOwnerId={presentingScorerOwnerId} 
            />
            <div style={{ marginTop: 20 }}>
              <h3>班級積分榜</h3>
              <Scoreboard classId={classId} />
            </div>
          </div>
        )}
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
