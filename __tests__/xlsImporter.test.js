import { describe, it, expect } from 'vitest'
import { parsePreview, ERRORS } from '../src/lib/xlsImporter.js'

describe('xlsImporter.parsePreview', () => {
  it('parses valid groups and students (happy path)', () => {
    const rows = [
      { A: '01', E: '2', row: 1 },
      { A: '123456789', B: '張三', D: '資管系', row: 2 },
      { A: '987654321', B: '李四', D: '資管系', row: 3 },
      { A: '02', E: '1', row: 4 },
      { A: '111222333', B: '王五', D: '資管系', row: 5 }
    ]

    const res = parsePreview(rows, new Set())
    expect(res.errors).toHaveLength(0)
    expect(res.groups).toHaveLength(2)
    expect(res.groups[0].parsedCount).toBe(2)
    expect(res.groups[1].parsedCount).toBe(1)
  })

  it('errors when student appears before any group header', () => {
    const rows = [ { A: '123456789', B: '張三', D: '資管系', row: 1 } ]
    const res = parsePreview(rows)
    expect(res.errors.some(e => e.type === ERRORS.MISSING_GROUP_HEADER)).toBe(true)
  })

  it('errors on duplicate groupId', () => {
    const rows = [ { A: '01', E: '1', row: 1 }, { A: '01', E: '1', row: 3 } ]
    const res = parsePreview(rows)
    expect(res.errors.some(e => e.type === ERRORS.DUPLICATE_GROUP)).toBe(true)
  })

  it('errors on invalid account format', () => {
    const rows = [ { A: '01', E: '1', row: 1 }, { A: 'abc123', B: '張三', row: 2 } ]
    const res = parsePreview(rows)
    expect(res.errors.some(e => e.type === ERRORS.INVALID_ACCOUNT)).toBe(true)
  })

  it('errors on duplicate existing account in class', () => {
    const rows = [ { A: '01', E: '1', row: 1 }, { A: '123456789', B: '張三', row: 2 } ]
    const existing = new Set(['123456789'])
    const res = parsePreview(rows, existing)
    expect(res.errors.some(e => e.type === ERRORS.DUPLICATE_ACCOUNT)).toBe(true)
  })

  it('errors on declared count mismatch', () => {
    const rows = [ { A: '01', E: '2', row: 1 }, { A: '123456789', B: '張三', row: 2 } ]
    const res = parsePreview(rows)
    expect(res.errors.some(e => e.type === ERRORS.COUNT_MISMATCH)).toBe(true)
  })
})
