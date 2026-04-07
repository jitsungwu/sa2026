"use client"
import React, { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { addDoc, collection, serverTimestamp, query, where, onSnapshot, updateDoc, doc, getDocs } from "../lib/firestoreWrapper"

export default function RaiseHandButton({ classId, group, onRaised }) {
  const [loading, setLoading] = useState(false)
  const [raised, setRaised] = useState(false)
  const [activeDocId, setActiveDocId] = useState(null)
  const [participantId, setParticipantId] = useState(null)
  const [presentingGroupId, setPresentingGroupId] = useState(null)
  const [presentingScorerOwnerId, setPresentingScorerOwnerId] = useState(null)

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
    if (!participantId || !classId) return

    const unsubs = []

    // listen for presentingGroupId and presentingScorerOwnerId changes
    try {
      const classRef = doc(db, 'classes', classId)
      const unsubClass = onSnapshot(classRef, (snap) => {
        if (snap && typeof snap.data === 'function') {
          const data = snap.data() || {}
          setPresentingGroupId(data.presentingGroupId || null)
          setPresentingScorerOwnerId(data.presentingScorerOwnerId || null)
        } else {
          setPresentingGroupId(null)
          setPresentingScorerOwnerId(null)
        }
      }, (err) => console.error('Class listen error:', err))
      unsubs.push(unsubClass)
    } catch (e) {
      console.error('subscribe class doc error:', e)
    }

    // listen for hands_raised changes
    try {
      const col = collection(db, 'hands_raised')
      const q = query(col, where('classId', '==', classId), where('ownerId', '==', participantId), where('active', '==', true))
      const unsub = onSnapshot(q, (snapshot) => {
        const has = snapshot.docs.length > 0
        setRaised(has)
        if (has) {
          setActiveDocId(snapshot.docs[0].id)
        } else {
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
  }, [participantId, classId])

  const handleClick = async () => {
    // If this group is currently presenting and no scorer assigned, prevent raising
    if (isUserInPresentingGroup() && !presentingScorerOwnerId) {
      alert('目前尚未指定評分者，報告組無法舉手')
      return
    }
    if (raised || loading) return
    setLoading(true)
    try {
      await addDoc(
        collection(db, "hands_raised"),
        { classId, group, ownerId: participantId, timestamp: new Date(), active: true }
      )
      if (onRaised) onRaised()
    } catch (err) {
      console.error("舉手錯誤：", err)
    } finally {
      setLoading(false)
    }
  }

  const claimScorer = async () => {
    if (!classId || !participantId) return
    try {
      await updateDoc(doc(db, 'classes', classId), { presentingScorerOwnerId: participantId })
    } catch (err) {
      console.error('claim scorer error:', err)
      alert('設定評分者失敗')
    }
  }

  const handleCancel = async () => {
    if (loading) return
    setLoading(true)
    try {
      // Re-query active hands for this participant to ensure we update the correct documents
      const colRef = collection(db, 'hands_raised')
      const q = query(colRef, where('classId', '==', classId), where('ownerId', '==', participantId), where('active', '==', true))
      const snap = await getDocs(q)
      const updates = snap.docs.map(d => updateDoc(doc(db, 'hands_raised', d.id), { active: false, cancelled: true }))
      await Promise.all(updates)
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
      {/* If this group is currently presenting and no scorer assigned, show claim button and block raising */}
      {isUserInPresentingGroup() && !presentingScorerOwnerId ? (
        <div>
          <div style={{ marginBottom: 8 }}>目前報告中：等待指定評分者，無法舉手</div>
          <button onClick={claimScorer} disabled={loading}>我負責評分</button>
        </div>
      ) : isUserInPresentingGroup() && presentingScorerOwnerId ? (
        <div style={{ color: '#666', fontSize: '0.9em' }}>
          ✓ 報告組成員無法舉手（給分者已指定）
        </div>
      ) : (!raised ? (
        <button onClick={handleClick} disabled={loading}>
          {loading ? "提交中…" : "舉手"}
        </button>
      ) : (
        <div>
          <span style={{ marginRight: 8 }}>已舉手</span>
          <button onClick={handleCancel} disabled={loading}>取消舉手</button>
        </div>
      ))}
    </div>
  )
}
