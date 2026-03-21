"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import RaiseHandButton from "./RaiseHandButton"
import Scoreboard from "./Scoreboard"
import { db } from '../firebaseClient'
import { collection, getDocs, doc, getDoc, query, where, onSnapshot } from '../lib/firestoreWrapper'

export default function StudentClient({ classId, initialGroup }) {
  const router = useRouter()
  const [group, setGroup] = useState(null)
  const [locked, setLocked] = useState(false)

  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)

  useEffect(() => {
    if (classId) {
      ;(async () => {
        try {
          // prefer initialGroup from query param if provided
          if (initialGroup) {
            setGroup(initialGroup)
            setLocked(true)
            return
          }
          if (!db) { router.push('/'); return }
          const d = await getDoc(doc(db, 'classes', classId))
          if (d && d.exists && d.data() && d.data().currentGroup) {
            setGroup(d.data().currentGroup)
            setLocked(true)
            return
          }
        } catch (e) {
          console.error('讀取班級目前組別失敗', e)
        }
        // no group selected -> redirect back to homepage for selection
        router.push('/')
      })()
      return
    }

    // class not active: load available classes for selection and allow viewing scoreboard only
    const fallback = [
      { id: '2A', name: '二甲', groups: Array.from({ length: 10 }, (_, i) => i + 1) },
      { id: '2B', name: '二乙', groups: Array.from({ length: 15 }, (_, i) => i + 1) },
      { id: 'demo', name: '測試', groups: Array.from({ length: 5 }, (_, i) => i + 1) }
    ]

    async function load() {
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
        const items = snap.docs.map(d => {
          const data = d.data() || {}
          let groups = []
          if (Array.isArray(data.groups) && data.groups.length) groups = data.groups
          else if (typeof data.groupCount === 'number') groups = Array.from({ length: data.groupCount }, (_, i) => i + 1)
          else groups = Array.from({ length: 10 }, (_, i) => i + 1)
          return { id: d.id, name: data.name || d.id, groups }
        })
        setClasses(items)
        setSelectedClass(items[0])
      } catch (err) {
        console.error('讀取班級失敗，使用預設', err)
        setClasses(fallback)
        setSelectedClass(fallback[0])
      }
    }

    load()
  }, [classId, router])

  // Active class UI
  if (classId) {
    if (!group) return null
    return (
      <div>
        <label>
          組別：
          <span style={{ marginLeft: 8 }}>{group} (已鎖定)</span>
        </label>

        <div style={{ marginTop: 16 }}>
          <RaiseHandButton classId={classId} group={group} />
          {locked && (
            <button className="btn" style={{ marginLeft: 12 }} onClick={() => {
              router.push('/')
            }}>退出並重新選擇</button>
          )}
        </div>

        <Scoreboard classId={classId} />
      </div>
    )
  }

  // Inactive class UI: allow selecting a class and group, but do not show RaiseHandButton
  if (!selectedClass) return null
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label>選擇班級： </label>
        <select value={selectedClass.id} onChange={(e) => {
          const c = classes.find(x => x.id === e.target.value)
          setSelectedClass(c)
        }}>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>選擇組別： </label>
        <select value={group || selectedClass.groups[0]} onChange={(e) => setGroup(e.target.value)}>
          {selectedClass.groups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <strong>注意：</strong> 本班級尚未啟動，您只能查看各組積分，無法舉手。
      </div>

      {group && (
        <div>
          <Scoreboard classId={selectedClass.id} />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={async () => {
          // refresh to check if a class got activated elsewhere (use Firestore)
          if (!db) { window.alert('目前尚未啟動任何班級'); return }
          try {
            const q = query(collection(db, 'classes'), where('active', '==', true))
            const snap = await getDocs(q)
            if (snap && !snap.empty) {
              // if user selected a group, pass it via query param
              if (group) {
                window.location.href = `/class/student?group=${group}`
              } else {
                window.location.href = `/class/student`
              }
            } else {
              window.alert('目前尚未啟動任何班級')
            }
          } catch (e) {
            console.error('檢查是否啟動錯誤', e)
            window.alert('檢查啟動狀態時發生錯誤')
          }
        }}>檢查是否啟動</button>
      </div>
    </div>
  )
}
