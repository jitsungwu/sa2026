"use client"
import React, { useState, useEffect } from 'react'
import { Workbook } from 'exceljs'

export default function ImportPage() {
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState([])
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [classId, setClassId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // try to get active classId from query param
    try {
      const params = new URLSearchParams(window.location.search)
      const c = params.get('classId')
      if (c) setClassId(c)
    } catch (e) {}
  }, [])

  const onFileChange = (e) => {
    setFile(e.target.files?.[0] || null)
    setPreview(null)
    setRows([])
    setMessage('')
  }

  const parseFile = async () => {
    if (!file) return setMessage('請先選擇 .xls 檔案')
    setLoading(true)
    try {
      const ab = await file.arrayBuffer()
      const wb = new Workbook()
      await wb.xlsx.load(ab)
      const ws = wb.getWorksheet(1)
      const mapped = []
      if (ws) {
        ws.eachRow((row, rowNum) => {
          if (rowNum === 1) return // skip header row
          mapped.push({
            A: (row.getCell(1).value ?? '').toString(),
            B: (row.getCell(2).value ?? '').toString(),
            D: (row.getCell(4).value ?? '').toString(),
            E: (row.getCell(5).value ?? '').toString(),
            row: rowNum
          })
        })
      }
      setRows(mapped)
      // call server preview
      const resp = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, rows: mapped })
      })
      const json = await resp.json()
      setPreview(json)
      setMessage(resp.status === 200 ? '解析完成' : '解析遇到問題')
    } catch (e) {
      console.error(e)
      setMessage('讀取檔案失敗')
    } finally {
      setLoading(false)
    }
  }

  const doCommit = async () => {
    if (!preview) return
    setLoading(true)
    try {
      const resp = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, rows })
      })
      const json = await resp.json()
      if (resp.status === 200) {
        setMessage('匯入成功：' + JSON.stringify(json))
      } else {
        setMessage('匯入失敗：' + JSON.stringify(json))
      }
    } catch (e) {
      console.error(e)
      setMessage('匯入過程發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>匯入學生名單（Excel .xls）</h1>
      <div style={{ marginBottom: 8 }}>
        <label>ClassId: <input value={classId} onChange={e => setClassId(e.target.value)} placeholder="classId" /></label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <input type="file" accept=".xls,.xlsx" onChange={onFileChange} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <button onClick={parseFile} disabled={loading || !file}>解析預覽</button>
        <button onClick={doCommit} disabled={loading || !preview || (preview.errors && preview.errors.length>0)}>確認匯入</button>
      </div>
      <div style={{ marginBottom: 8 }}>{message}</div>

      {preview && (
        <div>
          <h2>Preview</h2>
          <div>Errors: {JSON.stringify(preview.errors)}</div>
          <div>Warnings: {JSON.stringify(preview.warnings)}</div>
          <div>
            {preview.groups && preview.groups.map(g => (
              <div key={g.groupId} style={{ border: '1px solid #ddd', margin: 6, padding: 6 }}>
                <strong>Group {g.groupId}</strong> declared: {g.declaredCount} parsed: {g.parsedCount}
                <ul>
                  {(g.students || []).map(s => <li key={s.account}>{s.account} — {s.name} ({s.major})</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
