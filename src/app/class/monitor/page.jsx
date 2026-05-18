"use client"
import React, { useEffect, useState } from 'react'
import HandsMonitor from '../../../components/HandsMonitor'
import Scoreboard from '../../../components/Scoreboard'
import RecalculateButton from '../../../components/RecalculateButton'
import EndClassButton from '../../../components/EndClassButton'
import { auth, signInWithEmail, createAccountWithEmail, signOutUser, db } from '../../../firebaseClient'
import SignInForm from '../../../components/SignInForm'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, doc, setDoc, serverTimestamp, query, where, onSnapshot, deleteDoc, getDoc } from '../../../lib/firestoreWrapper'

export default function MonitorPage() {
  const ALLOWED_TEACHER_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_TEACHER_EMAIL || 'benwu@im.fju.edu.tw'
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [classId, setClassId] = useState(null)
  const [classes, setClasses] = useState([])
  const [selected, setSelected] = useState(null)
  const [classOwner, setClassOwner] = useState(null)
  const [showSignIn, setShowSignIn] = useState(false)
  const [isE2ETest, setIsE2ETest] = useState(() => {
    try {
      if (typeof window === 'undefined') return false
      return window.localStorage.getItem('E2E_DISABLE_AUTH') === '1'
    } catch (e) { return false }
  })

  useEffect(() => {
    const un = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthChecked(true)
    })
    return () => un()
  }, [])

  

  // If logged in but not the allowed UID, sign out automatically so user can switch accounts
  useEffect(() => {
    if (isE2ETest) return // skip auto sign-out in E2E no-auth mode
    if (!authChecked || !user) return

    const curUid = user.uid
    const curEmail = user.email || null
    // If a class owner is recorded, allow either the configured teacher email or the owner UID to remain signed in.
    if (classOwner) {
      if (curEmail !== ALLOWED_TEACHER_EMAIL && curUid !== classOwner) {
        try {
          alert('偵測到非授權老師帳號（目前 UID: ' + curUid + ', 目前 email: ' + curEmail + ', 授權 email: ' + ALLOWED_TEACHER_EMAIL + ', 班級擁有者: ' + (classOwner || '無') + '），將自動登出以便切換帳號。')
        } catch (e) {}
        signOutUser().finally(() => {
          try { window.location.href = '/' } catch (e) {}
        })
      }
    } else {
      // No owner recorded: fall back to configured allowed email only
      if (curEmail !== ALLOWED_TEACHER_EMAIL) {
        try {
          alert('偵測到非授權老師帳號（目前 UID: ' + curUid + ', 目前 email: ' + curEmail + ', 授權 email: ' + ALLOWED_TEACHER_EMAIL + '），將自動登出以便切換帳號。')
        } catch (e) {}
        signOutUser().finally(() => {
          try { window.location.href = '/' } catch (e) {}
        })
      }
    }
  }, [authChecked, user, isE2ETest, classOwner])

  useEffect(() => {
    if (!db) return
    const q = query(collection(db, 'classes'), where('active', '==', true))
    const unsub = onSnapshot(q, (snap) => {
      if (snap && !snap.empty) {
        const first = snap.docs[0]
        setClassId(first.id)
        try { setClassOwner(first.data().activatedBy || null) } catch (e) { setClassOwner(null) }
      } else {
        setClassId(null)
        setClassOwner(null)
      }
    }, (err) => console.error('classes active snapshot error:', err))

    return () => unsub()
  }, [db])

  useEffect(() => {
    if (!db || !classId) { setClassOwner(null); return }
    const ref = doc(db, 'classes', classId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap && snap.exists && snap.data()) {
        setClassOwner(snap.data().activatedBy || null)
      } else {
        setClassOwner(null)
      }
    }, (err) => console.error('class doc snapshot error:', err))

    return () => unsub()
  }, [classId])

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

  if (!authChecked) {
    return (
      <div style={{ padding: 20 }}>
        <div>檢查登入狀態中...</div>
      </div>
    )
  }

  if (!user && !isE2ETest) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ padding: 20, border: '1px solid #eee', borderRadius: 6 }}>
          <h2>需要登入</h2>
          <p>此頁為老師管理介面，請先使用帳號登入以進行管理動作。</p>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowSignIn(true)} style={{ marginRight: 8 }}>以 Email 登入</button>
            <a className="btn" href="/" style={{ marginLeft: 8 }}>返回首頁</a>
          </div>
          {showSignIn ? <div style={{ marginTop: 12 }}><SignInForm onSuccess={() => setShowSignIn(false)} onClose={() => setShowSignIn(false)} /></div> : null}
        </div>
      </div>
    )
  }
  

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>監控頁 — 班級：{classId || '尚未啟動'}</h1>
        <div>
          <a className="btn" href="/class/student" style={{ marginRight: 8 }}>切換到學生頁</a>
          <span style={{ marginRight: 8 }}>已登入：{user ? (user.displayName || user.email) : '（未登入）'}</span>
          <button className="btn" onClick={() => signOutUser()} style={{ marginRight: 8 }}>登出</button>
          <EndClassButton classId={classId} classOwner={classOwner} currentUser={user} />
        </div>
      </div>

      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <div style={{ color: '#333' }}>
          <strong>登入者帳號：</strong>
          <span style={{ marginLeft: 6 }}>
            {user ? (user.displayName || user.email) : '（未登入）'}
            {user && user.email ? (' (' + user.email + ')') : null}
            {user && user.uid ? <span style={{ color: '#888', marginLeft: 8 }}>UID: {user.uid}</span> : null}
            <div style={{ marginTop: 6, color: '#666' }}>
              <strong>班級擁有者 UID：</strong> {classOwner || '（無）'}
              <span style={{ marginLeft: 12 }}><strong>你是擁有者：</strong> {user && classOwner && user.uid === classOwner ? '是' : (classOwner ? '否' : '無紀錄')}</span>
            </div>
          </span>
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
              setClassId(selected)
              if (db) {
                try {
                  const classRef = doc(db, 'classes', selected)
                  
                  // ✅ 只刪除當前舉手狀態（hands_raised）
                  // ❌ NOT 刪除審計日誌（participation_logs）- 那是永久紀錄！
                  const handsRef = collection(db, 'classes', selected, 'hands_raised')
                  const handsSnap = await getDocs(handsRef)
                  const deleteHandsOps = handsSnap.docs.map(d => deleteDoc(doc(db, 'classes', selected, 'hands_raised', d.id)))
                  if (deleteHandsOps.length > 0) await Promise.all(deleteHandsOps)
                  
                  // 3. 讀取現有班級文檔保留其他字段（包括 scores）
                  const classSnap = await getDoc(classRef)
                  const existingData = classSnap.exists() ? classSnap.data() : {}
                  
                  // 4. 啟動班級 - 只重置舉手狀態，保留 scores 和 participation_logs
                  const selectedClass = classes.find(c => c.id === selected)
                  await setDoc(classRef, {
                    ...existingData,
                    name: selectedClass?.name || selected,
                    active: true,
                    activatedAt: serverTimestamp(),
                    activatedBy: user?.uid || null
                    // ✅ 保留現有的 scores（不清空）
                    // ✅ participation_logs 完全保留（子集合不動）
                  })
                  
                  console.log('✅ 班級已啟動（舉手狀態已清除，審計日誌已保留）', selected)
                } catch (err) {
                  console.error('無法在 Firestore 啟動班級', err)
                }
              }
            }}
          >啟動班級</button>
          <span style={{ marginLeft: 8, color: '#666' }}>{user ? '登入後可管理與結束課程' : '請登入以啟動並管理班級'}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <HandsMonitor 
            classId={classId} 
            isOwner={
              // Allow edit access if:
              // 1. User matches classOwner, OR
              // 2. User is logged in AND classOwner is null (class was activated but activatedBy was not set)
              user && (
                (classOwner && user.uid === classOwner) ||
                (!classOwner) // Allow edit if no owner is recorded
              )
            } 
          />
        </div>
        <div style={{ width: 320 }}>
          <Scoreboard classId={classId} />
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
            <RecalculateButton classId={classId} />
          </div>
        </div>
      </div>
    </div>
  )
}
