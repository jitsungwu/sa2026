'use client'

import React, { useState } from 'react'
import { recalculateScores } from '../lib/scoreOperations'
import { db } from '../firebaseClient'

/**
 * 老師面板：重新計算小組總分按鈕
 * 
 * 點擊時會：
 * 1. 讀取所有審計日誌
 * 2. 聚合每組的總分
 * 3. 更新 classes.scores 字段
 * 4. 所有客戶端實時收到更新
 */
export default function RecalculateButton({ classId }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleRecalculate = async () => {
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const result = await recalculateScores(db, classId)

      setMessage(
        `✅ 重新計算完成！\n` +
        `共 ${result.totalRecords} 筆記錄，總分 ${result.totalPoints} 分\n` +
        `更新了 ${Object.keys(result.scores).length} 個組別`
      )

      // 3 秒後清除訊息
      setTimeout(() => {
        setMessage('')
      }, 3000)
    } catch (err) {
      setError(`❌ 重新計算失敗: ${err.message}`)
      console.error('Recalculate error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>🔄 重新計算小組總分</div>
      <div style={styles.description}>
        ℹ️ 根據審計日誌重新聚合計算各組積分。<br/>
        <strong>說明</strong>：此操作只會更新有記錄的組別，不會清空任何現有數據。
      </div>
      
      <button
        onClick={handleRecalculate}
        disabled={loading || !classId}
        style={{
          ...styles.button,
          opacity: loading || !classId ? 0.6 : 1,
          cursor: loading || !classId ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '⏳ 重新計算中...' : '✨ 開始重新計算'}
      </button>

      {message && (
        <div style={styles.successMessage}>
          {message.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    textAlign: 'center'
  },

  header: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333'
  },

  description: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '12px',
    lineHeight: '1.5'
  },

  button: {
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },

  successMessage: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: '#d4edda',
    border: '1px solid #c3e6cb',
    borderRadius: '4px',
    color: '#155724',
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },

  errorMessage: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    color: '#721c24',
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  }
}
