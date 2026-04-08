"use client"
import React, { useEffect, useState } from 'react'
import { db } from '../firebaseClient'
import { collection, getDocs, doc, setDoc, query, where, onSnapshot } from '../lib/firestoreWrapper'
import SeatGridDisplay from '../components/SeatGridDisplay'

export default function HomePage() {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
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
            <p style={{ color: '#666' }}>請等待教師啟動課堂...</p>
          </div>
        ) : (
          // 班級已啟動：顯示該班級、座位表與組別選擇
          (() => {
            const active = classes.find(c => c.id === activeClassId) || selectedClass
            if (!active) return <div>班級資料尚未載入</div>
            return (
              <div>
                <h2>📚 目前上課班級：{active.name}</h2>
                
                {/* 顯示座位表 - 使用可重用的 SeatGridDisplay 組件（唯讀模式） */}
                <div style={{ marginTop: 20, marginBottom: 24 }}>
                  <SeatGridDisplay
                    classId={activeClassId}
                    interactive={false}
                  />
                </div>

                {/* 組別選擇區 */}
                <div style={{ 
                  padding: 16, 
                  backgroundColor: '#f9f9f9', 
                  borderRadius: 8, 
                  border: '1px solid #eee',
                  marginTop: 20
                }}>
                  <h3 style={{ marginTop: 0 }}>進入課堂互動</h3>
                  <div style={{ marginTop: 12 }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        window.location.href = '/signin'
                      }}
                    >
                      登入
                    </button>
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