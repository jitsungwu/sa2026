import fs from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const filePath = path.resolve(process.cwd(), 'e2e', 'test-accounts.json')
    const fileContents = await fs.readFile(filePath, 'utf8')
    const json = JSON.parse(fileContents)
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: 'Cannot read test accounts file.' }, { status: 500 })
  }
}
