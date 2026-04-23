#!/usr/bin/env node

/**
 * 數據庫遷移腳本：初始化 scores 字段
 * 
 * 用途：為所有現有的 classes 文檔添加 scores 字段
 * 運行方式：node scripts/migrate-add-scores.js
 */

import dotenv from 'dotenv'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, batch, increment } from 'firebase-admin/firestore'

dotenv.config({ path: '.env.local' })

// Firebase Admin 初始化
// 需要在 Firebase Console 生成服務帳號金鑰
const initializeFirebaseAdmin = () => {
  try {
    // 嘗試使用環境變數
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK || '{}')
    if (Object.keys(serviceAccount).length > 0) {
      initializeApp({
        credential: cert(serviceAccount)
      })
    } else {
      throw new Error('無法從環境變數找到 Firebase 服務帳號')
    }
  } catch (err) {
    console.error('❌ Firebase Admin 初始化失敗:', err.message)
    console.log('✅ 本地開發提示：')
    console.log('   1. 在 Firebase Console 下載服務帳號金鑰')
    console.log('   2. 設置環境變數：export FIREBASE_ADMIN_SDK=$(cat key.json | jq -c .)')
    console.log('   或在 .env.local 中設置：FIREBASE_ADMIN_SDK={...}')
    process.exit(1)
  }
}

// 主遷移函式
async function migrateScoresField() {
  try {
    initializeFirebaseAdmin()
    const db = getFirestore()

    console.log('🔄 開始遷移...')
    console.log('')

    // 1. 獲取所有 classes 文檔
    const classesSnapshot = await db.collection('classes').get()

    if (classesSnapshot.empty) {
      console.log('⚠️  找不到任何班級記錄')
      return
    }

    console.log(`📊 找到 ${classesSnapshot.size} 個班級記錄`)
    console.log('')

    // 2. 為每個班級初始化 scores
    let updated = 0
    let alreadyHave = 0

    for (const doc of classesSnapshot.docs) {
      const classData = doc.data()
      const classId = doc.id

      // 檢查是否已有 scores 字段
      if (classData.scores && Object.keys(classData.scores).length > 0) {
        alreadyHave++
        console.log(`✅ ${classId}: 已有 scores 字段，跳過`)
        continue
      }

      // 初始化 scores
      const groupCount = classData.groupCount || 10
      const scores = {}

      for (let i = 1; i <= groupCount; i++) {
        scores[`group-${i}`] = 0
      }

      // 更新文檔
      await doc.ref.update({
        scores,
        scoresLastUpdate: new Date()
      })

      updated++
      console.log(`✨ ${classId}: 已初始化 ${groupCount} 組的 scores 字段`)
    }

    console.log('')
    console.log('✅ 遷移完成！')
    console.log(`  - 新增: ${updated} 個班級`)
    console.log(`  - 已存在: ${alreadyHave} 個班級`)
    console.log('')
    console.log('下一步：')
    console.log('  1. 驗證 Firestore 中的 classes 文檔已包含 scores 字段')
    console.log('  2. 如果需要從舊的 participation_logs 聚合歷史數據：')
    console.log('     node scripts/migrate-aggregate-historical-scores.js')
    console.log('')

  } catch (error) {
    console.error('❌ 遷移失敗:', error)
    process.exit(1)
  }
}

// 運行遷移
migrateScoresField()
