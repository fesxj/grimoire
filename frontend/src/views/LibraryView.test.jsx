import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LibraryView from './LibraryView'
import api from '../api'

vi.mock('../api', () => ({
  default: { get: vi.fn() },
  mediaUrl: (path) => `http://localhost${path}`,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => vi.fn() }
})

let mockUserPrefs = { cardSize: 'comfortable', librarySort: 'az' }
vi.mock('../hooks/useUserPrefs', () => ({
  getUserPrefs: () => mockUserPrefs,
  saveUserPref: (key, value) => {
    mockUserPrefs = { ...mockUserPrefs, [key]: value }
  },
}))

let mockRecentBooks = []
const mockRemoveRecentBook = vi.fn()
vi.mock('../hooks/useBookPrefs', () => ({
  getRecentBooks: () => mockRecentBooks,
  getBookPrefs: () => ({}),
  removeRecentBook: (id) => mockRemoveRecentBook(id),
}))

// Favorites context — default: nothing is a favorite
const mockIsFavorite = vi.fn(() => false)
vi.mock('../context/FavoritesContext', () => ({
  useFavorites: () => ({ isFavorite: mockIsFavorite, toggleFavorite: vi.fn() }),
}))

vi.mock('../components/FavoriteButton', () => ({
  default: ({ type, id }) => <button data-testid={`fav-${type}-${id}`}>fav</button>,
}))

function makeSystem(overrides = {}) {
  const id = overrides.id ?? `sys-${Math.random().toString(36).slice(2)}`
  return {
    id,
    name: overrides.name ?? 'Test System',
    slug: id,
    book_count: 3,
    is_system_agnostic: false,
    cover_book_id: null,
    description: '',
    publishers: [],
    tags: [],
    is_explicit: false,
    ...overrides,
  }
}

function renderView() {
  return render(
    <MemoryRouter>
      <LibraryView />
    </MemoryRouter>
  )
}

describe('LibraryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsFavorite.mockReturnValue(false)
    sessionStorage.clear()
    mockUserPrefs = { cardSize: 'comfortable', librarySort: 'az' }
    mockRecentBooks = []
  })

  it('renders system cards after loading', async () => {
    api.get.mockResolvedValue([makeSystem({ name: 'D&D 5e' })])
    renderView()
    await waitFor(() => expect(screen.getByText('D&D 5e')).toBeInTheDocument())
  })

  it('shows a spinner while loading', () => {
    api.get.mockReturnValue(new Promise(() => {}))
    renderView()
    expect(document.querySelector('svg')).toBeInTheDocument()
  })

  it('shows the favorites-only toggle button', async () => {
    api.get.mockResolvedValue([makeSystem()])
    renderView()
    await waitFor(() => expect(screen.getByText(/favorites only/i)).toBeInTheDocument())
  })

  it('favorites toggle hides non-favorite systems', async () => {
    api.get.mockResolvedValue([
      makeSystem({ id: 'sys-fav', name: 'Favorite System' }),
      makeSystem({ id: 'sys-other', name: 'Other System' }),
    ])
    mockIsFavorite.mockImplementation((type, id) => type === 'system' && id === 'sys-fav')

    renderView()
    await waitFor(() => expect(screen.getByText('Favorite System')).toBeInTheDocument())

    await userEvent.click(screen.getByText(/favorites only/i))

    expect(screen.getByText('Favorite System')).toBeInTheDocument()
    expect(screen.queryByText('Other System')).not.toBeInTheDocument()
  })

  it('toggling favorites off restores all systems', async () => {
    api.get.mockResolvedValue([
      makeSystem({ id: 'sys-fav', name: 'Favorite System' }),
      makeSystem({ id: 'sys-other', name: 'Other System' }),
    ])
    mockIsFavorite.mockImplementation((type, id) => type === 'system' && id === 'sys-fav')

    renderView()
    await waitFor(() => expect(screen.getByText('Other System')).toBeInTheDocument())

    const toggle = screen.getByText(/favorites only/i)
    await userEvent.click(toggle)
    expect(screen.queryByText('Other System')).not.toBeInTheDocument()

    await userEvent.click(toggle)
    expect(screen.getByText('Other System')).toBeInTheDocument()
  })

  it('view-mode toggle cycles card → compact → list → card', async () => {
    sessionStorage.clear()
    api.get.mockResolvedValue([makeSystem()])
    renderView()
    await waitFor(() => expect(screen.getByText('Test System')).toBeInTheDocument())

    // Starts on Cards (the persisted default from the mocked prefs). The toggle
    // is icon-only; the current mode is exposed via its accessible name.
    const toggle = screen.getByRole('button', { name: /change view/i })
    expect(toggle).toHaveAccessibleName(/cards/i)

    await userEvent.click(toggle)
    expect(toggle).toHaveAccessibleName(/compact/i)

    await userEvent.click(toggle)
    expect(toggle).toHaveAccessibleName(/list/i)
    // The system still renders in list mode.
    expect(screen.getByText('Test System')).toBeInTheDocument()

    await userEvent.click(toggle)
    expect(toggle).toHaveAccessibleName(/cards/i)
  })

  it('renders the favorite button on system cards in compact mode', async () => {
    sessionStorage.clear()
    api.get.mockResolvedValue([makeSystem({ id: 'sys-1', name: 'Test System' })])
    renderView()
    await waitFor(() => expect(screen.getByText('Test System')).toBeInTheDocument())

    // Switch to compact mode.
    await userEvent.click(screen.getByRole('button', { name: /change view/i }))

    expect(screen.getByTestId('fav-system-sys-1')).toBeInTheDocument()
  })

  it('view-mode override is stored in sessionStorage, not user prefs', async () => {
    sessionStorage.clear()
    api.get.mockResolvedValue([makeSystem()])
    renderView()
    await waitFor(() => expect(screen.getByText('Test System')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /change view/i }))

    expect(sessionStorage.getItem('grimoire:view-mode:system')).toBe('compact')
    // The persisted user-prefs store is never written by the toggle.
    expect(localStorage.getItem('grimoire:user-prefs')).toBeNull()
  })

  it('shows empty hint when favorites filter is on but nothing is favorited', async () => {
    api.get.mockResolvedValue([makeSystem({ name: 'Unfavorited System' })])
    mockIsFavorite.mockReturnValue(false)

    renderView()
    await waitFor(() => expect(screen.getByText('Unfavorited System')).toBeInTheDocument())

    await userEvent.click(screen.getByText(/favorites only/i))

    expect(screen.queryByText('Unfavorited System')).not.toBeInTheDocument()
    expect(screen.getByText(/no favorites here yet/i)).toBeInTheDocument()
  })

  describe('recently opened', () => {
    beforeEach(() => {
      mockRecentBooks = [{ id: 'b1', title: 'Recent Book', has_thumbnail: false, page_count: 10 }]
    })

    it('always shows the remove button for recent books', async () => {
      api.get.mockResolvedValue([makeSystem()])
      renderView()
      await waitFor(() => expect(screen.getByText('Recent Book')).toBeInTheDocument())

      const removeBtn = screen.getByRole('button', { name: /remove from recently opened/i })
      // Always visible — not gated behind hover (no opacity:0).
      expect(removeBtn).toBeInTheDocument()
      expect(removeBtn.style.opacity).not.toBe('0')

      await userEvent.click(removeBtn)
      expect(mockRemoveRecentBook).toHaveBeenCalledWith('b1')
    })

    it('collapses and expands the recently opened section', async () => {
      api.get.mockResolvedValue([makeSystem()])
      renderView()
      await waitFor(() => expect(screen.getByText('Recent Book')).toBeInTheDocument())

      const header = screen.getByRole('button', { name: /^recently opened$/i })
      expect(header).toHaveAttribute('aria-expanded', 'true')

      await userEvent.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'false')
      expect(mockUserPrefs.recentCollapsed).toBe(true)
    })

    it('starts collapsed when the pref is set', async () => {
      mockUserPrefs = { ...mockUserPrefs, recentCollapsed: true }
      api.get.mockResolvedValue([makeSystem()])
      renderView()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /^recently opened$/i })).toBeInTheDocument()
      )
      expect(screen.getByRole('button', { name: /^recently opened$/i })).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    })
  })
})
