import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock firebase client and firestore helpers used by the component
vi.mock('../src/firebaseClient', () => ({
  db: {},
}))

const fakeDocs = [
  { id: 'd1', name: '王小明', studentId: 'STU0001', class: 'A班', grade: 90, email: 's1@school', joinDate: new Date().toISOString() },
  { id: 'd2', name: '李美麗', studentId: 'STU0002', class: 'B班', grade: 88, email: 's2@school', joinDate: new Date().toISOString() },
  { id: 'd3', name: '張三豐', studentId: 'STU0003', class: 'C班', grade: 76, email: 's3@school', joinDate: new Date().toISOString() },
]

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(() => Promise.resolve({ docs: fakeDocs.map(d => ({ id: d.id, data: () => d })) })),
}))

import TestCollectionPage from '../src/app/test-list'

describe('TestCollectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders student rows from Firestore', async () => {
    render(<TestCollectionPage />)

    // wait for a known student name to appear
    const first = await screen.findByText('王小明')
    expect(first).toBeDefined()

    // all fake docs should be rendered
    for (const d of fakeDocs) {
      expect(await screen.findByText(d.studentId)).toBeDefined()
      expect(await screen.findByText(d.class)).toBeDefined()
    }

    // table should contain as many rows as docs
    const rows = await screen.findAllByRole('row')
    // header row + 3 data rows = 4
    expect(rows.length).toBeGreaterThanOrEqual(4)
  })
})