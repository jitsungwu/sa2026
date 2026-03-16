"use client"
import React, { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { collection, query, where, onSnapshot } from "../lib/firestoreWrapper"

export default function Scoreboard({ classId }) {
  const [scores, setScores] = useState({})

  useEffect(() => {
    if (!classId) return
    const col = collection(db, 'participation_logs')
    const q = query(col, where('classId', '==', classId))
    const unsub = onSnapshot(q, (snapshot) => {
      const agg = {}
      snapshot.docs.forEach(d => {
        const data = d.data()
        const g = data.group ?? '未分組'
        const pts = typeof data.points === 'number' ? data.points : 0
        agg[g] = (agg[g] || 0) + pts
      })
      setScores(agg)
    }, (err) => {
      console.error('Scoreboard snapshot error:', err)
    })
    return () => unsub()
  }, [classId])

  const groups = Object.keys(scores).sort()

  return (
    <div style={{ marginTop: 20 }}>
      <h3>即時積分榜</h3>
      {groups.length === 0 ? (
        <div>尚無積分紀錄</div>
      ) : (
        <ul>
          {groups.map(g => (
            <li key={g}>組別 {g}: {scores[g]} 分</li>
          ))}
        </ul>
      )}
    </div>
  )
}
