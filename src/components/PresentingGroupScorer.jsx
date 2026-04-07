"use client"
import React, { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { collection, query, where, onSnapshot } from "../lib/firestoreWrapper"

export default function PresentingGroupScorer({ classId, group, presentingScorerOwnerId }) {
  const [hands, setHands] = useState([]) // Array of raised hands
  const [loading, setLoading] = useState(false)
  const [scoringHand, setScoringHand] = useState(null) // Currently scoring hand
  const [selectedScore, setSelectedScore] = useState(0)
  const [studentAccount, setStudentAccount] = useState(null)
  const [error, setError] = useState(null)

  // Get student account from localStorage
  useEffect(() => {
    try {
      const authStr = typeof window !== 'undefined' ? localStorage.getItem('studentAuth') : null
      if (authStr) {
        const auth = JSON.parse(authStr)
        setStudentAccount(auth.account || null)
      }
    } catch (e) {
      console.error('Failed to get student account:', e)
    }
  }, [])

  // Listen for raised hands in current group
  useEffect(() => {
    if (!classId || !group) return

    try {
      // Convert group to match Firestore format
      const groupStr = String(group)
      const col = collection(db, 'hands_raised')
      const q = query(
        col,
        where('classId', '==', classId),
        where('group', '==', groupStr),
        where('active', '==', true)
      )

      const unsub = onSnapshot(q, (snapshot) => {
        const hands = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }))
        // Sort by timestamp (earliest first)
        hands.sort((a, b) => a.timestamp - b.timestamp)
        setHands(hands)
      }, (err) => {
        console.error('Listen hands error:', err)
      })

      return () => unsub()
    } catch (e) {
      console.error('subscribe hands error:', e)
    }
  }, [classId, group, db])

  const handleScore = async (handId) => {
    if (!handId || selectedScore < 0 || selectedScore > 3) {
      setError('請選擇 0-3 分')
      return
    }

    // Check authorization using student account
    if (studentAccount !== presentingScorerOwnerId) {
      setError('非報告組組長，無法給分')
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Call API to score
      const response = await fetch('/api/score-hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          handId,
          points: selectedScore,
          givenBy: studentAccount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '給分失敗')
      }

      setScoringHand(null)
      setSelectedScore(0)
    } catch (err) {
      console.error('Score error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!presentingScorerOwnerId) {
    return <div style={{ color: '#999' }}>尚未指定評分者</div>
  }

  return (
    <div style={{ marginTop: 16, padding: 12, backgroundColor: '#e7f3ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
      <h3 style={{ marginTop: 0, color: '#0050b3' }}>✍️ 給分介面 (評分者：{presentingScorerOwnerId})</h3>

      {/* Authorization check */}
      {studentAccount && presentingScorerOwnerId && studentAccount !== presentingScorerOwnerId && (
        <div style={{ padding: 8, backgroundColor: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 4, marginBottom: 12, color: '#c41d7f' }}>
          ⚠️ 你不是評分者，無法給分
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{ padding: 8, backgroundColor: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 4, marginBottom: 12, color: '#cf1322' }}>
          ❌ {error}
        </div>
      )}

      {hands.length === 0 ? (
        <div style={{ color: '#999', fontStyle: 'italic' }}>目前沒有學生舉手</div>
      ) : (
        <div>
          <p style={{ marginBottom: 12, fontSize: '0.9em', color: '#666' }}>
            等待評分的舉手：{hands.length} 個
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hands.map((hand, idx) => (
              <div
                key={hand.id}
                style={{
                  padding: 8,
                  backgroundColor: scoringHand?.id === hand.id ? '#fff7e6' : '#f0f2f5',
                  borderRadius: 4,
                  border: scoringHand?.id === hand.id ? '2px solid #faad14' : '1px solid #d9d9d9',
                  cursor: studentAccount === presentingScorerOwnerId ? 'pointer' : 'not-allowed',
                  opacity: studentAccount === presentingScorerOwnerId ? 1 : 0.6,
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  if (studentAccount === presentingScorerOwnerId) {
                    setScoringHand(hand)
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>
                    #{idx + 1} - 組別 {hand.group}
                  </span>
                  <span style={{ fontSize: '0.85em', color: '#999' }}>
                    {hand.timestamp?.toLocaleTimeString?.() || '時間'}
                  </span>
                </div>

                {scoringHand?.id === hand.id && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #d9d9d9' }}>
                    <div style={{ marginBottom: 8 }}>選擇分數：</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      {[0, 1, 2, 3].map(score => (
                        <button
                          key={score}
                          onClick={() => setSelectedScore(score)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: selectedScore === score ? '#1890ff' : '#f0f0f0',
                            color: selectedScore === score ? '#fff' : '#000',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleScore(hand.id)}
                        disabled={loading || selectedScore < 0 || selectedScore > 3}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: loading ? '#999' : '#52c41a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {loading ? '提交中...' : '確認給分'}
                      </button>
                      <button
                        onClick={() => { setScoringHand(null); setError(null) }}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: '#f5f5f5',
                          color: '#000',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
