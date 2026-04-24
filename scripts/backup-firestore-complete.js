/**
 * 完整 Firestore 備份腳本（客戶端 SDK + 分頁）
 * 逐頁讀取所有集合中的所有文檔並存為 JSON
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

if (!PROJECT_ID || !API_KEY) {
  console.error('❌ 缺少必要的環境變數')
  process.exit(1)
}

// 使用 Firestore REST API 讀取文檔
async function getCollection(collectionName, pageSize = 100) {
  const documents = {}
  let startAfter = null
  let totalRead = 0

  try {
    while (true) {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}`

      const params = new URLSearchParams({
        key: API_KEY,
        pageSize: pageSize.toString(),
      })

      if (startAfter) {
        params.append('pageToken', startAfter)
      }

      const response = await fetch(`${url}?${params}`)

      if (!response.ok) {
        console.error(`❌ 讀取 ${collectionName} 失敗:`, await response.text())
        break
      }

      const data = await response.json()

      if (!data.documents || data.documents.length === 0) {
        break
      }

      // 解析文檔
      for (const doc of data.documents) {
        const docPath = doc.name.split('/').pop()
        documents[docPath] = extractFirestoreData(doc.fields)
        totalRead++
      }

      console.log(`  ✓ 已讀取 ${totalRead} 個文檔...`)

      // 檢查是否有更多頁面
      if (!data.nextPageToken) {
        break
      }

      startAfter = data.nextPageToken
    }

    console.log(`  ✅ 完成! 共 ${totalRead} 個文檔`)
    return documents
  } catch (err) {
    console.error(`❌ 備份 ${collectionName} 時出錯:`, err.message)
    return documents
  }
}

// 解析 Firestore 字段格式為普通 JSON
function extractFirestoreData(fields) {
  const result = {}

  for (const [key, value] of Object.entries(fields)) {
    result[key] = extractValue(value)
  }

  return result
}

function extractValue(fieldValue) {
  if (fieldValue.stringValue) return fieldValue.stringValue
  if (fieldValue.integerValue) return parseInt(fieldValue.integerValue)
  if (fieldValue.doubleValue) return parseFloat(fieldValue.doubleValue)
  if (fieldValue.booleanValue) return fieldValue.booleanValue
  if (fieldValue.timestampValue) return fieldValue.timestampValue
  if (fieldValue.nullValue) return null
  if (fieldValue.arrayValue) {
    return fieldValue.arrayValue.values ? fieldValue.arrayValue.values.map(extractValue) : []
  }
  if (fieldValue.mapValue) {
    return extractFirestoreData(fieldValue.mapValue.fields)
  }

  return fieldValue
}

// 主函數
async function backupFirestore() {
  console.log('\n===============================================')
  console.log('🔄 開始完整 Firestore 備份...')
  console.log('===============================================\n')

  const backup = {
    timestamp: new Date().toISOString(),
    projectId: PROJECT_ID,
    backupMethod: 'Firestore REST API',
    collections: {},
    statistics: {
      backupStartTime: new Date(),
      totalCollections: 0,
      totalDocuments: 0,
    },
  }

  // 定義要備份的集合
  const collectionNames = ['classes', 'hands_raised', 'participation_logs', 'students', 'test']

  for (const collectionName of collectionNames) {
    console.log(`⏳ 正在備份集合: ${collectionName}`)
    const documents = await getCollection(collectionName)

    backup.collections[collectionName] = {
      documents,
      docCount: Object.keys(documents).length,
    }

    backup.statistics.totalDocuments += Object.keys(documents).length
    backup.statistics.totalCollections++
  }

  backup.statistics.backupEndTime = new Date()
  backup.statistics.duration = `${(backup.statistics.backupEndTime - backup.statistics.backupStartTime) / 1000} 秒`

  // 儲存備份檔案
  const timestamp = new Date().toISOString().split('T')[0]
  const backupFileName = `firestore-backup-complete-${timestamp}.json`
  const backupPath = path.join(projectRoot, backupFileName)

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8')

  console.log('\n===============================================')
  console.log('✅ 完整備份完成！')
  console.log('===============================================')
  console.log(`📁 檔案位置: ${backupPath}`)
  console.log(`📊 統計信息:`)
  console.log(`   • 集合數: ${backup.statistics.totalCollections}`)
  console.log(`   • 文檔總數: ${backup.statistics.totalDocuments}`)
  console.log(`   • 耗時: ${backup.statistics.duration}`)
  console.log(`   • 時間戳: ${backup.timestamp}`)
  console.log('===============================================\n')
}

backupFirestore()
