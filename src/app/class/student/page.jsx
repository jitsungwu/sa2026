"use client"
import React, { useEffect, useState } from 'react'
import StudentClient from '../../../components/StudentClient'
import { db } from '../../../firebaseClient'
import { collection, query, where, onSnapshot } from '../../../lib/firestoreWrapper'

export default function StudentPage() {
  const [classId, setClassId] = useState(null)
  const [initialGroup, setInitialGroup] = useState(null)

  useEffect(() => {
    // read group from query param if provided
    try {
      const params = new URLSearchParams(window.location.search)
      const g = params.get('group')
      if (g) setInitialGroup(g)
    } catch (e) {}

    if (!db) return
    const q = query(collection(db, 'classes'), where('active', '==', true))
    const unsub = onSnapshot(q, (snap) => {
      if (snap && !snap.empty) {
        setClassId(snap.docs[0].id)
      } else {
        setClassId(null)
      }
    }, (err) => console.error('active class snapshot error:', err))

    return () => unsub()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>學生頁 — 班級：{classId || '尚未啟動'}</h1>
      <StudentClient classId={classId} initialGroup={initialGroup} />
    </div>
  )
}
