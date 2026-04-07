"use client"
import React, { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs } from "../lib/firestoreWrapper"

export default function HandsMonitor({ classId, isOwner }) {
  const [hands, setHands] = useState([])
  const [presentingGroup, setPresentingGroup] = useState(null)
  const [presentingScorerOwnerId, setPresentingScorerOwnerId] = useState(null)

  useEffect(() => {
    if (!classId) return
    const col = collection(db, "hands_raised")
    const q = query(col, where("classId", "==", classId), where("active", "==", true), orderBy("timestamp", "asc"))
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        const byOwner = {}
        all.forEach(h => { if (h && h.ownerId) byOwner[h.ownerId] = h })
        const unique = Object.values(byOwner)
        setHands(unique)
      },
      (err) => console.error('Hands monitor snapshot error:', err)
    )
    return () => unsub()
  }, [classId])

  useEffect(() => {
    if (!classId || !db) return
    const classRef = doc(db, 'classes', classId)
    const unsubClass = onSnapshot(classRef, (snap) => {
      if (snap && typeof snap.data === 'function') {
        const data = snap.data() || {}
        setPresentingGroup(data.presentingGroupId || null)
        setPresentingScorerOwnerId(data.presentingScorerOwnerId || null)
      } else {
        setPresentingGroup(null)
        setPresentingScorerOwnerId(null)
      }
    }, (err) => console.error('class doc snapshot error:', err))

    return () => unsubClass()
  }, [classId, db])

  const handleAward = async (hand) => {
    // default wrapper: award 1 point
    await handleAwardWithPoints(hand, 1)
  }

  const handleResetAll = async () => {
    if (!isOwner) { alert('僅老師可重置舉手紀錄'); return }
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
    if (!isOwner) { alert('僅老師可給分'); return }
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
    if (!isOwner) { alert('僅老師可給分'); return }
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

  const setPresenting = async (group) => {
    if (!isOwner) { alert('僅老師可設定報告組'); return }
    if (!group || String(group).trim() === '') { alert('請輸入有效的組別 ID（請保留前置零）'); return }
    try {
      await updateDoc(doc(db, 'classes', classId), { presentingGroupId: String(group).trim() })
    } catch (err) {
      console.error('設定報告組錯誤：', err)
    }
  }

  const endPresenting = async () => {
    if (!isOwner) { alert('僅老師可結束報告'); return }
    try {
      await updateDoc(doc(db, 'classes', classId), { presentingGroupId: null, presentingScorerOwnerId: null })
    } catch (err) {
      console.error('結束報告錯誤：', err)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>即時舉手名單</h2>
      {isOwner && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button onClick={handleResetAll}>全部重置</button>
          </div>

          <div style={{ marginBottom: 12, padding: 8, border: '1px solid #f0ad4e', background: '#fffaf0' }}>
            <strong>管理報告組（老師）</strong>
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ marginRight: 8 }}>目前報告組：</span>
                <strong>{presentingGroup || '無'}</strong>
                {presentingGroup && (
                  <>
                    {!presentingScorerOwnerId ? (
                      <span style={{ marginLeft: 12, color: '#d46b08', fontWeight: 'bold' }}>⏳ 尚未指定評分者</span>
                    ) : (
                      <span style={{ marginLeft: 12, color: '#52c41a', fontWeight: 'bold' }}>✓ 評分者：{presentingScorerOwnerId}</span>
                    )}
                    <button style={{ marginLeft: 12 }} onClick={endPresenting}>結束報告</button>
                  </>
                )}
              </div>
              <label style={{ marginRight: 8 }}>設為報告組（請保留前置零，例如 04）：</label>
              <input id="presenting-group-input" type="text" style={{ width: 80, marginRight: 12 }} />
              <button onClick={() => {
                const g = document.getElementById('presenting-group-input').value
                setPresenting(g)
              }}>設為報告組</button>
            </div>
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
        </>
      )}
      {hands.length === 0 ? (
        <div>目前沒有舉手紀錄</div>
      ) : (
        <ol>
          {hands.map((h, idx) => (
            <li key={h.id} data-owner={h.ownerId} style={{ marginBottom: 8 }}>
              <strong>組別：</strong> {h.group} — <strong>時間：</strong> {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleString() : String(h.timestamp)}
                <div style={{ display: 'inline-block', marginLeft: 12 }}>
                  {/* 首發專用：允許 0-3 分（只有老師顯示操作） */}
                  {idx === 0 && isOwner && (
                    <button onClick={async () => {
                      const input = window.prompt('評分（0 到 3 分）', '1')
                      if (input === null) return
                      const v = Number(input)
                      if (isNaN(v) || v < 0 || v > 3) { alert('分數必須介於 0 到 3 之間'); return }
                      await handleAwardWithPoints(h, v)
                    }}>評分</button>
                  )}
                </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
