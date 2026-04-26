"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../firebaseClient'
import { onAuthStateChanged } from 'firebase/auth'

const StudentAuthContext = createContext()

export function StudentAuthProvider({ children }) {
  const [studentInfo, setStudentInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [devQuickLoginActive, setDevQuickLoginActive] = useState(false)
  const allowDevQuickLogin = process.env.NEXT_PUBLIC_DEV_QUICK_LOGIN === 'true'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('studentAuth')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed && parsed.account && parsed.groupId && parsed.classId) {
            setStudentInfo(parsed)
            setLoading(false)
            return () => {}
          }
        }
      } catch (e) {
        console.warn('StudentAuthContext localStorage fallback failed:', e)
      }
    }

    if (!auth) {
      setLoading(false)
      return
    }

    if (devQuickLoginActive) {
      setLoading(false)
      return () => {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setFirebaseUser(user)

          const idTokenResult = await user.getIdTokenResult()
          const studentInfoFromClaims = idTokenResult.claims.studentInfo

          if (studentInfoFromClaims) {
            setStudentInfo(studentInfoFromClaims)
          } else {
            const response = await fetch('/api/auth/get-student-info', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ account: user.email?.split('@')[0] })
            })

            if (response.ok) {
              const data = await response.json()
              if (data.success && data.student) {
                setStudentInfo(data.student)
              }
            }
          }
        } else {
          setFirebaseUser(null)
          setStudentInfo(null)
        }
      } catch (err) {
        console.error('Auth state change error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [devQuickLoginActive])

  const updateStudentInfo = (newInfo) => {
    setStudentInfo((prev) => ({
      ...prev,
      ...newInfo
    }))
  }

  const logout = async () => {
    try {
      if (devQuickLoginActive) {
        setDevQuickLoginActive(false)
        setStudentInfo(null)
        setFirebaseUser(null)
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('studentAuth')
          }
        } catch (e) {}
        return
      }

      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('studentAuth')
        }
      } catch (e) {}

      await auth.signOut()
      setStudentInfo(null)
      setFirebaseUser(null)
    } catch (err) {
      console.error('Logout error:', err)
      setError(err.message)
    }
  }

  const loginAsDevStudent = (devStudent) => {
    if (!allowDevQuickLogin) {
      throw new Error('開發快速登入功能未啟用。')
    }

    setStudentInfo({
      ...devStudent,
      timestamp: devStudent.timestamp || new Date().toISOString()
    })
    setFirebaseUser({ uid: `dev-${devStudent.account}` })
    setDevQuickLoginActive(true)
    setLoading(false)
  }

  const value = {
    studentInfo,
    firebaseUser,
    loading,
    error,
    updateStudentInfo,
    logout,
    loginAsDevStudent,
    isAuthenticated: !!firebaseUser || devQuickLoginActive || !!studentInfo,
    devQuickLoginActive
  }

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  )
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext)
  if (!context) {
    throw new Error('useStudentAuth must be used within StudentAuthProvider')
  }
  return context
}
