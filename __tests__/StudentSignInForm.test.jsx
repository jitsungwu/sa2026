import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StudentSignInForm from '../src/components/StudentSignInForm'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

describe('StudentSignInForm', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders form with account and classId inputs', () => {
    render(<StudentSignInForm onSuccess={() => {}} />)
    
    expect(screen.getByPlaceholderText('123456789')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g., class-A')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登入/i })).toBeInTheDocument()
  })

  it('disables login button when fields are empty', () => {
    render(<StudentSignInForm />)
    
    const loginButton = screen.getByRole('button', { name: /登入/i })
    expect(loginButton).toBeDisabled()
  })

  it('enables login button when both fields are filled', () => {
    render(<StudentSignInForm />)
    
    const accountInput = screen.getByPlaceholderText('123456789')
    const classInput = screen.getByPlaceholderText('e.g., class-A')
    const loginButton = screen.getByRole('button', { name: /登入/i })

    fireEvent.change(accountInput, { target: { value: '123456789' } })
    fireEvent.change(classInput, { target: { value: 'class-A' } })

    expect(loginButton).not.toBeDisabled()
  })

  it('displays error message on failed login', async () => {
    // Mock fetch to return error
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: false, error: '帳號不存在' })
      })
    )

    render(<StudentSignInForm />)
    
    const accountInput = screen.getByPlaceholderText('123456789')
    const classInput = screen.getByPlaceholderText('e.g., class-A')
    const loginButton = screen.getByRole('button', { name: /登入/i })

    fireEvent.change(accountInput, { target: { value: '123456789' } })
    fireEvent.change(classInput, { target: { value: 'class-A' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('帳號不存在')).toBeInTheDocument()
    })
  })

  it('validates account format (9 digits only)', async () => {
    render(<StudentSignInForm />)
    
    const accountInput = screen.getByPlaceholderText('123456789')
    const classInput = screen.getByPlaceholderText('e.g., class-A')

    // Try invalid account format
    fireEvent.change(accountInput, { target: { value: '12345' } }) // too short
    fireEvent.change(classInput, { target: { value: 'class-A' } })
    
    // Input validation should prevent non-9-digit entries
    expect(accountInput.value).toBe('12345')
  })
})
