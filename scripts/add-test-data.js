import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

// Firebase 配置
const firebaseConfig = {
  apiKey: "REMOVED",
  authDomain: "fju-im-sa.firebaseapp.com",
  projectId: "fju-im-sa",
  storageBucket: "fju-im-sa.firebasestorage.app",
  messagingSenderId: "613242701553",
  appId: "1:613242701553:web:d1ed3e5680025277d64b50"
}

// 初始化 Firebase
let app
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

const db = getFirestore(app)

// 學生資料篆本
const studentNames = [
  "王小明", "李美麗", "張三豐", "劉志鵬", "陳思涕",
  "黃棒文", "吳奔起", "周冠宇", "還伊帆", "林昆轣"
]

const studentClasses = ["A班", "B班", "C班", "D班"]

// 添加 10 筆學生資料
async function addStudents() {
  try {
    console.log("開始添加學生資料...")
    const testCollection = collection(db, "test")
    
    for (let i = 0; i < 10; i++) {
      const studentData = {
        name: studentNames[i],
        studentId: `STU${String(i + 1).padStart(4, '0')}`,
        class: studentClasses[i % 4],
        grade: Math.floor(Math.random() * 100) + 1,
        email: `student${i + 1}@school.edu.tw`,
        joinDate: new Date().toISOString()
      }
      
      const docRef = await addDoc(testCollection, studentData)
      console.log(`✓ 添加學生 #${i + 1}: ${studentData.name} (ID: ${docRef.id})`)
    }
    
    console.log("\n✅ 成功添加 10 筆學生資料到 'test' 集合！")
  } catch (error) {
    console.error("❌ 添加資料出錯:", error.message)
    process.exit(1)
  }
}

// 執行
addStudents().then(() => {
  console.log("\n任務完成！")
  process.exit(0)
})