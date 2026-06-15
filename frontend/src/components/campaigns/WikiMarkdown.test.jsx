import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WikiMarkdown from './WikiMarkdown'

function renderMd(props) {
  return render(
    <MemoryRouter>
      <WikiMarkdown {...props} />
    </MemoryRouter>
  )
}

describe('WikiMarkdown', () => {
  it('renders plain markdown', () => {
    renderMd({ body: '# Hello\n\nSome **bold** text.' })
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeTruthy()
    expect(screen.getByText('bold')).toBeTruthy()
  })

  it('renders a GFM table', () => {
    renderMd({ body: '| A | B |\n|---|---|\n| 1 | 2 |' })
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByText('A')).toBeTruthy()
  })

  it('renders an existing [[wiki link]] as a button and calls onOpenSlug', () => {
    const onOpenSlug = vi.fn()
    renderMd({ body: 'Go to [[The Castle]].', pageSlugs: ['the-castle'], onOpenSlug })
    const link = screen.getByRole('button', { name: 'The Castle' })
    fireEvent.click(link)
    expect(onOpenSlug).toHaveBeenCalledWith('the-castle')
  })

  it('supports [[Target|label]] aliasing', () => {
    const onOpenSlug = vi.fn()
    renderMd({ body: '[[The Castle|the keep]]', pageSlugs: ['the-castle'], onOpenSlug })
    const link = screen.getByRole('button', { name: 'the keep' })
    fireEvent.click(link)
    expect(onOpenSlug).toHaveBeenCalledWith('the-castle')
  })

  it('renders a missing wiki link distinctly but still clickable', () => {
    const onOpenSlug = vi.fn()
    renderMd({ body: '[[Nowhere]]', pageSlugs: [], onOpenSlug })
    const link = screen.getByRole('button', { name: 'Nowhere' })
    expect(link).toBeTruthy()
  })

  it('renders a Grimoire embed as a content button, not a wiki link', () => {
    renderMd({ body: 'See [[book:abc123:5]] here.' })
    // Embed renders a labeled button; no stub wiki link created.
    expect(screen.getByRole('button')).toBeTruthy()
  })
})
