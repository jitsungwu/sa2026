"use client"
import React, { useEffect, useState } from 'react'
import { db } from '../firebaseClient'
import { doc, getDoc } from '../lib/firestoreWrapper'

/**
 * 座位表網格組件
 * 顯示教室布局及已登記位置的組別
 */
export default function SeatGrid({ classId, activeClassOnly = false }) {
  const [layout, setLayout] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!classId || !db) return

    const fetchLayout = async () => {
      setLoading(true)
      setError(null)
      try {
        const layoutDocRef = doc(db, `classes/${classId}/layout`, 'grid')
        const layoutSnap = await getDoc(layoutDocRef)

        if (layoutSnap.exists()) {
          setLayout(layoutSnap.data())
        } else {
          setLayout(null)
          setError('尚無座位表數據')
        }
      } catch (err) {
        console.error('Error fetching seat layout:', err)
        setError('讀取座位表失敗')
      } finally {
        setLoading(false)
      }
    }

    fetchLayout()
  }, [classId])

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center' }}>載入中...</div>
  }

  if (error) {
    return <div style={{ padding: 16, color: '#d46b08' }}>⚠️ {error}</div>
  }

  if (!layout) {
    return <div style={{ padding: 16, color: '#999' }}>暫無座位表數據</div>
  }

  // 計算網格尺寸
  const rows = Object.keys(layout)
    .map((k) => parseInt(k, 10))
    .filter((r) => !isNaN(r))
    .sort((a, b) => a - b)

  if (rows.length === 0) {
    return <div style={{ padding: 16, color: '#999' }}>座位表為空</div>
  }

  const maxRow = Math.max(...rows)
  const maxCol = Math.max(
    ...rows.map((r) => {
      const rowData = layout[String(r)]
      if (typeof rowData !== 'object') return 0
      return Math.max(
        ...Object.keys(rowData)
          .map((c) => parseInt(c, 10))
          .filter((c) => !isNaN(c))
      )
    })
  )

  const cellSize = 60
  const cellGap = 4
  const padding = 16

  return (
    <div style={{ padding, backgroundColor: '#f9f9f9', borderRadius: 8, border: '1px solid #eee' }}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>📍 教室座位表</h3>
      
      {/* 座位表網格 */}
      <div
        style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${maxCol}, ${cellSize}px)`,
          gap: cellGap,
          padding: 8,
          backgroundColor: '#fff',
          borderRadius: 4,
          border: '1px solid #ddd',
        }}
      >
        {Array.from({ length: maxRow }, (_, rIdx) => {
          const row = rIdx + 1
          return Array.from({ length: maxCol }, (_, cIdx) => {
            const col = cIdx + 1
            const rowData = layout[String(row)]
            const groupId = rowData && rowData[String(col)] ? String(rowData[String(col)]) : null
            const displayGroupId = groupId ? String(groupId).padStart(2, '0') : '-'

            const backgroundColor = groupId
              ? '#e7f5ff'
              : '#f5f5f5'
            const borderColor = groupId
              ? '#1971c2'
              : '#ddd'
            const fontWeight = groupId
              ? 'bold'
              : 'normal'
            const color = groupId
              ? '#1971c2'
              : '#999'

            return (
              <div
                key={`${row}-${col}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight,
                  color,
                  cursor: groupId ? 'default' : 'not-allowed',
                  position: 'relative',
                }}
                title={groupId ? `第 ${displayGroupId} 組` : '空座位'}
              >
                {displayGroupId}
              </div>
            )
          })
        })}
      </div>

      {/* 圖例 */}
      <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ 
            display: 'inline-block', 
            width: 24, 
            height: 24, 
            backgroundColor: '#e7f5ff', 
            border: '2px solid #1971c2', 
            borderRadius: 2,
            marginRight: 8,
            verticalAlign: 'middle'
          }}></span>
          已登記位置
        </div>
        <div>
          <span style={{ 
            display: 'inline-block', 
            width: 24, 
            height: 24, 
            backgroundColor: '#f5f5f5', 
            border: '2px solid #ddd', 
            borderRadius: 2,
            marginRight: 8,
            verticalAlign: 'middle'
          }}></span>
          空座位
        </div>
      </div>

      {/* 統計資訊 */}
      <div style={{ marginTop: 12, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 4, fontSize: 12 }}>
        <p style={{ margin: 0 }}>
          ✓ 已登記組別：
          <strong>
            {Object.values(layout)
              .filter((row) => typeof row === 'object')
              .flatMap((row) => Object.values(row))
              .filter((val) => val && val !== '-')
              .length}
          </strong>
          {' '}組
        </p>
      </div>
    </div>
  )
}
