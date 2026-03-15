import React from 'react'
import { render, screen } from '@testing-library/react'
import HomePage from '../src/app/page'

test('renders heading', () => {
  render(<HomePage />)
  expect(screen.getByText(/Next.js \(App Router\) \+ Firebase/i)).toBeInTheDocument()
})