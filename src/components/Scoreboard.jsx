"use client"
import React, { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { listenToScores } from "../lib/scoreOperations"

/**
 * 積分榜顯示元件 - 優化版
 * 
 * 改進：
 * ✅ 只需讀取 1 個文檔 (classes/{classId})
 * ❌ 而非聚合整個 participation_logs 集合 (1000+ reads)
 * 🎯 性能提升 99%+
 */
export default function Scoreboard({ classId }) {
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId) {
      setLoading(false)
      return
    }

    setLoading(true)

    // 使用優化函式：直接監聽 classes.scores 字段
    const unsubscribe = listenToScores(db, classId, (updatedScores) => {
      setScores(updatedScores)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [classId])

  const groups = Object.keys(scores)
    .filter(g => scores[g] > 0) // 只顯示有分數的組
    .sort((a, b) => scores[b] - scores[a]) // 按分數高低排序

  return (
    <div style={{ marginTop: 20 }}>
      <h3>📊 即時積分榜</h3>
      {loading ? (
        <div>⏳ 載入中...</div>
      ) : groups.length === 0 ? (
        <div>尚無積分紀錄</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {groups.map((g, index) => (
            <li
              key={g}
              style={{
                padding: '8px 12px',
                marginBottom: '8px',
                backgroundColor: index === 0 ? '#fff3cd' : '#f8f9fa',
                borderLeft: `4px solid ${index === 0 ? '#ffc107' : '#dee2e6'}`,
                borderRadius: '4px',
                fontSize: '16px'
              }}
            >
              <span style={{ fontWeight: 'bold' }}>
                {index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : '   '}
                組別 {g}
              </span>
              <span style={{ float: 'right', fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                {scores[g]} 分
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
