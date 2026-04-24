#!/usr/bin/env node

/**
 * 數據庫遷移腳本：遷移到新的子集合結構
 * 
 * 用途：
 *  1. 將 hands_raised（頂級）遷移到 classes/{classId}/hands_raised/
 *  2. 將 participation_logs（頂級）遷移到 classes/{classId}/participation_logs/
 * 
 * 優點：
 *  - 按班級分層存儲
 *  - 減少查詢成本
 *  - 易於刪除整個班級數據
 * 
 * 運行方式：
 *  node scripts/migrate-to-subcollection.js --hands-only
 *  node scripts/migrate-to-subcollection.js --logs-only
 *  node scripts/migrate-to-subcollection.js (全部)
 */

import dotenv from 'dotenv'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, writeBatch } from 'firebase-admin/firestore'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const handsOnly = args.includes('--hands-only')
const logsOnly = args.includes('--logs-only')
const allCollections = !handsOnly && !logsOnly

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

// 遷移 hands_raised
async function migrateHands(db) {
  console.log('🔄 遷移 hands_raised 到子集合...')

  const handsSnapshot = await db.collection('hands_raised').get()

  if (handsSnapshot.empty) {
    console.log('⚠️  無舉手記錄')
    return
  }

  let migrated = 0
  const batchSize = 500
  let batch = writeBatch(db)
  let batchCount = 0

  for (const doc of handsSnapshot.docs) {
    const handData = doc.data()
    const classId = handData.classId

    if (!classId) {
      console.log(`⚠️  舉手記錄無 classId，跳過: ${doc.id}`)
      continue
    }

    // 新路徑
    const newRef = db
      .collection('classes')
      .doc(classId)
      .collection('hands_raised')
      .doc(doc.id)

    batch.set(newRef, handData)
    batch.delete(doc.ref) // 刪除舊記錄

    batchCount++
    migrated++

    // 每 500 筆操作提交一次
    if (batchCount >= batchSize) {
      await batch.commit()
      batch = writeBatch(db)
      batchCount = 0
      console.log(`  ✅ 已遷移 ${migrated} 筆舉手記錄...`)
    }
  }

  if (batchCount > 0) {
    await batch.commit()
  }

  console.log(`✅ 舉手記錄遷移完成: ${migrated} 筆`)
  return migrated
}

// 遷移 participation_logs
async function migrateLogs(db) {
  console.log('🔄 遷移 participation_logs 到子集合...')

  const logsSnapshot = await db.collection('participation_logs').get()

  if (logsSnapshot.empty) {
    console.log('⚠️  無參與記錄')
    return
  }

  let migrated = 0
  const batchSize = 500
  let batch = writeBatch(db)
  let batchCount = 0

  for (const doc of logsSnapshot.docs) {
    const logData = doc.data()
    const classId = logData.classId

    if (!classId) {
      console.log(`⚠️  參與記錄無 classId，跳過: ${doc.id}`)
      continue
    }

    // 新路徑
    const newRef = db
      .collection('classes')
      .doc(classId)
      .collection('participation_logs')
      .doc(doc.id)

    batch.set(newRef, logData)
    batch.delete(doc.ref) // 刪除舊記錄

    batchCount++
    migrated++

    // 每 500 筆操作提交一次
    if (batchCount >= batchSize) {
      await batch.commit()
      batch = writeBatch(db)
      batchCount = 0
      console.log(`  ✅ 已遷移 ${migrated} 筆參與記錄...`)
    }
  }

  if (batchCount > 0) {
    await batch.commit()
  }

  console.log(`✅ 參與記錄遷移完成: ${migrated} 筆`)
  return migrated
}

// 主遷移函式
async function migrate() {
  try {
    initializeFirebaseAdmin()
    const db = getFirestore()

    console.log('')
    console.log('🚀 開始數據庫遷移...')
    console.log('')

    let handsCount = 0
    let logsCount = 0

    if (allCollections || handsOnly) {
      handsCount = await migrateHands(db) || 0
      console.log('')
    }

    if (allCollections || logsOnly) {
      logsCount = await migrateLogs(db) || 0
      console.log('')
    }

    console.log('✅ 遷移完成！')
    console.log(`  - 舉手記錄: ${handsCount} 筆`)
    console.log(`  - 參與記錄: ${logsCount} 筆`)
    console.log('')
    console.log('⚠️  重要：')
    console.log('  1. 備份原始數據！')
    console.log('  2. 驗證新的子集合結構是否完整')
    console.log('  3. 驗證客戶端代碼是否已更新指向新路徑')
    console.log('  4. 確認無誤後可刪除舊的頂級集合（如有必要）')
    console.log('')

  } catch (error) {
    console.error('❌ 遷移失敗:', error)
    process.exit(1)
  }
}

// 運行遷移
migrate()
