"use client"
import React, { useEffect, useState } from 'react'
import HandsMonitor from '../../../components/HandsMonitor'
import EndClassButton from '../../../components/EndClassButton'
import { auth, signInWithGoogle, signOutUser, db } from '../../../firebaseClient'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, doc, setDoc, serverTimestamp } from '../../../lib/firestoreWrapper'

export default function MonitorPage() {
  const [user, setUser] = useState(null)
  const [classId, setClassId] = useState(null)
  const [classes, setClasses] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const un = onAuthStateChanged(auth, (u) => setUser(u))
    return () => un()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const v = window.localStorage.getItem('activeClass')
    setClassId(v || null)
  }, [])

  useEffect(() => {
    const fallback = [
      { id: '2A', name: '二甲', groups: Array.from({ length: 10 }, (_, i) => i + 1) },
      { id: '2B', name: '二乙', groups: Array.from({ length: 15 }, (_, i) => i + 1) },
    ]

    async function load() {
      if (!db) {
        setClasses(fallback)
        setSelected(fallback[0]?.id)
        return
      }
      try {
        const snap = await getDocs(collection(db, 'classes'))
        if (!snap || snap.empty) {
          setClasses(fallback)
          setSelected(fallback[0]?.id)
          return
        }
        const items = snap.docs.map(d => ({ id: d.id, name: (d.data() && d.data().name) || d.id }))
        setClasses(items)
        setSelected(items[0]?.id)
      } catch (err) {
        console.error('讀取班級失敗，使用預設', err)
        setClasses(fallback)
        setSelected(fallback[0]?.id)
      }
    }

    load()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>監控頁 — 班級：{classId || '尚未啟動'}</h1>
        <div>
          <a className="btn" href="/class/student" style={{ marginRight: 8 }}>切換到學生頁</a>
          {user ? (
            <>
              <span style={{ marginRight: 8 }}>已登入：{user.displayName || user.email}</span>
              <button className="btn" onClick={() => signOutUser()} style={{ marginRight: 8 }}>登出</button>
            </>
          ) : (
            <button className="btn" onClick={() => signInWithGoogle()} style={{ marginRight: 8 }}>以 Google 登入</button>
          )}
          <EndClassButton classId={classId} />
        </div>
      </div>

      {/* 如果尚未啟動，讓老師可選擇並啟動班級 */}
      {!classId && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
          <label>選擇要啟動的班級：</label>
          <select value={selected || ''} onChange={(e) => setSelected(e.target.value)} style={{ marginLeft: 8 }}>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            style={{ marginLeft: 12 }}
            onClick={async () => {
              if (!selected) return
              try { window.localStorage.setItem('activeClass', selected) } catch (e) {}
              setClassId(selected)
              if (db) {
                try {
                  await setDoc(doc(db, 'classes', selected), {
                    name: classes.find(c => c.id === selected)?.name || selected,
                    active: true,
                    activatedAt: serverTimestamp(),
                    activatedBy: user?.uid || null,
                  }, { merge: true })
                } catch (err) {
                  console.error('無法在 Firestore 啟動班級', err)
                }
              }
            }}
          >啟動班級</button>
          <span style={{ marginLeft: 8, color: '#666' }}>{user ? '登入後可管理與結束課程' : '未登入：仍可啟動班級，但登入可取得管理權限'}</span>
        </div>
      )}

      <HandsMonitor classId={classId} />
    </div>
  )
}
