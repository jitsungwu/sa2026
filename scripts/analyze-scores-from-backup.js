/**
 * 分析备份文件中每个班级各组的积分
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 读取备份文件
const backupFilePath = path.join(__dirname, '..', 'firestore-backup-complete-2026-04-22.json')

console.log('📖 读取备份文件...')
const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf-8'))

// 提取 participation_logs
const participationLogs = backupData.collections?.participation_logs?.documents || {}

console.log(`✅ 找到 ${Object.keys(participationLogs).length} 条参与日志\n`)

// 按班级和组分类聚合积分
const scores = {}

Object.values(participationLogs).forEach(log => {
  const classId = log.classId
  const group = log.group
  const points = log.points || 0

  if (!classId || !group) return

  if (!scores[classId]) {
    scores[classId] = {}
  }

  if (!scores[classId][group]) {
    scores[classId][group] = 0
  }

  scores[classId][group] += points
})

// 获取班级名称
const classes = backupData.collections?.classes?.documents || {}

// 显示结果
console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║           各班级各组当前積分統計 (2026-04-22)               ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

Object.entries(scores).sort().forEach(([classId, groupScores]) => {
  const classInfo = classes[classId]
  const className = classInfo?.name?.stringValue || classInfo?.name || classId
  
  const groupList = Object.entries(groupScores)
    .sort(([a], [b]) => {
      const aNum = parseInt(a, 10)
      const bNum = parseInt(b, 10)
      return aNum - bNum
    })

  const totalScore = Object.values(groupScores).reduce((sum, score) => sum + score, 0)

  console.log(`📚 班級：${className} (${classId})`)
  console.log('   ┌─────────────────────────────────────┐')

  groupList.forEach(([group, score]) => {
    const groupNum = String(group).padStart(2, '0')
    const scoreStr = String(score).padStart(3, ' ')
    console.log(`   │  ${groupNum}組：${scoreStr} 分`)
  })

  console.log('   ├─────────────────────────────────────┤')
  console.log(`   │  合計：${String(totalScore).padStart(3, ' ')} 分 (${groupList.length}組有積分)`)
  console.log('   └─────────────────────────────────────┘\n')
})

// 全校统计
console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║                      全校總計                              ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

let totalAllScores = 0
let totalGroupsWithScore = 0
const classStats = []

Object.entries(scores).sort().forEach(([classId, groupScores]) => {
  const classInfo = classes[classId]
  const className = classInfo?.name?.stringValue || classInfo?.name || classId
  const classTotal = Object.values(groupScores).reduce((sum, score) => sum + score, 0)
  const groupCount = Object.keys(groupScores).length

  classStats.push({
    classId,
    className,
    totalScore: classTotal,
    groupCount
  })

  totalAllScores += classTotal
  totalGroupsWithScore += groupCount
})

classStats.forEach(({ className, totalScore, groupCount }) => {
  const scoreStr = String(totalScore).padStart(4, ' ')
  const groupStr = String(groupCount).padStart(2, ' ')
  console.log(`   ${className}: ${scoreStr} 分 (${groupStr}組有積分)`)
})

console.log('\n   ─────────────────────────────────────')
console.log(`   全校總分：${totalAllScores} 分`)
console.log(`   有積分的組數：${totalGroupsWithScore} 組`)
console.log('   ─────────────────────────────────────\n')

// 导出为 JSON 格式
const outputPath = path.join(__dirname, '..', 'scores-analysis-2026-04-22.json')
fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  backupDate: '2026-04-22',
  scores,
  stats: {
    totalScore: totalAllScores,
    totalGroupsWithScore,
    classCount: Object.keys(scores).length,
    classSummary: classStats
  }
}, null, 2))

console.log(`✅ 分析结果已保存至：scores-analysis-2026-04-22.json\n`)
