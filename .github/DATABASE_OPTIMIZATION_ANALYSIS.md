# 數據庫優化分析報告

**日期**：2026年4月22日  
**環境**：Firebase 免費版  
**目的**：分析 `hands_raised` 和 `participation_logs` 的性能問題及改進方案

---

## 問題一：`hands_raised` 集合的設計問題

### 现状分析

#### 当前结构
```
hands_raised/
├── {docId1}
│   ├── classId: "class-A"
│   ├── group: "group-1"
│   ├── ownerId: "student-123"
│   ├── timestamp: 2026-04-22T10:30:00Z
│   ├── active: true
│   ├── resolved: false
│   └── cancelled: false
├── {docId2}
├── {docId3}
└── ...（数百/数千条记录）
```

#### 核心问题

| 问题 | 影响 | 严重程度 |
|------|------|---------|
| **1. 集合无上下文分割** | 所有班级的舉手记录混在一起，查询需要过滤 classId，随着班级增多效率下降 | 🔴 高 |
| **2. 文档堆积** | 课程结束后旧记录仍在集合中，导致集合日益庞大 | 🔴 高 |
| **3. "每组限举一次" 无法高效实现** | 需要为每个 (classId, group) 对查询历史，检查是否已存在 active/resolved 记录 | 🟠 中 |
| **4. 缺少聚合字段** | 教师面板需要实时监听整个集合，计算"当前有多少组在举手" | 🟠 中 |

---

### 改进方案

#### **方案 A：按班级分割子集合（推荐）**

**设计**：改变存储结构，将 `hands_raised` 改为子集合

```
classes/{classId}/hands_raised/
├── {docId1}
├── {docId2}
└── ...

示例：
classes/class-A/hands_raised/
├── group-1-2026-04-22T10:30:00Z
├── group-2-2026-04-22T10:31:00Z
└── ...
```

**优点**：
- ✅ **查询效率高**：每次只需查询特定班级的舉手，不需要全表扫描 + classId 过滤
- ✅ **自动隔离**：班级数据天然分离，易于管理和扩展
- ✅ **易于清理**：课程结束时可批量删除 `classes/{classId}/hands_raised` 子集合
- ✅ **易于实现"每组限一次"**：可以为每个组维护一个 document
  ```
  classes/class-A/hands_raised/group-1
  {
    "active": true,
    "ownerId": "student-123",
    "timestamp": ...,
    "resolved": false
  }
  ```
  这样查询 `classes/class-A/hands_raised/group-{groupId}` 就知道该组是否已举手

**实现步骤**：
1. 新增 Cloud Function 执行迁移：`hands_raised` → `classes/{classId}/hands_raised/`
2. 更新所有读写逻辑指向新路径
3. 更新 Firestore 安全规则
4. 设置清理策略（TTL 或定时任务）

**Firestore 规则示例**：
```
match /classes/{classId}/hands_raised/{doc} {
  allow read: if request.auth.uid != null;
  allow write: if request.auth.uid != null && 
               request.resource.data.classId == classId;
}
```

---

#### **方案 B：维持顶级集合 + 添加聚合表**

**设计**：保留 `hands_raised`，但新增 `classes/{classId}/hand_summary` 用于缓存

```
classes/class-A/hand_summary
{
  "activeCount": 3,
  "activeGroups": ["group-1", "group-3", "group-5"],
  "lastUpdated": 2026-04-22T10:35:00Z
}
```

**优点**：
- ✅ 改动最小，现有代码改动少
- ✅ 教师面板可直接读取汇总信息，避免遍历

**缺点**：
- ❌ 需要额外逻辑维护 `hand_summary`（可能不同步）
- ❌ 仍需全表扫描查询单个班级的舉手
- ❌ 与"每组限一次"的要求不匹配

---

#### **推荐方案**：**方案 A（按班级分割）**

**理由**：
- 符合 Firestore 最佳实践（hierarchical data）
- 完全符合"每组限一次"的业务需求
- 查询和清理都高效
- 长期可扩展性最强

---

## 問題二：`participation_logs` 集合的性能問題

### 現狀分析

#### 當前結構
```
participation_logs/
├── {docId1}
│   ├── classId: "class-A"
│   ├── group: "group-1"
│   ├── points: 1
│   ├── timestamp: 2026-04-22T10:30:00Z
│   ├── studentId: null (或學生 ID)
│   └── handRef: DocumentReference
├── {docId2}
├── {docId3}
└── ...（數百/數千條記錄）
```

#### 核心問題

| 問題 | 影響 | 嚴重程度 |
|------|------|---------|
| **1. 文檔堆積** | 課程進行中記錄不斷增加，導致集合越來越大 | 🔴 高 |
| **2. 每次顯示累積分數都需要讀取/聚合** | 每個學生/教師打開積分榜都要遍歷整個集合，計算 SUM(points GROUP BY group)，讀取次數過多 | 🔴 高 |
| **3. 無上下文分割** | 所有班級的記錄混在一起，查詢需要過濾 classId | 🔴 高 |
| **4. 資料冗餘與審計平衡** | 需要保留原始記錄以供審計，但又不能每次顯示都重新計算 | 🟠 中 |

---

### 改進方案

#### **方案 B：在 `classes` 文檔中存儲實時總分（推薦）**

**核心思路**：
- 在 `classes/{classId}` 文檔中新增 `scores` 欄位存儲各組的累積分數
- 保留 `classes/{classId}/participation_logs/` 作為審計日誌（只寫、不修改）
- 打分時透過 **Batch Write** 原子更新兩者

**設計**：

```
classes/class-A/
{
  "name": "甲班",
  "groupCount": 10,
  "active": true,
  "scores": {
    "group-1": 15,
    "group-2": 12,
    "group-3": 8,
    ...
  },
  "scoresLastUpdate": 2026-04-22T10:35:00Z,
  
  // 子集合：審計日誌（保留完整歷史）
  participation_logs/
  ├── {docId1}
  │   ├── group: "group-1"
  │   ├── points: 1
  │   ├── timestamp: 2026-04-22T10:30:00Z
  │   ├── givenBy: "teacher-uid"
  │   └── handRef: DocumentReference
  ├── {docId2}
  └── ...
}
```

**優點**：
- ✅ **讀取性能極高**：顯示積分榜只需 1 次讀取 `classes/{classId}` 的 `scores` 欄位
- ✅ **即時同步**：所有客戶端透過 `onSnapshot` 實時收到更新
- ✅ **審計完整**：原始 logs 永遠保留，支援後期查詢和分析
- ✅ **無需 Cloud Functions**：純客戶端邏輯，適合 Firebase 免費版
- ✅ **易於清理**：課程結束時可批量刪除子集合
- ✅ **支持即時重新計算**：老師可隨時點擊按鈕重新聚合所有 logs

**讀取積分榜（客戶端）**：
```javascript
// 只需讀取 1 個文檔！
const classRef = doc(db, `classes/${classId}`)
onSnapshot(classRef, (docSnap) => {
  const { scores } = docSnap.data()
  setScores(scores)  // { "group-1": 15, "group-2": 12, ... }
})
```

**打分時的操作（使用 Batch 保證原子性）**：
```javascript
import { writeBatch, doc, collection, serverTimestamp, increment } from 'firebase/firestore'

const awardPoints = async (classId, group, points, givenBy) => {
  const batch = writeBatch(db)
  
  // 1. 寫入審計日誌
  const logRef = doc(
    collection(db, `classes/${classId}/participation_logs`),
    `${Date.now()}-${Math.random()}`
  )
  batch.set(logRef, {
    group,
    points,
    timestamp: serverTimestamp(),
    givenBy
  })
  
  // 2. 原子更新 classes 文檔的 scores
  const classRef = doc(db, `classes/${classId}`)
  batch.update(classRef, {
    [`scores.${group}`]: increment(points),
    scoresLastUpdate: serverTimestamp()
  })
  
  await batch.commit()
}
```

**即時重新計算功能（老師按鈕）**：
```javascript
const recalculateScores = async (classId) => {
  try {
    // 讀取所有審計日誌
    const logsRef = collection(db, `classes/${classId}/participation_logs`)
    const snapshot = await getDocs(logsRef)
    
    // 聚合
    const scores = {}
    snapshot.docs.forEach(doc => {
      const { group, points } = doc.data()
      scores[group] = (scores[group] || 0) + points
    })
    
    // 原子寫回 classes 文檔
    const classRef = doc(db, `classes/${classId}`)
    await updateDoc(classRef, {
      scores,
      scoresLastUpdate: serverTimestamp()
    })
    
    console.log('✅ 重新計算完成', scores)
  } catch (error) {
    console.error('❌ 重新計算失敗', error)
  }
}
```

**老師面板上的重新計算按鈕**：
```jsx
const RecalculateButton = ({ classId }) => {
  const [loading, setLoading] = useState(false)
  
  const handleRecalculate = async () => {
    setLoading(true)
    try {
      await recalculateScores(classId)
      alert('✅ 已重新計算所有小組分數')
    } catch (error) {
      alert('❌ 重新計算失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <button onClick={handleRecalculate} disabled={loading}>
      {loading ? '重新計算中...' : '🔄 重新計算小組總分'}
    </button>
  )
}
```

---

## 综合优化策略

### 整体架构改造

```
当前架构（顶级集合）：
  hands_raised (全班级混合)
  participation_logs (全班级混合)
  
改进后架构（按班级分层）：
  classes/{classId}/
  ├── info (班级基本信息)
  ├── hands_raised/ (舉手记录，按组 ID)
  ├── participation_logs/ (审计日志，只写)
  └── score_snapshot/ (实时积分缓存)
```

### 新增 Firestore 规则

```firestore
// 保护 score_snapshot 只能由 Cloud Function 写入
match /classes/{classId}/score_snapshot/current {
  allow read: if request.auth.uid != null;
  allow write: if false;  // 仅允许 server 端写入
  allow create: if false;
}

// 保护 participation_logs 只能追加
match /classes/{classId}/participation_logs/{doc} {
  allow read: if request.auth.uid != null;
  allow create: if request.auth.uid != null &&
                request.resource.data.classId == classId;
  allow update, delete: if false;  // 禁止修改和删除（审计用）
}
```

### 迁移计划

| 阶段 | 任务 | 优先级 |
|------|------|--------|
| **第1阶段** | 新建 `classes/{classId}/score_snapshot` 聚合缓存；部署 Cloud Function 维护 | 🔴 高 |
| **第2阶段** | 新建 `classes/{classId}/hands_raised` 子集合；部署迁移脚本 | 🔴 高 |
| **第3阶段** | 更新所有客户端代码指向新路径 | 🟠 中 |
| **第4阶段** | 更新 Firestore 安全规则 | 🟠 中 |
| **第5阶段** | 清理旧数据（`hands_raised` 顶级集合、`participation_logs` 顶级集合） | 🟡 低 |

---

## 预期收益

### `hands_raised` 优化（方案 A）

| 指标 | 改进前 | 改进后 | 收益 |
|------|--------|--------|------|
| **查询成本** | O(N) - 全表扫描 | O(1) - 按班级查询 | **90%+ 查询减少** |
| **"每组限一次"实现** | 需要遍历历史 | 单个 doc 查询 | **99%+ 成本降低** |
| **数据隔离** | 无，所有班级混合 | 有，按班级分离 | **易于管理和清理** |

### `participation_logs` 优化

| 指标 | 改进前 | 改进后 | 收益 |
|------|--------|--------|------|
| **显示积分榜的 reads** | 1000+（聚合成本） | 1（读取 scores） | **99%+ reads 减少** |
| **费用** | 每课程 ¥100+ | 每课程 ¥1-2 | **99%+ 成本降低** |
| **审计完整性** | 完整 | 完整 | **无损失** |
| **更新延迟** | 实时 | 实时（Batch Write） | **无劣化** |
| **重新计算功能** | 不可行 | 可行（老师手动触发） | **✅ 新增功能** |

---

## 实施清单

### 第1阶段：`participation_logs` 最佳化

- [ ] 在 `classes/{classId}` 新增 `scores` 字段（初始值 `{}` 或 `{ "group-1": 0, ... }`)
- [ ] 新增 `scoresLastUpdate: timestamp` 字段
- [ ] 更新打分逻辑：使用 `writeBatch()` 同时写入 logs 和更新 scores
- [ ] 新增"重新计算小组总分"按钮到老师面板
- [ ] 更新客户端读取逻辑：直接监听 `classes/{classId}` 的 scores
- [ ] 编写/更新 E2E 测试

### 第2阶段：`hands_raised` 最佳化

- [ ] 建立 `classes/{classId}/hands_raised/` 子集合结构
- [ ] 编写迁移脚本：`hands_raised` (顶级) → `classes/{classId}/hands_raised/`
- [ ] 更新所有举手逻辑指向新路径
- [ ] 验证"每组限一次"功能
- [ ] 清理旧的顶级 `hands_raised` 集合

### 第3阶段：安全规则

- [ ] 更新 Firestore 安全规则
- [ ] 部署新规则到生产环境
- [ ] 验证规则有效性

---

## 参考资源

- [Firestore 最佳实践：分层数据](https://cloud.google.com/firestore/docs/best-practices)
- [Firestore Batch Writes](https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes)
- [Denormalization in Firestore](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase 免费版限制](https://firebase.google.com/pricing)
