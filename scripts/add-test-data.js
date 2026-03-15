import dotenv from 'dotenv'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

// 加載環境變數
dotenv.config({ path: '.env.local' })

// Firebase 配置 - 使用環境變數
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
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