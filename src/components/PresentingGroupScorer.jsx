"use client"
import React, { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from "../lib/firestoreWrapper"

export default function PresentingGroupScorer({ classId, group, presentingScorerOwnerId }) {
  const [hands, setHands] = useState([]) // Array of raised hands
  const [loading, setLoading] = useState(false)
  const [scoringHand, setScoringHand] = useState(null) // Currently scoring hand
  const [selectedScore, setSelectedScore] = useState(0)

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
  }, [classId, group])

  const handleScore = async (handId) => {
    if (!handId || selectedScore < 0 || selectedScore > 3) {
      alert('請選擇 0-3 分')
      return
    }

    setLoading(true)
    try {
      // Mark hand as resolved with the score
      await updateDoc(doc(db, 'hands_raised', handId), {
        active: false,
        resolved: true,
        resolvedScore: selectedScore,
        resolvedBy: presentingScorerOwnerId,
        resolvedAt: serverTimestamp()
      })

      // Add to participation_logs
      const hand = hands.find(h => h.id === handId)
      if (hand) {
        await addDoc(collection(db, 'participation_logs'), {
          classId,
          group: hand.group,
          points: selectedScore,
          timestamp: serverTimestamp(),
          handRef: handId,
          givenBy: presentingScorerOwnerId,
          givenByRole: 'presenting_scorer'
        })
      }

      setScoringHand(null)
      setSelectedScore(0)
    } catch (err) {
      console.error('Score error:', err)
      alert('給分失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!presentingScorerOwnerId) {
    return <div style={{ color: '#999' }}>等待評分者聲稱...</div>
  }

  return (
    <div style={{ marginTop: 16, padding: 12, backgroundColor: '#e7f3ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
      <h3 style={{ marginTop: 0, color: '#0050b3' }}>✍️ 給分介面</h3>

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
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setScoringHand(hand)}
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
                          backgroundColor: '#52c41a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {loading ? '提交中...' : '確認給分'}
                      </button>
                      <button
                        onClick={() => setScoringHand(null)}
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
