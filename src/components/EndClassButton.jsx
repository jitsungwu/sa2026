"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { db } from '../firebaseClient'
import { doc, setDoc, serverTimestamp } from '../lib/firestoreWrapper'

export default function EndClassButton({ classId }) {
  const router = useRouter()

  const handleEnd = async () => {
    try {
      if (db && classId) {
        try {
          await setDoc(doc(db, 'classes', classId), { active: false, endedAt: serverTimestamp() }, { merge: true })
        } catch (err) {
          console.error('無法在 Firestore 標記課程為結束', err)
        }
      }
    } catch (e) {
      // continue to clearing local state
    }

    try {
      window.localStorage.removeItem('activeClass')
      window.localStorage.removeItem('selectedGroup')
    } catch (e) {}

    try {
      window.location.href = '/'
    } catch (e) {
      router.replace('/')
    }
  }

  return (
    <button className="btn" onClick={handleEnd} style={{ marginLeft: 8 }}>結束上課</button>
  )
}
