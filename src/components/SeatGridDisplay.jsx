"use client"
import React, { useEffect, useState } from 'react'
import { db } from '../firebaseClient'
import { doc, onSnapshot } from 'firebase/firestore'

/**
 * 座位表網格組件（三區域布局）
 * 支持顯示模式和互動模式
 * 
 * Props:
 * - classId: 班級 ID
 * - interactive: 是否允許點擊預約（默認 false）
 * - currentGroupId: 當前組別 ID（互動模式需要）
 * - firstRaisedGroupId: 第一個舉手的組別 ID（紅色標記）
 * - secondRaisedGroupId: 第二個舉手的組別 ID（黃色標記）
 * - onReserve: 座位預約回調函數 (row, col) => Promise
 * - loading: 是否在加載中
 * - message: 訊息通知
 */
export default function SeatGridDisplay({ 
  classId, 
  interactive = false, 
  currentGroupId = null,
  firstRaisedGroupId = null,
  secondRaisedGroupId = null,
  onReserve = null,
  loading = false,
  message = null
}) {
  const [layout, setLayout] = useState({})

  // 訂閱座位表實時更新
  useEffect(() => {
    if (!classId || !db) return
    const layoutDocRef = doc(db, `classes/${classId}/layout`, 'grid')
    const unsub = onSnapshot(layoutDocRef, (snap) => {
      setLayout(snap.exists() ? snap.data() : {})
    }, (err) => {
      console.warn('layout onSnapshot error:', err)
    })
    return () => unsub()
  }, [classId])

  // 三個區域的配置（左區 6 排，中區 8 排，右區 8 排）
  const zones = [
    { key: 'left', rows: 6, col: 1, label: '左區' },
    { key: 'middle', rows: 8, col: 2, label: '中區' },
    { key: 'right', rows: 8, col: 3, label: '右區' }
  ]

  return (
    <div>
      {/* 白板（前方）*/}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ width: 'calc(33.333% - 8px)', padding: '12px 16px', backgroundColor: '#8b5fbf', color: 'white', borderRadius: 8, textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.08)' }}>
          白板（前方）
        </div>
      </div>

      {/* 訊息顯示 */}
      {message && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, backgroundColor: message.type === 'error' ? '#ffe6e6' : '#e6ffed' }}>
          {message.text}
        </div>
      )}

      {/* 座位表網格 - 三區域布局 */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 20 }}>
        {zones.map((zone) => (
          <div key={zone.key} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>{zone.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from({ length: zone.rows }).map((_, ri) => {
                const r = ri + 1
                const occupant = (layout[r] || {})[zone.col]
                const isMine = occupant && String(occupant) === String(currentGroupId)
                const isFirstRaised = occupant && String(occupant) === String(firstRaisedGroupId)
                const isSecondRaised = occupant && String(occupant) === String(secondRaisedGroupId)
                const disabled = !!occupant && !isMine

                const handleClick = async () => {
                  if (!interactive || disabled || loading || !onReserve) return
                  try {
                    await onReserve(r, zone.col)
                  } catch (err) {
                    console.error('Error reserving seat:', err)
                  }
                }

                // 確定背景色
                let backgroundColor = 'white'
                if (isFirstRaised) {
                  backgroundColor = '#ff4d4f' // 紅色
                } else if (isSecondRaised) {
                  backgroundColor = '#ffd666' // 黃色
                } else if (isMine) {
                  backgroundColor = '#ffd966'
                } else if (disabled) {
                  backgroundColor = '#f2f2f2'
                }

                // 確定文字顏色（紅色背景時使用白色文字）
                const textColor = isFirstRaised ? 'white' : 'inherit'

                return (
                  <button
                    key={`${zone.key}-r${r}`}
                    disabled={disabled || loading || !interactive}
                    onClick={handleClick}
                    style={{
                      height: 40,
                      width: '100%',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      backgroundColor,
                      cursor: (interactive && !disabled) ? 'pointer' : (disabled ? 'not-allowed' : 'default'),
                      fontWeight: 600,
                      opacity: disabled ? 0.6 : 1,
                      transition: 'background-color 0.2s',
                      color: textColor
                    }}
                  >
                    {occupant ? `第 ${String(occupant).padStart(2, '0')} 組` : `${zone.label}第 ${r} 排`}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
