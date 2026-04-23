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

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    // 先检查 URL 参数中是否有测试数据（用于 E2E 测试）
    let urlStudentInfo = null
    try {
      const params = new URLSearchParams(window.location.search)
      const participantId = params.get('participantId')
      const group = params.get('group')
      if (participantId && group) {
        urlStudentInfo = {
          account: participantId,
          name: `Test Student ${participantId}`,
          groupId: group,
          classId: params.get('classId') || 'demo',
          seatSelected: false,
          timestamp: new Date().toISOString()
        }
        console.log('✅ Using URL parameters for testing:', urlStudentInfo)
      }
    } catch (e) {
      console.log('No URL parameters for testing')
    }

    // 如果有 URL 测试参数，直接使用
    if (urlStudentInfo) {
      setStudentInfo(urlStudentInfo)
      setLoading(false)
      return
    }

    // 监听 Firebase Auth 状态变化
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // 用户已登入 - 获取学生信息
          setFirebaseUser(user)
          
          // 从自定义声明或 API 获取学生信息
          // 首先尝试从自定义声明（如果之前设置过）
          const idTokenResult = await user.getIdTokenResult()
          const studentInfoFromClaims = idTokenResult.claims.studentInfo
          
          if (studentInfoFromClaims) {
            setStudentInfo(studentInfoFromClaims)
          } else {
            // 如果没有自定义声明，调用 API 获取学生信息
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
          // 用户已登出
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
  }, [])

  const updateStudentInfo = (newInfo) => {
    setStudentInfo(prev => ({
      ...prev,
      ...newInfo
    }))
  }

  const logout = async () => {
    try {
      await auth.signOut()
      setStudentInfo(null)
      setFirebaseUser(null)
    } catch (err) {
      console.error('Logout error:', err)
      setError(err.message)
    }
  }

  const value = {
    studentInfo,
    firebaseUser,
    loading,
    error,
    updateStudentInfo,
    logout,
    isAuthenticated: !!firebaseUser
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
