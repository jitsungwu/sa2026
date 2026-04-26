"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStudentAuth } from '../contexts/StudentAuthContext'

export default function DevQuickStudentLoginForm({ onClose }) {
  const router = useRouter()
  const { loginAsDevStudent } = useStudentAuth()
  const [accounts, setAccounts] = useState([])
  const [selectedIndex, setSelectedIndex] = useState('')
  const [account, setAccount] = useState('')
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('1')
  const [classId, setClassId] = useState('demo')
  const [seatSelected, setSeatSelected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await fetch('/api/dev-test-accounts')
        const json = await response.json()
        if (!response.ok) {
          throw new Error(json.error || '無法讀取測試帳號')
        }

        const accountList = Array.isArray(json.used) ? json.used : []
        setAccounts(accountList)
        if (accountList.length > 0) {
          setSelectedIndex('0')
          const first = accountList[0]
          setAccount(first.account)
          setGroupId(first.groupId)
          setClassId(first.classId)
          setName(first.name || `Test Student ${first.account}`)
        }
      } catch (err) {
        setError(err?.message || String(err))
      } finally {
        setLoadingAccounts(false)
      }
    }

    loadAccounts()
  }, [])

  const applyAccount = (item, index) => {
    setSelectedIndex(String(index))
    setAccount(item.account)
    setGroupId(item.groupId)
    setClassId(item.classId)
    setName(item.name || `Test Student ${item.account}`)
  }

  const doQuickLogin = async (e) => {
    e.preventDefault()
    setError(null)

    const trimmedAccount = account.trim()
    const trimmedGroupId = groupId.trim()
    const trimmedClassId = classId.trim()

    if (!trimmedAccount || !trimmedGroupId || !trimmedClassId) {
      setError('請輸入學號、組別與班級代碼。')
      return
    }

    setLoading(true)

    const studentInfo = {
      account: trimmedAccount,
      name: name.trim() || `Test Student ${trimmedAccount}`,
      groupId: trimmedGroupId,
      classId: trimmedClassId,
      seatSelected,
      timestamp: new Date().toISOString()
    }

    try {
      loginAsDevStudent(studentInfo)
      const redirectUrl = seatSelected
        ? `/class/${trimmedClassId}/dashboard`
        : `/class/${trimmedClassId}/seat-selection`
      router.push(redirectUrl)
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, maxWidth: 520 }}>
      <h3>開發快速登入</h3>
      <p style={{ marginBottom: 16, color: '#555' }}>
        僅供開發測試使用。此登入方式不會建立正式 Firebase 會話，快速切換學生身份。
      </p>

      {loadingAccounts ? (
        <div style={{ marginBottom: 16, color: '#666' }}>讀取測試帳號中...</div>
      ) : accounts.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>快速切換測試帳號</label>
          <select
            value={selectedIndex}
            onChange={(e) => {
              const index = Number(e.target.value)
              setSelectedIndex(e.target.value)
              applyAccount(accounts[index], index)
            }}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            disabled={loading || loadingAccounts}
          >
            {accounts.map((item, index) => (
              <option key={`${item.account}-${index}`} value={index}>
                {item.account} / {item.classId} / 組 {item.groupId} ({item.status})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{ marginBottom: 16, color: '#d32f2f' }}>未找到測試帳號，請改用手動輸入。</div>
      )}

      <form onSubmit={doQuickLogin}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>學號</label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="e.g., 413000001"
            style={{ width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
            required
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>姓名（選填）</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test Student 413000001"
            style={{ width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
            disabled={loading}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>組別</label>
            <input
              type="text"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              placeholder="1"
              style={{ width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>班級代碼</label>
            <input
              type="text"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              placeholder="demo"
              style={{ width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={seatSelected}
              onChange={(e) => setSeatSelected(e.target.checked)}
              disabled={loading}
            />
            已選座位（直接進入儀表板）
          </label>
        </div>

        {error ? (
          <div style={{ color: '#d32f2f', marginBottom: 12, fontSize: 14, padding: 8, backgroundColor: '#ffebee', borderRadius: 4 }}>
            ✗ {error}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary" disabled={loading || !account || !groupId || !classId} style={{ flex: 1 }}>
            {loading ? '登入中...' : '快速登入'}
          </button>
          {onClose ? (
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              返回
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
