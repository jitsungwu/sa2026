"use client"
import React, { useEffect, useState } from 'react'
import { db } from '../firebaseClient'
import { collection, getDocs } from '../lib/firestoreWrapper'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(1)
  const [activeClassId, setActiveClassId] = useState(null)

  useEffect(() => {
    const fallback = [
      { id: '2A', name: '二甲', groups: Array.from({ length: 10 }, (_, i) => i + 1) },
      { id: '2B', name: '二乙', groups: Array.from({ length: 15 }, (_, i) => i + 1) },
    ]

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
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const v = window.localStorage.getItem('activeClass')
    if (v) setActiveClassId(v)
  }, [])

  // listen for storage changes (other tabs) and update activeClass state
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e) => {
      if (e.key === 'activeClass') {
        setActiveClassId(e.newValue)
      }
      // also handle selectedGroup clears
      if (e.key === 'selectedGroup') {
        // no-op here; student page reads selectedGroup directly from localStorage
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <div className="hero">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>即時教室互動</h1>
        <nav>
          <a className="btn" href={`/class/monitor`} style={{ marginLeft: 8 }}>老師介面</a>
        </nav>
      </header>

      <section style={{ marginTop: 20 }}>
        {/* 若尚未有老師啟動班級，顯示「還沒開始上課」；老師登入後可選擇並啟動 */}
        {!activeClassId ? (
          <div>
            <h2>還沒開始上課</h2>
            {user && (
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
                  <button className="btn btn-primary" onClick={() => {
                    if (!selectedClass) return
                    window.localStorage.setItem('activeClass', selectedClass.id)
                    setActiveClassId(selectedClass.id)
                  }}>啟動班級</button>
                </div>
              </div>
            )}
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
                    <button className="btn btn-primary" onClick={() => {
                      if (!active) return
                      try {
                        window.localStorage.setItem('selectedGroup', String(selectedGroup))
                      } catch (e) {}
                      window.location.href = `/class/student`
                    }}>學生介面</button>
                    <a className="btn" href={`/class/monitor`} style={{ marginLeft: 8 }}>進入老師管理</a>
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