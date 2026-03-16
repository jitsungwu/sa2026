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
    // default wrapper: award 1 point
    await handleAwardWithPoints(hand, 1)
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

  const handleAwardWithPoints = async (hand, points) => {
    try {
      // Create a participation log that references the original hand document
      await addDoc(collection(db, 'participation_logs'), {
        classId: hand.classId || classId,
        group: hand.group,
        timestamp: serverTimestamp(),
        points,
        handRef: doc(db, 'hands_raised', hand.id)
      })
      await updateDoc(doc(db, 'hands_raised', hand.id), { active: false, resolved: true })
    } catch (err) {
      console.error('加分錯誤：', err)
    }
  }

  const awardArbitraryGroup = async (group, points) => {
    try {
      if (!group) {
        alert('請輸入組別編號')
        return
      }
      // Create a participation log for the specified group (no handRef)
      await addDoc(collection(db, 'participation_logs'), {
        classId: classId,
        group,
        timestamp: serverTimestamp(),
        points
      })
    } catch (err) {
      console.error('指定組別加分錯誤：', err)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>即時舉手名單</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={handleResetAll}>全部重置</button>
      </div>

      <div style={{ marginBottom: 12, padding: 8, border: '1px solid #ddd' }}>
        <strong>指定組別給分（老師）</strong>
        <div style={{ marginTop: 8 }}>
          <label style={{ marginRight: 8 }}>組別：</label>
          <input id="arb-group-input" type="text" style={{ width: 80, marginRight: 12 }} />
          <label style={{ marginRight: 8 }}>分數 (1-5)：</label>
          <input id="arb-points-input" type="number" min={1} max={5} defaultValue={1} style={{ width: 60, marginRight: 12 }} />
          <button onClick={() => {
            const g = document.getElementById('arb-group-input').value
            const p = Number(document.getElementById('arb-points-input').value || 1)
            if (isNaN(p) || p < 1 || p > 5) {
              alert('分數必須介於 1 到 5 之間')
              return
            }
            awardArbitraryGroup(g, p)
          }}>給指定組別分數</button>
        </div>
      </div>
      {hands.length === 0 ? (
        <div>目前沒有舉手紀錄</div>
      ) : (
        <ol>
          {hands.map((h, idx) => (
            <li key={h.id} style={{ marginBottom: 8 }}>
              <strong>組別：</strong> {h.group} — <strong>時間：</strong> {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleString() : String(h.timestamp)}
              <div style={{ display: 'inline-block', marginLeft: 12 }}>
                {/* 首發專用：允許 0-3 分 */}
                {idx === 0 && (
                  <button onClick={async () => {
                    const input = window.prompt('首發給分（0 到 3 分）', '1')
                    if (input === null) return
                    const v = Number(input)
                    if (isNaN(v) || v < 0 || v > 3) { alert('分數必須介於 0 到 3 之間'); return }
                    await handleAwardWithPoints(h, v)
                  }}>首發給分</button>
                )}
                {/* 一般給分：允許 1-5 分 */}
                <button onClick={async () => {
                  const input = window.prompt('給分（1 到 5 分）', '1')
                  if (input === null) return
                  const v = Number(input)
                  if (isNaN(v) || v < 1 || v > 5) { alert('分數必須介於 1 到 5 之間'); return }
                  await handleAwardWithPoints(h, v)
                }} style={{ marginLeft: 8 }}>給分</button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
