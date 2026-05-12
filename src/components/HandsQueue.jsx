"use client"
import React, { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { collection, query, where, orderBy, onSnapshot } from "../lib/firestoreWrapper"

export default function HandsQueue({ classId }) {
  const [hands, setHands] = useState([])

  useEffect(() => {
    if (!classId || !db) return

    const col = collection(db, "classes", classId, "hands_raised")
    const q = query(col, where("active", "==", true), orderBy("timestamp", "asc"))

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const ordered = snapshot.docs.map((doc, index) => ({
          id: doc.id,
          order: index + 1,
          ...doc.data()
        }))
        setHands(ordered)
      },
      (err) => {
        console.error('HandsQueue snapshot error:', err)
      }
    )

    return () => unsub()
  }, [classId])

  return (
    <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>目前舉手順序</h2>
      {hands.length === 0 ? (
        <div style={{ color: '#666' }}>目前沒有舉手紀錄</div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {hands.map((hand) => (
            <li key={hand.id} style={{ marginBottom: 8 }}>
              {hand.group} 組
              {hand.timestamp?.toDate ? ` • ${hand.timestamp.toDate().toLocaleTimeString()}` : ''}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
