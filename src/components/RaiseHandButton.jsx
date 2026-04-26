"use client"
import React, { useEffect, useState } from "react"
import { useStudentAuth } from "../contexts/StudentAuthContext"
import { db } from "../firebaseClient"
import { setDoc, collection, serverTimestamp, query, where, onSnapshot, updateDoc, doc, getDocs } from "../lib/firestoreWrapper"

export default function RaiseHandButton({ classId, group, onRaised }) {
  const { studentInfo } = useStudentAuth()
  const [loading, setLoading] = useState(false)
  const [raised, setRaised] = useState(false)
  const [activeDocId, setActiveDocId] = useState(null)
  const [participantId, setParticipantId] = useState(null)
  const [presentingGroupId, setPresentingGroupId] = useState(null)
  const [presentingScorerOwnerId, setPresentingScorerOwnerId] = useState(null)
  const [generalRaisingEnabled, setGeneralRaisingEnabled] = useState(true)

  // Get student account from Context (studentInfo.account)
  const studentAccount = studentInfo?.account

  useEffect(() => {
    // allow overriding participant id via URL param for testing (e.g. ?participantId=p_123)
    let id = null
    try {
      const params = new URLSearchParams(window.location.search)
      id = params.get('participantId') || null
    } catch (e) {
      id = null
    }
    if (!id) {
      id = `p_${Date.now()}_${Math.floor(Math.random()*10000)}`
    }
    setParticipantId(id)
  }, [])

  useEffect(() => {
    if (!participantId || !classId || !group || !db) return

    const unsubs = []

    // listen for presentingGroupId and presentingScorerOwnerId changes
    try {
      const classRef = doc(db, 'classes', classId)
      const unsubClass = onSnapshot(classRef, (snap) => {
        if (snap && typeof snap.data === 'function') {
          const data = snap.data() || {}
          setPresentingGroupId(data.presentingGroupId || null)
          setPresentingScorerOwnerId(data.presentingScorerOwnerId || null)
          // isGeneralRaisingEnabled defaults to true when undefined
          setGeneralRaisingEnabled(data.isGeneralRaisingEnabled !== false)
        } else {
          setPresentingGroupId(null)
          setPresentingScorerOwnerId(null)
          setGeneralRaisingEnabled(true)
        }
      }, (err) => console.error('Class listen error:', err))
      unsubs.push(unsubClass)
    } catch (e) {
      console.error('subscribe class doc error:', e)
    }

    // listen for hands_raised changes (document ID is group)
    try {
      const handRef = doc(db, 'classes', classId, 'hands_raised', group)
      const unsub = onSnapshot(handRef, (snap) => {
        if (snap && typeof snap.data === 'function' && snap.exists()) {
          const data = snap.data()
          const has = data && data.active === true
          setRaised(has)
          if (has) {
            setActiveDocId(snap.id)
          } else {
            setActiveDocId(null)
          }
        } else {
          setRaised(false)
          setActiveDocId(null)
        }
      }, (err) => {
        console.error('RaiseHand listen error:', err)
      })
      unsubs.push(unsub)
    } catch (e) {
      console.error('hands_raised listen error:', e)
    }

    return () => {
      unsubs.forEach(unsub => typeof unsub === 'function' && unsub())
    }
  }, [participantId, classId, group, db])

  const handleClick = async () => {
    // If global raising disabled or a group is presenting, disallow raising
    if (!generalRaisingEnabled || presentingGroupId) {
      alert('目前尚未開放發問')
      return
    }
    if (raised || loading) return
    setLoading(true)
    try {
      // 以 group 为文档 ID 写入到 classes/{classId}/hands_raised 子集合
      // 这样每个 group 在一个 class 中只能有一条举手记录
      await setDoc(
        doc(db, 'classes', classId, 'hands_raised', group),
        { classId, group, ownerId: participantId, timestamp: serverTimestamp(), active: true }
      )
      if (onRaised) onRaised()
    } catch (err) {
      console.error("舉手錯誤：", err)
    } finally {
      setLoading(false)
    }
  }

  const claimScorer = async () => {
    if (!classId || !studentAccount) {
      alert('無法取得學生資訊')
      return
    }
    try {
      setLoading(true)
      await updateDoc(doc(db, 'classes', classId), { presentingScorerOwnerId: studentAccount })
      console.log('✅ Scorer claimed:', studentAccount)
      // Wait a moment for Firestore to propagate the change
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.error('claim scorer error:', err)
      alert('設定評分者失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (loading) return
    setLoading(true)
    try {
      // 根据 group 取消举手（文档 ID 是 group）
      await updateDoc(
        doc(db, "classes", classId, "hands_raised", group),
        { active: false, cancelled: true }
      )
      // local state will update via onSnapshot listener
    } catch (err) {
      console.error('取消舉手錯誤：', err)
    } finally {
      setLoading(false)
    }
  }

  // Normalize group values for comparison (handle "05" vs "5" mismatch)
  const isUserInPresentingGroup = () => {
    if (!presentingGroupId || !group) return false
    // Convert both to numbers for comparison to handle "05" vs "5" case
    const presentingNum = parseInt(String(presentingGroupId), 10)
    const groupNum = parseInt(String(group), 10)
    return presentingNum === groupNum && !isNaN(presentingNum) && !isNaN(groupNum)
  }

  return (
    <div>
      {/* If a group is currently presenting, show presenting info and keep raising locked */}
      {presentingGroupId ? (
        isUserInPresentingGroup() ? (
          <div>
            <div style={{ marginBottom: 8, color: '#d46b08' }}>⏳ 報告組</div>
            {/* Show claim button only if not already claimed as scorer */}
            {presentingScorerOwnerId && studentAccount === presentingScorerOwnerId ? (
              <div style={{ color: '#52c41a' }}>✓ 你是評分者</div>
            ) : (
              <button onClick={claimScorer} disabled={loading}>我負責評分</button>
            )}
          </div>
        ) : (
          <div style={{ color: '#cf1322', fontSize: '0.9em' }}>📢 尚未開放發問</div>
        )
      ) : (
        // No presenting group; respect generalRaisingEnabled
        !raised ? (
          generalRaisingEnabled ? (
            <button onClick={handleClick} disabled={loading}>
              {loading ? "提交中…" : "舉手"}
            </button>
          ) : (
            <div style={{ color: '#cf1322', fontSize: '0.9em' }}>📢 尚未開放發問</div>
          )
        ) : (
          <div>
            <span style={{ marginRight: 8 }}>已舉手</span>
            <button onClick={handleCancel} disabled={loading}>取消舉手</button>
          </div>
        )
      )}
    </div>
  )
}
