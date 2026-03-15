"use client"
import { useEffect, useState } from "react"
import { db } from "../firebaseClient"
import { collection, getDocs } from "firebase/firestore"

export default function TestCollectionPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        const querySnapshot = await getDocs(collection(db, "test"))
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setStudents(data)
      } catch (err) {
        setError("讀取資料失敗: " + err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div>載入中...</div>
  if (error) return <div style={{color: 'red'}}>{error}</div>

  return (
    <main>
      <h1>Test 集合 - 學生資料</h1>
      <div className="table-wrap" style={{marginTop: 16}}>
        <table className="data-table" role="table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>學訅</th>
              <th>班級</th>
              <th>分數</th>
              <th>Email</th>
              <th>加入日期</th>
              <th>Document ID</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.studentId}</td>
                <td>{s.class}</td>
                <td>{s.grade}</td>
                <td>{s.email}</td>
                <td>{s.joinDate ? new Date(s.joinDate).toLocaleString() : ""}</td>
                <td>{s.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {students.length === 0 && <div>目前沒有資料。</div>}
    </main>
  )
}