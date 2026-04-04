export const ERRORS = {
  DUPLICATE_GROUP: 'DUPLICATE_GROUP',
  INVALID_ACCOUNT: 'INVALID_ACCOUNT',
  COUNT_MISMATCH: 'COUNT_MISMATCH',
  DUPLICATE_ACCOUNT: 'DUPLICATE_ACCOUNT',
  MISSING_GROUP_HEADER: 'MISSING_GROUP_HEADER'
}

function isGroupHeader(colA, colE) {
  if (colA == null) return false
  const a = String(colA).trim()
  return a.length <= 2 && colE != null && String(colE).trim() !== ''
}

function isStudentRow(colA) {
  if (colA == null) return false
  return /^\d{9}$/.test(String(colA).trim())
}

// rows: array of {A,B,D,E,row} objects (row optional)
// existingAccounts: Set of strings (accounts) to check duplicates in class
export function parsePreview(rows, existingAccounts = new Set()) {
  const groups = []
  const groupIndex = new Map()
  const errors = []
  const warnings = []

  let currentGroup = null

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = r.row ?? i + 1
    const colA = r.A
    const colB = r.B
    const colD = r.D
    const colE = r.E

    if (isGroupHeader(colA, colE)) {
      const groupId = String(colA).trim()
      if (groupIndex.has(groupId)) {
        errors.push({ type: ERRORS.DUPLICATE_GROUP, message: `groupId '${groupId}' 出現多次`, row: rowNum })
        // stop parsing further for preview reliability
        return { groups, errors, warnings }
      }
      const declared = parseInt(String(colE).trim(), 10)
      const g = { groupId, declaredCount: declared, students: [], parsedCount: 0 }
      groups.push(g)
      groupIndex.set(groupId, g)
      currentGroup = g
      continue
    }

    // if ColA looks like a candidate account (length > 2) but not a valid 9-digit student, treat as invalid
    const aTrim = colA == null ? '' : String(colA).trim()
    if (aTrim && aTrim.length > 2 && !isStudentRow(aTrim)) {
      errors.push({ type: ERRORS.INVALID_ACCOUNT, message: `學號 ${aTrim} 非 9 位數`, row: rowNum })
      return { groups, errors, warnings }
    }

    if (isStudentRow(colA)) {
      if (!currentGroup) {
        errors.push({ type: ERRORS.MISSING_GROUP_HEADER, message: '在 student row 前未出現 group header', row: rowNum })
        return { groups, errors, warnings }
      }
      const account = String(colA).trim()
      if (!/^\d{9}$/.test(account)) {
        errors.push({ type: ERRORS.INVALID_ACCOUNT, message: `學號 ${account} 非 9 位數`, row: rowNum })
        return { groups, errors, warnings }
      }
      if (existingAccounts.has(account)) {
        errors.push({ type: ERRORS.DUPLICATE_ACCOUNT, message: `學號 ${account} 已存在`, row: rowNum })
        return { groups, errors, warnings }
      }
      const student = { account, name: r.B ?? '', major: r.D ?? '', row: rowNum }
      currentGroup.students.push(student)
      currentGroup.parsedCount = currentGroup.students.length
      continue
    }

    // other rows: ignore but note warning
    if ((String(colA || '').trim() || String(colB || '').trim() || String(colD || '').trim() || String(colE || '').trim())) {
      warnings.push({ type: 'IGNORED_ROW', row: rowNum })
    }
  }

  // post-parse validations: count match
  for (const g of groups) {
    if (g.parsedCount !== g.declaredCount) {
      errors.push({ type: ERRORS.COUNT_MISMATCH, message: `group ${g.groupId} declared ${g.declaredCount} but parsed ${g.parsedCount}`, group: g.groupId, declared: g.declaredCount, parsed: g.parsedCount })
    }
  }

  return { groups, errors, warnings }
}

export default { parsePreview, ERRORS }
