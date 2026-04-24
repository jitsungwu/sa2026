#!/usr/bin/env node

/**
 * 數據庫遷移腳本：聚合歷史積分數據
 * 
 * 用途：從現有的 participation_logs（頂級集合）讀取歷史數據
 *      並聚合到 classes.scores 字段
 * 
 * 運行方式：node scripts/migrate-aggregate-historical-scores.js
 */

import dotenv from 'dotenv'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, batch } from 'firebase-admin/firestore'

dotenv.config({ path: '.env.local' })

// Firebase Admin 初始化
const initializeFirebaseAdmin = () => {
  try {
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
    process.exit(1)
  }
}

// 主遷移函式
async function aggregateHistoricalScores() {
  try {
    initializeFirebaseAdmin()
    const db = getFirestore()

    console.log('🔄 開始聚合歷史數據...')
    console.log('')

    // 1. 獲取所有 classes
    const classesSnapshot = await db.collection('classes').get()

    if (classesSnapshot.empty) {
      console.log('⚠️  找不到任何班級記錄')
      return
    }

    console.log(`📊 找到 ${classesSnapshot.size} 個班級記錄`)
    console.log('')

    // 2. 對每個班級，從舊的 participation_logs 聚合
    let processedCount = 0
    let totalRecords = 0

    for (const classDoc of classesSnapshot.docs) {
      const classId = classDoc.id

      // 從舊的頂級 participation_logs 集合查詢
      const logsSnapshot = await db
        .collection('participation_logs')
        .where('classId', '==', classId)
        .get()

      if (logsSnapshot.empty) {
        console.log(`📝 ${classId}: 無歷史記錄`)
        continue
      }

      // 聚合
      const scores = {}
      logsSnapshot.docs.forEach(doc => {
        const { group, points } = doc.data()
        scores[group] = (scores[group] || 0) + points
        totalRecords += 1
      })

      // 更新 classes 文檔
      await classDoc.ref.update({
        scores,
        scoresLastUpdate: new Date(),
        migratedFrom: 'participation_logs',
        migratedAt: new Date(),
        migratedRecordCount: logsSnapshot.size
      })

      processedCount++
      console.log(`✨ ${classId}: 聚合 ${logsSnapshot.size} 筆記錄`)
      console.log(`   分數分布: ${JSON.stringify(scores)}`)
    }

    console.log('')
    console.log('✅ 聚合完成！')
    console.log(`  - 處理班級數: ${processedCount}`)
    console.log(`  - 聚合記錄總數: ${totalRecords}`)
    console.log('')
    console.log('下一步：')
    console.log('  1. 驗證 classes.scores 字段是否正確')
    console.log('  2. 將舊的 participation_logs 記錄遷移到新的子集合結構：')
    console.log('     node scripts/migrate-logs-to-subcollection.js')
    console.log('  3. 將 hands_raised 遷移到子集合結構：')
    console.log('     node scripts/migrate-hands-to-subcollection.js')
    console.log('')

  } catch (error) {
    console.error('❌ 聚合失敗:', error)
    process.exit(1)
  }
}

// 運行遷移
aggregateHistoricalScores()
