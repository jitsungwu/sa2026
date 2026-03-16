"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import RaiseHandButton from "./RaiseHandButton"
import Scoreboard from "./Scoreboard"

export default function StudentClient({ classId }) {
  const router = useRouter()
  const [group, setGroup] = useState(null)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('selectedGroup')
    if (stored) {
      setGroup(stored)
      setLocked(true)
    } else {
      // no group selected -> redirect back to homepage for selection
      router.push('/')
    }
  }, [classId, router])

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
            const key = `selectedGroup_${classId}`
            window.localStorage.removeItem(key)
            router.push('/')
          }}>退出並重新選擇</button>
        )}
      </div>

      <Scoreboard classId={classId} />
    </div>
  )
}
