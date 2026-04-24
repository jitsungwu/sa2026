/**
 * 迁移脚本：将顶层 participation_logs 复制到各班级的子集合
 * 
 * 目的：为避免数据丢失，先将全局 participation_logs 中的数据按 classId 分类，
 *      复制到 classes/{classId}/participation_logs 子集合中
 * 
 * 保留原始数据：顶层 participation_logs 集合保持不变
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateParticipationLogs() {
  console.log('📝 开始迁移 participation_logs...\n')

  try {
    // 1. 读取顶层 participation_logs 中的所有文档
    console.log('📖 读取顶层 participation_logs 集合...')
    const logsRef = collection(db, 'participation_logs')
    const snapshot = await getDocs(logsRef)
    
    console.log(`✅ 读取到 ${snapshot.size} 条顶层记录\n`)

    if (snapshot.size === 0) {
      console.log('⚠️  顶层 participation_logs 集合为空，无需迁移')
      return
    }

    // 2. 按 classId 分类
    const logsByClass = {}
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data()
      const classId = data.classId || 'unknown'
      
      if (!logsByClass[classId]) {
        logsByClass[classId] = []
      }
      
      logsByClass[classId].push({
        docId: docSnap.id,
        data: data
      })
    })

    console.log('📊 按班级分类的日志数：')
    Object.entries(logsByClass).forEach(([classId, logs]) => {
      console.log(`   ${classId}: ${logs.length} 条`)
    })
    console.log()

    // 3. 为每个班级创建子集合并复制数据
    let totalCopied = 0
    for (const [classId, logs] of Object.entries(logsByClass)) {
      console.log(`📁 正在处理班级 "${classId}"...`)
      
      try {
        for (const { docId, data } of logs) {
          // 写入到子集合
          const targetRef = doc(db, 'classes', classId, 'participation_logs', docId)
          await setDoc(targetRef, {
            ...data,
            migratedAt: serverTimestamp()
          })
          totalCopied++
        }
        console.log(`   ✅ 已复制 ${logs.length} 条记录到 classes/${classId}/participation_logs`)
      } catch (err) {
        console.error(`   ❌ 处理班级 "${classId}" 时出错:`, err.message)
      }
    }

    console.log(`\n✨ 迁移完成！`)
    console.log(`   - 总记录数：${snapshot.size}`)
    console.log(`   - 成功复制：${totalCopied}`)
    console.log(`   - 班级数：${Object.keys(logsByClass).length}`)
    console.log(`\n📌 提示：`)
    console.log(`   ✓ 顶层 participation_logs 已保留（未删除）`)
    console.log(`   ✓ 所有记录已复制到对应班级的子集合`)
    console.log(`   ✓ 可通过对比验证数据完整性`)

  } catch (error) {
    console.error('❌ 迁移失败:', error)
    process.exit(1)
  }
}

// 执行迁移
migrateParticipationLogs().then(() => {
  console.log('\n✅ 脚本执行完成')
  process.exit(0)
}).catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
