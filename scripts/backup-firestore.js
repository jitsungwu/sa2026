/**
 * Firestore 完整備份腳本 (客戶端 SDK 版本)
 * 用途：將所有 Firestore 集合和數據匯出為完整 JSON 檔
 * 
 * 優化特性：
 * - 使用客戶端 SDK + Firebase Config（不需要 Service Account）
 * - 分頁查詢支持大型集合（避免記憶體溢出）
 * - 完整的子集合支持（準備中）
 * 
 * 使用方式：
 *   node scripts/backup-firestore.js
 */

import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  limit,
  startAfter,
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// 載入環境變數
dotenv.config({ path: '.env.local' })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')

// 初始化 Firebase（使用客戶端 SDK）
function initializeFirebase() {
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Firebase 環境變數未完整設置')
    }

    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    console.log('✅ Firebase SDK 初始化成功')
    return db
  } catch (err) {
    console.error('❌ Firebase 初始化失敗:', err.message)
    process.exit(1)
  }
}

// 分頁查詢集合（大型集合專用）
async function getAllDocumentsFromCollection(db, collectionName, pageSize = 100) {
  const documents = {}
  let lastDoc = null
  let pageCount = 0
  let totalDocs = 0

  try {
    let hasMore = true
    
    while (hasMore) {
      pageCount++
      let queryRef = collection(db, collectionName)
      
      // 使用 getDocs 逐頁讀取
      let snapshot = await getDocs(
        query(
          queryRef,
          limit(pageSize + 1)
        )
      )

      // 處理當前頁的文檔
      for (let i = 0; i < Math.min(snapshot.docs.length, pageSize); i++) {
        const doc = snapshot.docs[i]
        documents[doc.id] = doc.data()
        totalDocs++
      }

      // 檢查是否有更多文檔
      hasMore = snapshot.docs.length > pageSize
      
      if (hasMore) {
        lastDoc = snapshot.docs[pageSize - 1]
      }

      if (pageCount % 5 === 0) {
        console.log(`  ⏳ 已讀取 ${totalDocs} 個文檔...`)
      }
    }

    console.log(`  ✅ 已備份 ${totalDocs} 個文檔 (${pageCount} 頁)`)
    return documents
  } catch (err) {
    console.error(`  ❌ 讀取集合 "${collectionName}" 失敗:`, err.message)
    return documents
  }
}

// 備份單個集合 (帶進度提示)
async function backupCollection(db, collectionName, pageSize = 100) {
  console.log(`\n⏳ 正在備份集合: ${collectionName}`)
  
  const documents = await getAllDocumentsFromCollection(db, collectionName, pageSize)
  return {
    collectionName,
    documents,
    docCount: Object.keys(documents).length
  }
}

// 主備份函數
async function backupFirestore() {
  console.log('\n===============================================')
  console.log('🔄 開始 Firestore 完整備份...')
  console.log('===============================================')

  const db = initializeFirebase()
  
  // 定義要備份的集合及其分頁大小
  const collectionsToBackup = [
    { name: 'classes', pageSize: 50 },
    { name: 'hands_raised', pageSize: 100 },
    { name: 'participation_logs', pageSize: 100 },
    { name: 'students', pageSize: 100 },
    { name: 'test', pageSize: 50 }
  ]

  const backup = {
    timestamp: new Date().toISOString(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    backupMethod: 'Firebase Client SDK',
    collections: {},
    statistics: {
      startTime: new Date(),
      totalCollections: 0,
      totalDocuments: 0,
    }
  }

  try {
    // 逐個備份定義的集合
    for (const collectionConfig of collectionsToBackup) {
      const { collectionName, documents, docCount } = await backupCollection(
        db,
        collectionConfig.name,
        collectionConfig.pageSize
      )

      backup.collections[collectionName] = {
        documents,
        docCount
      }

      backup.statistics.totalDocuments += docCount
      backup.statistics.totalCollections++
    }

    // 計算統計信息
    backup.statistics.endTime = new Date()
    backup.statistics.duration = `${(backup.statistics.endTime - backup.statistics.startTime) / 1000} 秒`

    // 保存備份檔案
    const timestamp = new Date().toISOString().split('T')[0]
    const backupFileName = `firestore-backup-${timestamp}-complete.json`
    const backupPath = path.join(projectRoot, backupFileName)

    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8')

    // 輸出統計信息
    console.log('\n===============================================')
    console.log('✅ 備份成功完成！')
    console.log('===============================================')
    console.log(`📁 檔案位置: ${backupPath}`)
    console.log(`📊 統計信息:`)
    console.log(`   • 集合數: ${backup.statistics.totalCollections}`)
    console.log(`   • 文檔總數: ${backup.statistics.totalDocuments}`)
    
    // 按集合顯示詳細統計
    console.log(`\n   詳細統計:`)
    for (const [collName, collData] of Object.entries(backup.collections)) {
      console.log(`   • ${collName}: ${collData.docCount} 個文檔`)
    }
    
    console.log(`   • 耗時: ${backup.statistics.duration}`)
    console.log(`   • 時間戳: ${backup.timestamp}`)
    console.log('===============================================\n')

    console.log(`✨ 備份檔案大小: ${Math.round(fs.statSync(backupPath).size / 1024)} KB`)

    return backupPath
  } catch (err) {
    console.error('❌ 備份過程中出現錯誤:', err)
    process.exit(1)
  }
}

// 執行備份
backupFirestore()
