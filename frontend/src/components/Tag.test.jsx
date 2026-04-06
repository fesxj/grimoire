import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Tag from './Tag'

describe('Tag', () => {
  it('renders the label text', () => {
    render(<Tag label="fantasy" />)
    expect(screen.getByText('Fantasy')).toBeInTheDocument()
  })

  it('capitalizes the first letter', () => {
    render(<Tag label="dungeon-crawl" />)
    expect(screen.getByText('Dungeon-crawl')).toBeInTheDocument()
  })

  it('handles single-character labels', () => {
    render(<Tag label="a" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders without throwing when label is undefined', () => {
    render(<Tag />)
  })

  it('renders without throwing when label is an empty string', () => {
    render(<Tag label="" />)
  })

  it('applies a custom background color when provided', () => {
    render(<Tag label="test" color="#ff0000" />)
    const el = screen.getByText('Test')
    expect(el.style.background).toBe('rgb(255, 0, 0)')
  })
})
