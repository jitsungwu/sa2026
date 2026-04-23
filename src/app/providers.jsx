"use client"
import { StudentAuthProvider } from '../contexts/StudentAuthContext'

export function Providers({ children }) {
  return (
    <StudentAuthProvider>
      {children}
    </StudentAuthProvider>
  )
}
