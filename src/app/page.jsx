"use client"
import React, { useEffect, useState } from 'react'
import { db, auth, signInWithEmail, createAccountWithEmail, signOutUser } from '../firebaseClient'
import SignInForm from '../components/SignInForm'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, doc, setDoc, serverTimestamp, getDoc, query, where, onSnapshot } from '../lib/firestoreWrapper'

export default function HomePage() {
  const ALLOWED_TEACHER_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_TEACHER_EMAIL || 'benwu@im.fju.edu.tw'
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(1)
  const [activeClassId, setActiveClassId] = useState(null)
  const [classOwner, setClassOwner] = useState(null)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    const fallback = [
      { id: '2A', name: '二甲', groups: Array.from({ length: 10 }, (_, i) => i + 1) },
      { id: '2B', name: '二乙', groups: Array.from({ length: 15 }, (_, i) => i + 1) },
    ]

    // listen for auth state to know whether activation should be allowed
    let unAuth = null
    try {
      unAuth = onAuthStateChanged(auth, (u) => setUser(u))
    } catch (e) {
      // auth may be null in test environment
    }

    async function loadClasses() {
      if (!db) {
        setClasses(fallback)
        setSelectedClass(fallback[0])
        return
      }

      try {
        const snap = await getDocs(collection(db, 'classes'))
        if (!snap || snap.empty) {
          setClasses(fallback)
          setSelectedClass(fallback[0])
          return
        }

        const items = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data() || {}
          let groups = []
          if (Array.isArray(data.groups) && data.groups.length) {
            groups = data.groups
          } else if (typeof data.groupCount === 'number') {
            groups = Array.from({ length: data.groupCount }, (_, i) => i + 1)
          } else {
            // fallback to sequential groups if no metadata provided
            groups = Array.from({ length: 10 }, (_, i) => i + 1)
          }
          return { id: d.id, name: data.name || d.id, groups }
        }))

        setClasses(items)
        setSelectedClass(items[0])
      } catch (err) {
        console.error('讀取班級失敗，使用預設資料', err)
        setClasses(fallback)
        setSelectedClass(fallback[0])
      }
    }

    loadClasses()
    return () => { if (unAuth) unAuth() }
  }, [])

  // listen for active class in Firestore instead of localStorage
  useEffect(() => {
    if (!db) return
    const q = query(collection(db, 'classes'), where('active', '==', true))
    const unsub = onSnapshot(q, (snap) => {
      if (snap && !snap.empty) {
        const first = snap.docs[0]
        const id = first.id
        setActiveClassId(id)
        try { setClassOwner(first.data().activatedBy || null) } catch (e) { setClassOwner(null) }
      } else {
        setActiveClassId(null)
        setClassOwner(null)
      }
    }, (err) => console.error('active class snapshot error:', err))

    return () => unsub()
  }, [db])

  // load active class owner for permission checks
  useEffect(() => {
    if (!db || !activeClassId) { setClassOwner(null); return }
    let mounted = true
    ;(async () => {
      try {
        const d = await getDoc(doc(db, 'classes', activeClassId))
        if (!mounted) return
        if (d && d.exists && d.data()) setClassOwner(d.data().activatedBy || null)
        else setClassOwner(null)
      } catch (e) {
        console.error('無法讀取 class owner', e)
        setClassOwner(null)
      }
    })()
    return () => { mounted = false }
  }, [db, activeClassId])

  // No localStorage cross-tab sync: Firestore is the single source of truth

  return (
    <div className="hero">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>即時教室互動</h1>
        <nav>
            <button className="btn" onClick={async () => {
            if (!user) {
              setShowSignIn(true)
              return
            }
            const curUid = (auth && auth.currentUser && auth.currentUser.uid) || (user && user.uid)
            const curEmail = (auth && auth.currentUser && auth.currentUser.email) || (user && user.email) || null
            if (curEmail !== ALLOWED_TEACHER_EMAIL && curUid !== classOwner) {
              alert('您不是授權的老師（目前 UID: ' + curUid + ', 目前 email: ' + curEmail + ', 授權 email: ' + ALLOWED_TEACHER_EMAIL + '）。無法進入管理頁面，將登出並返回首頁。')
              try { await signOutUser() } catch (e) {}
              window.location.href = '/'
              return
            }
            window.location.href = '/class/monitor'
          }} style={{ marginLeft: 8 }}>老師介面</button>
          {showSignIn ? <div style={{ position: 'absolute', right: 20, top: 64 }}><SignInForm onSuccess={() => { setShowSignIn(false); }} onClose={() => setShowSignIn(false)} /></div> : null}
          {user ? (
            <span style={{ marginLeft: 12 }}>
              已登入：{user.displayName || user.email} {user.email ? `(${user.email})` : ''} <span style={{ color: '#888' }}>UID: {user.uid}</span>
              <button className="btn" onClick={() => signOutUser()} style={{ marginLeft: 8 }}>登出</button>
            </span>
          ) : null}
        </nav>
      </header>

      <section style={{ marginTop: 20 }}>
        {/* 若尚未有老師啟動班級，顯示「還沒開始上課」；老師登入後可選擇並啟動 */}
        {!activeClassId ? (
          <div>
            <h2>還沒開始上課</h2>
            <div style={{ marginTop: 12 }}>
              <label>老師：選擇要啟動的班級：</label>
              <select value={selectedClass?.id || ''} onChange={(e) => {
                const cls = classes.find(c => c.id === e.target.value)
                setSelectedClass(cls)
                setSelectedGroup(cls?.groups?.[0] || 1)
              }}>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-primary" onClick={async () => {
                  if (!selectedClass) return
                  // require login to activate class to ensure correct teacher UID is recorded
                  if (!user) {
                    setShowSignIn(true)
                    return
                  }
                  // determine reliable uid: prefer auth.currentUser if available
                  const curUid = (auth && auth.currentUser && auth.currentUser.uid) || (user && user.uid) || null
                  setActiveClassId(selectedClass.id)
                  if (db) {
                    try {
                      await setDoc(doc(db, 'classes', selectedClass.id), {
                        name: selectedClass.name || selectedClass.id,
                        active: true,
                        activatedAt: serverTimestamp(),
                        activatedBy: curUid,
                      }, { merge: true })
                      // update local classOwner immediately to avoid race with listeners
                      setClassOwner(curUid)
                      console.info('Activated class', selectedClass.id, 'by', curUid)
                    } catch (err) {
                      console.error('無法在 Firestore 啟動班級', err)
                    }
                  }
                }}>啟動班級</button>
                <span style={{ marginLeft: 8, color: '#666' }}>{user ? '已登入：可管理本班' : '未登入：啟動班級後請至老師頁登入以取得管理權限'}</span>
              </div>
            </div>
          </div>
        ) : (
          // 班級已啟動：顯示該班級與組別選擇
          (() => {
            const active = classes.find(c => c.id === activeClassId) || selectedClass
            if (!active) return <div>班級資料尚未載入</div>
            return (
              <div>
                <h2>目前上課班級：{active.name}</h2>
                <div style={{ marginTop: 12 }}>
                  <label>選擇組別： </label>
                  <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                    {active.groups.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                    <div style={{ marginTop: 12 }}>
                    <button className="btn btn-primary" onClick={async () => {
                      if (!active) return
                      if (db) {
                        try {
                          await setDoc(doc(db, 'classes', active.id), { currentGroup: selectedGroup }, { merge: true })
                        } catch (err) {
                          console.error('無法設定類別組別到 Firestore', err)
                        }
                      }
                      // navigate to student page and include selected group as query param
                      window.location.href = `/class/student?group=${selectedGroup}`
                    }}>學生介面</button>
                              <button className="btn" style={{ marginLeft: 8 }} onClick={async () => {
                                if (!user) { setShowSignIn(true); return }
                                const curUid = (auth && auth.currentUser && auth.currentUser.uid) || (user && user.uid)
                                const curEmail = (auth && auth.currentUser && auth.currentUser.email) || (user && user.email) || null
                                // If there is no recorded class owner, bind current user as owner and allow entry.
                                if (!classOwner) {
                                  try {
                                    if (db && activeClassId) {
                                      await setDoc(doc(db, 'classes', activeClassId), { activatedBy: curUid }, { merge: true })
                                      // update local state to reflect new owner
                                      setClassOwner(curUid)
                                      try { alert('已將目前登入的老師設定為班級擁有者，並允許進入管理頁面。') } catch (e) {}
                                    }
                                  } catch (e) {
                                    console.error('無法設定 class owner', e)
                                    alert('無法設定班級擁有者，請稍後再試。')
                                    return
                                  }
                                  window.location.href = '/class/monitor'
                                  return
                                }

                                // Allow if email matches the configured teacher email or UID matches the recorded class owner.
                                if (curEmail !== ALLOWED_TEACHER_EMAIL && curUid !== classOwner) {
                                  alert('您不是授權的老師，無法進入管理頁面，將登出並返回首頁。')
                                  try { await signOutUser() } catch (e) {}
                                  window.location.href = '/'
                                  return
                                }
                                window.location.href = '/class/monitor'
                              }}>進入老師管理</button>
                    {showSignIn ? <div style={{ marginTop: 8 }}><SignInForm onSuccess={() => setShowSignIn(false)} onClose={() => setShowSignIn(false)} /></div> : null}
                    {/* 結束上課按鈕已移至老師管理頁面 */}
                  </div>
                </div>
              </div>
            )
          })()
        )}

        <div style={{ marginTop: 24 }}>
          <p>老師請至管理頁登入（右上選單或進入任一班級的老師管理頁）。</p>
        </div>
      </section>
    </div>
  )
}