import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReaderToolbar from './ReaderToolbar'

vi.mock('../campaigns/AddToCampaignButton', () => ({ default: () => null }))

const BOOK_PDF = {
  id: 'book-1',
  title: 'Test Book',
  page_count: 100,
  mime_type: 'application/pdf',
  indexed: true,
}

function defaultProps(overrides = {}) {
  return {
    book: BOOK_PDF,
    bookId: 'book-1',
    mode: 'page',
    onModeChange: vi.fn(),
    spreadOffset: 0,
    onSpreadOffsetChange: vi.fn(),
    currentPage: 1,
    totalPages: 100,
    step: 1,
    hasRight: false,
    rightPage: 2,
    pageInput: '1',
    onPageInputChange: vi.fn(),
    onPageInputCommit: vi.fn(),
    panel: null,
    onTogglePanel: vi.fn(),
    isMobilePhone: false,
    showShortcuts: false,
    onToggleShortcuts: vi.fn(),
    onBack: vi.fn(),
    isFavorite: false,
    onToggleFavorite: vi.fn(),
    onBookmarkPage: vi.fn(),
    ...overrides,
  }
}

function renderToolbar(overrides = {}) {
  return render(
    <MemoryRouter>
      <ReaderToolbar {...defaultProps(overrides)} />
    </MemoryRouter>
  )
}

describe('ReaderToolbar — navigation', () => {
  it('renders the book title', () => {
    renderToolbar()
    expect(screen.getByText('Test Book')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn()
    renderToolbar({ onBack })
    await userEvent.click(screen.getByLabelText('Back'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('calls onPageInputCommit with next page when next-page button is clicked', async () => {
    const onPageInputCommit = vi.fn()
    renderToolbar({ onPageInputCommit, currentPage: 4, step: 1 })
    await userEvent.click(screen.getByLabelText('Next page'))
    expect(onPageInputCommit).toHaveBeenCalledWith(5)
  })

  it('calls onPageInputCommit with previous page when prev-page button is clicked', async () => {
    const onPageInputCommit = vi.fn()
    renderToolbar({ onPageInputCommit, currentPage: 4, step: 1 })
    await userEvent.click(screen.getByLabelText('Previous page'))
    expect(onPageInputCommit).toHaveBeenCalledWith(3)
  })

  it('previous-page button is disabled on page 1', () => {
    renderToolbar({ currentPage: 1 })
    expect(screen.getByLabelText('Previous page')).toBeDisabled()
  })

  it('next-page button is disabled on last page', () => {
    renderToolbar({ currentPage: 100, totalPages: 100 })
    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })
})

describe('ReaderToolbar — mode toggle', () => {
  it('highlights the active mode button', () => {
    renderToolbar({ mode: 'spread' })
    const spreadBtn = screen.getByTitle('Spread')
    expect(spreadBtn).toHaveStyle({ color: 'var(--gold)' })
  })

  it('calls onModeChange when a mode button is clicked', async () => {
    const onModeChange = vi.fn()
    renderToolbar({ onModeChange })
    await userEvent.click(screen.getByTitle('Spread'))
    expect(onModeChange).toHaveBeenCalledWith('spread')
  })

  it('hides mode toggle on mobile', () => {
    renderToolbar({ isMobilePhone: true })
    // Buttons are rendered but inside a display:none container — check via parent style.
    const pageBtn = screen.getByTitle('Page')
    expect(pageBtn.closest('div')).toHaveStyle({ display: 'none' })
  })
})

describe('ReaderToolbar — spread offset', () => {
  it('does not show Cover button in page mode', () => {
    renderToolbar({ mode: 'page' })
    expect(screen.queryByText('Cover')).not.toBeInTheDocument()
  })

  it('shows Cover button in spread mode', () => {
    renderToolbar({ mode: 'spread' })
    expect(screen.getByText('Cover')).toBeInTheDocument()
  })

  it('hides Cover button on mobile even in spread mode', () => {
    renderToolbar({ mode: 'spread', isMobilePhone: true })
    expect(screen.queryByText('Cover')).not.toBeInTheDocument()
  })

  it('calls onSpreadOffsetChange(1) when Cover is clicked and offset is 0', async () => {
    const onSpreadOffsetChange = vi.fn()
    renderToolbar({ mode: 'spread', spreadOffset: 0, onSpreadOffsetChange })
    await userEvent.click(screen.getByText('Cover'))
    expect(onSpreadOffsetChange).toHaveBeenCalledWith(1)
  })

  it('calls onSpreadOffsetChange(0) when Cover is clicked and offset is 1', async () => {
    const onSpreadOffsetChange = vi.fn()
    renderToolbar({ mode: 'spread', spreadOffset: 1, onSpreadOffsetChange })
    await userEvent.click(screen.getByText('Cover'))
    expect(onSpreadOffsetChange).toHaveBeenCalledWith(0)
  })

  it('shows include-cover tooltip when offset is 0', () => {
    renderToolbar({ mode: 'spread', spreadOffset: 0 })
    expect(
      screen.getByTitle(/Include cover in spread/)
    ).toBeInTheDocument()
  })

  it('shows exclude-cover tooltip when offset is 1', () => {
    renderToolbar({ mode: 'spread', spreadOffset: 1 })
    expect(
      screen.getByTitle(/Exclude cover from spread/)
    ).toBeInTheDocument()
  })

  it('shows right page number when hasRight is true in spread mode', () => {
    renderToolbar({ mode: 'spread', hasRight: true, currentPage: 2, rightPage: 3 })
    expect(screen.getByText('– 3')).toBeInTheDocument()
  })
})

describe('ReaderToolbar — panel selector', () => {
  it('shows Contents, Bookmarks, and Search for an indexed PDF', () => {
    renderToolbar()
    expect(screen.getByTitle('Contents')).toBeInTheDocument()
    expect(screen.getByTitle('Bookmarks')).toBeInTheDocument()
    expect(screen.getByTitle('Search')).toBeInTheDocument()
  })

  it('hides Contents in PDF mode', () => {
    renderToolbar({ mode: 'pdf' })
    expect(screen.queryByTitle('Contents')).not.toBeInTheDocument()
  })

  it('calls onTogglePanel when a panel button is clicked', async () => {
    const onTogglePanel = vi.fn()
    renderToolbar({ onTogglePanel })
    await userEvent.click(screen.getByTitle('Contents'))
    expect(onTogglePanel).toHaveBeenCalledWith('toc')
  })

  it('highlights the active panel button', () => {
    renderToolbar({ panel: 'toc' })
    expect(screen.getByTitle('Contents')).toHaveStyle({ color: 'var(--gold)' })
  })
})

describe('ReaderToolbar — actions', () => {
  it('calls onToggleFavorite when favorite button is clicked', async () => {
    const onToggleFavorite = vi.fn()
    renderToolbar({ onToggleFavorite })
    await userEvent.click(screen.getByTitle('Add to favorites'))
    expect(onToggleFavorite).toHaveBeenCalledOnce()
  })

  it('shows remove-favorites title when already favorited', () => {
    renderToolbar({ isFavorite: true })
    expect(screen.getByTitle('Remove from favorites')).toBeInTheDocument()
  })

  it('calls onBookmarkPage when bookmark button is clicked', async () => {
    const onBookmarkPage = vi.fn()
    renderToolbar({ onBookmarkPage })
    await userEvent.click(screen.getByTitle('Bookmark this page'))
    expect(onBookmarkPage).toHaveBeenCalledOnce()
  })

  it('hides bookmark button in PDF mode', () => {
    renderToolbar({ mode: 'pdf' })
    expect(screen.queryByTitle('Bookmark this page')).not.toBeInTheDocument()
  })

  it('calls onToggleShortcuts when keyboard button is clicked', async () => {
    const onToggleShortcuts = vi.fn()
    renderToolbar({ onToggleShortcuts })
    await userEvent.click(screen.getByTitle('Keyboard shortcuts (?)'))
    expect(onToggleShortcuts).toHaveBeenCalledOnce()
  })

  it('shows the shortcuts modal when showShortcuts is true', () => {
    renderToolbar({ showShortcuts: true })
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('calls onToggleShortcuts when the shortcuts backdrop is clicked', async () => {
    const onToggleShortcuts = vi.fn()
    renderToolbar({ showShortcuts: true, onToggleShortcuts })
    // The backdrop div contains the modal — click outside the inner card.
    const backdrop = screen.getByText('Keyboard Shortcuts').closest('[style*="inset"]')
    await userEvent.click(backdrop)
    expect(onToggleShortcuts).toHaveBeenCalledOnce()
  })
})
