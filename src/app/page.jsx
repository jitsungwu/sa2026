"use client"
import React, { useEffect, useState } from 'react'
import { db } from '../firebaseClient'
import { collection, getDocs, doc, setDoc, serverTimestamp, query, where, onSnapshot } from '../lib/firestoreWrapper'

export default function HomePage() {
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

  // listen for active class in Firestore instead of localStorage
  useEffect(() => {
    if (!db) return
    const q = query(collection(db, 'classes'), where('active', '==', true))
    const unsub = onSnapshot(q, (snap) => {
      if (snap && !snap.empty) {
        const first = snap.docs[0]
        const id = first.id
        setActiveClassId(id)
      } else {
        setActiveClassId(null)
      }
    }, (err) => console.error('active class snapshot error:', err))

    return () => unsub()
  }, [db])

  return (
    <div className="hero">
      <header style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h1>即時教室互動</h1>
      </header>

      <section style={{ marginTop: 20 }}>
        {/* 若尚未有老師啟動班級，顯示「還沒開始上課」；老師登入後可選擇並啟動 */}
        {!activeClassId ? (
          <div>
            <h2>還沒開始上課</h2>
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
                    {/* 結束上課按鈕已移至老師管理頁面 */}
                  </div>
                </div>
              </div>
            )
          })()
        )}


      </section>
    </div>
  )
}