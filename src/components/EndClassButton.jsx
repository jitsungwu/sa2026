"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { db } from '../firebaseClient'
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from '../lib/firestoreWrapper'

export default function EndClassButton({ classId, classOwner, currentUser }) {
  const router = useRouter()

  const handleEnd = async () => {
    // Only the class owner (activatedBy) may end the class
    if (!classId) return
    if (!currentUser) {
      alert('請先登入老師帳號後再結束課程。')
      return
    }

    if (classOwner) {
      if (currentUser.uid !== classOwner) {
        console.debug('EndClass denied: currentUser.uid=', currentUser.uid, 'classOwner=', classOwner)
        alert('僅有啟動課程的老師可結束上課，請以啟動時使用的老師帳號登入。')
        return
      }
    } else {
      // No owner recorded — ask for explicit confirmation from logged-in user
      const ok = confirm('此課程沒有紀錄啟動者。以目前登入的老師帳號結束課程？')
      if (!ok) return
    }

    try {
      if (db && classId) {
        try {
          // 清除舉手紀錄
          const colRef = collection(db, 'hands_raised')
          const q = query(colRef, where('classId', '==', classId), where('active', '==', true))
          const snap = await getDocs(q)
          const updates = snap.docs.map(d => updateDoc(doc(db, 'hands_raised', d.id), { active: false, resolved: true }))
          await Promise.all(updates)
        } catch (err) {
          console.error('無法清除舉手紀錄', err)
        }

        try {
          await setDoc(doc(db, 'classes', classId), { active: false, endedAt: serverTimestamp() }, { merge: true })
        } catch (err) {
          console.error('無法在 Firestore 標記課程為結束', err)
        }
      }
    } catch (e) {
      // continue to clearing local state
    }

    // class state is stored in Firestore; no client-side localStorage to clear

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
