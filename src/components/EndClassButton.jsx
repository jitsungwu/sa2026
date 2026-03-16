"use client"
import React from 'react'
import { useRouter } from 'next/navigation'

export default function EndClassButton({ classId }) {
  const router = useRouter()

  const handleEnd = () => {
    try {
      window.localStorage.removeItem('activeClass')
      window.localStorage.removeItem('selectedGroup')
    } catch (e) {}
    // force full reload to ensure all clients see cleared state and homepage reloads
    try {
      window.location.href = '/'
    } catch (e) {
      // fallback to router replace
      router.replace('/')
    }
  }

  return (
    <button className="btn" onClick={handleEnd} style={{ marginLeft: 8 }}>結束上課</button>
  )
}
