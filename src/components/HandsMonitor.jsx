"use client"
import React, { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs } from "../lib/firestoreWrapper"

export default function HandsMonitor({ classId }) {
  const [hands, setHands] = useState([])

  useEffect(() => {
    if (!classId) return
    const col = collection(db, "hands_raised")
    const q = query(col, where("classId", "==", classId), where("active", "==", true), orderBy("timestamp", "asc"))
    const unsub = onSnapshot(
      q,
      (snapshot) => setHands(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Hands monitor snapshot error:', err)
    )
    return () => unsub()
  }, [classId])

  const handleAward = async (hand) => {
    try {
      await addDoc(collection(db, 'participation_logs'), {
        classId: hand.classId || classId,
        group: hand.group,
        timestamp: serverTimestamp(),
        points: 1
      })
      await updateDoc(doc(db, 'hands_raised', hand.id), { active: false, resolved: true })
    } catch (err) {
      console.error('加分錯誤：', err)
    }
  }

  const handleResetAll = async () => {
    try {
      const colRef = collection(db, 'hands_raised')
      const q = query(colRef, where('classId', '==', classId), where('active', '==', true))
      const snap = await getDocs(q)
      const updates = snap.docs.map(d => updateDoc(doc(db, 'hands_raised', d.id), { active: false, resolved: true }))
      await Promise.all(updates)
    } catch (err) {
      console.error('重置錯誤：', err)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>即時舉手名單</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={handleResetAll}>全部重置</button>
      </div>
      {hands.length === 0 ? (
        <div>目前沒有舉手紀錄</div>
      ) : (
        <ol>
          {hands.map(h => (
            <li key={h.id} style={{ marginBottom: 8 }}>
              <strong>組別：</strong> {h.group} — <strong>時間：</strong> {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleString() : String(h.timestamp)}
              <div style={{ display: 'inline-block', marginLeft: 12 }}>
                <button onClick={() => handleAward(h)}>加分</button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
