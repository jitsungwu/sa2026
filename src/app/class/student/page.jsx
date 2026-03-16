"use client"
import React from 'react'
import StudentClient from '../../../components/StudentClient'

export default function StudentPage() {
  const classId = typeof window !== 'undefined' ? window.localStorage.getItem('activeClass') : null
  return (
    <div style={{ padding: 20 }}>
      <h1>學生頁 — 班級：{classId || '尚未啟動'}</h1>
      <StudentClient classId={classId} />
    </div>
  )
}
