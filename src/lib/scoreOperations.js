/**
 * 積分操作函式庫
 * 支持優化後的 scores 快取結構
 * 
 * 改進前：每次顯示積分榜需讀取整個 participation_logs 集合 (1000+ reads)
 * 改進後：只需讀取 classes/{classId}.scores (1 read)
 */

import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  onSnapshot,
  getDocs,
  updateDoc,
  increment,
} from './firestoreWrapper'

/**
 * 打分時的原子操作 - 同時更新 logs 和 scores
 * @param {object} db - Firestore 實例
 * @param {string} classId - 班級 ID
 * @param {string} group - 小組 ID
 * @param {number} points - 給分
 * @param {string} givenBy - 打分者 uid
 * @returns {Promise} 結果
 */
export async function awardPoints(db, classId, group, points, givenBy) {
  try {
    const batch = writeBatch(db)

    // 1. 寫入審計日誌
    const logRef = doc(
      collection(db, `classes/${classId}/participation_logs`),
      `${Date.now()}-${Math.random().toString(36).substring(7)}`
    )
    batch.set(logRef, {
      group,
      points,
      timestamp: serverTimestamp(),
      givenBy,
      givenByRole: 'teacher' // 或 'presenting_scorer'
    })

    // 2. 原子更新 classes 文檔的 scores
    const classRef = doc(db, `classes/${classId}`)
    batch.update(classRef, {
      [`scores.${group}`]: increment(points),
      scoresLastUpdate: serverTimestamp()
    })

    await batch.commit()
    console.log(`✅ 已給 ${group} ${points} 分`)
    return { success: true, message: `已給 ${group} ${points} 分` }
  } catch (error) {
    console.error('❌ 打分失敗:', error)
    throw error
  }
}

/**
 * 實時監聽積分榜（優化版）
 * 只需讀取 1 個文檔！
 * @param {object} db - Firestore 實例
 * @param {string} classId - 班級 ID
 * @param {function} onUpdate - 回調函式
 * @returns {function} 取消監聽函式
 */
export function listenToScores(db, classId, onUpdate) {
  try {
    const classRef = doc(db, `classes/${classId}`)

    // 只監聽 classes 文檔！無需聚合整個 logs 集合
    const unsubscribe = onSnapshot(classRef, (docSnap) => {
      if (docSnap.exists()) {
        const { scores = {} } = docSnap.data()
        console.log('📊 積分更新:', scores)
        onUpdate(scores)  // { "group-1": 15, "group-2": 12, ... }
      }
    }, (error) => {
      console.error('❌ 監聽積分失敗:', error)
    })

    return unsubscribe
  } catch (error) {
    console.error('❌ 監聽設置失敗:', error)
    throw error
  }
}

/**
 * 重新計算小組總分（老師按鈕）
 * 讀取所有審計日誌並聚合到 scores 字段
 * @param {object} db - Firestore 實例
 * @param {string} classId - 班級 ID
 * @returns {Promise<object>} 重新計算的 scores 對象
 */
export async function recalculateScores(db, classId) {
  try {
    console.log('🔄 開始重新計算...')

    // 讀取所有審計日誌
    const logsRef = collection(db, `classes/${classId}/participation_logs`)
    const snapshot = await getDocs(logsRef)

    // 聚合
    const scores = {}
    let totalPoints = 0
    let totalRecords = 0

    snapshot.docs.forEach(docSnap => {
      const { group, points } = docSnap.data()
      scores[group] = (scores[group] || 0) + points
      totalPoints += points
      totalRecords += 1
    })

    // 原子寫回 classes 文檔
    const classRef = doc(db, `classes/${classId}`)
    await updateDoc(classRef, {
      scores,
      scoresLastUpdate: serverTimestamp()
    })

    console.log(`✅ 重新計算完成！`)
    console.log(`  - 共 ${totalRecords} 筆記錄`)
    console.log(`  - 總分數: ${totalPoints}`)
    console.log(`  - 結果:`, scores)

    return { success: true, scores, totalRecords, totalPoints }
  } catch (error) {
    console.error('❌ 重新計算失敗:', error)
    throw error
  }
}

/**
 * 初始化 classes 文檔的 scores 字段
 * 用於第一次設置或重置
 * @param {object} db - Firestore 實例
 * @param {string} classId - 班級 ID
 * @param {number} groupCount - 小組數量（預設 10）
 * @returns {Promise} 結果
 */
export async function initializeScores(db, classId, groupCount = 10) {
  try {
    const scores = {}
    for (let i = 1; i <= groupCount; i++) {
      scores[`group-${i}`] = 0
    }

    const classRef = doc(db, `classes/${classId}`)
    await updateDoc(classRef, {
      scores,
      scoresLastUpdate: serverTimestamp()
    })

    console.log(`✅ 已初始化 ${groupCount} 組的積分字段`)
    return { success: true, scores }
  } catch (error) {
    console.error('❌ 初始化失敗:', error)
    throw error
  }
}

/**
 * 查詢單個小組的積分
 * @param {object} db - Firestore 實例
 * @param {string} classId - 班級 ID
 * @param {string} group - 小組 ID
 * @returns {Promise<number>} 積分
 */
export async function getGroupScore(db, classId, group) {
  try {
    const classRef = doc(db, `classes/${classId}`)
    const docSnap = await getDoc(classRef)
    if (docSnap.exists()) {
      const { scores = {} } = docSnap.data()
      return scores[group] || 0
    }
    return 0
  } catch (error) {
    console.error('❌ 查詢失敗:', error)
    throw error
  }
}

/**
 * 重置班級積分
 * @param {object} db - Firestore 實例
 * @param {string} classId - 班級 ID
 * @param {number} groupCount - 小組數量（預設 10）
 * @returns {Promise} 結果
 */
export async function resetScores(db, classId, groupCount = 10) {
  try {
    const scores = {}
    for (let i = 1; i <= groupCount; i++) {
      scores[`group-${i}`] = 0
    }

    const classRef = doc(db, `classes/${classId}`)
    await updateDoc(classRef, {
      scores,
      scoresLastUpdate: serverTimestamp()
    })

    console.log(`✅ 已重置所有積分`)
    return { success: true, scores }
  } catch (error) {
    console.error('❌ 重置失敗:', error)
    throw error
  }
}
