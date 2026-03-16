"use client"
import React, { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { addDoc, collection, serverTimestamp, query, where, onSnapshot, updateDoc, doc } from "../lib/firestoreWrapper"

export default function RaiseHandButton({ classId, group, onRaised }) {
  const [loading, setLoading] = useState(false)
  const [raised, setRaised] = useState(false)
  const [activeDocId, setActiveDocId] = useState(null)
  const [participantId, setParticipantId] = useState(null)

  useEffect(() => {
    // allow overriding participant id via URL param for testing (e.g. ?participantId=p_123)
    let id = null
    try {
      const params = new URLSearchParams(window.location.search)
      id = params.get('participantId') || localStorage.getItem('participantId')
    } catch (e) {
      id = null
    }
    if (!id) {
      id = `p_${Date.now()}_${Math.floor(Math.random()*10000)}`
      try { localStorage.setItem('participantId', id) } catch (e) {}
    }
    setParticipantId(id)
  }, [])

  useEffect(() => {
    if (!participantId || !classId) return
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
    return () => unsub()
  }, [participantId, classId])

  const handleClick = async () => {
    if (raised || loading) return
    setLoading(true)
    try {
      await addDoc(
        collection(db, "hands_raised"),
        { classId, group, ownerId: participantId, timestamp: serverTimestamp(), active: true }
      )
      if (onRaised) onRaised()
    } catch (err) {
      console.error("舉手錯誤：", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!activeDocId || loading) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'hands_raised', activeDocId), { active: false, cancelled: true })
      // local state will update via onSnapshot listener
    } catch (err) {
      console.error('取消舉手錯誤：', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {!raised ? (
        <button onClick={handleClick} disabled={loading}>
          {loading ? "提交中…" : "舉手"}
        </button>
      ) : (
        <div>
          <span style={{ marginRight: 8 }}>已舉手</span>
          <button onClick={handleCancel} disabled={loading}>取消舉手</button>
        </div>
      )}
    </div>
  )
}
