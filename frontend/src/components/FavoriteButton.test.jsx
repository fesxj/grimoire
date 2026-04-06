import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FavoriteButton from './FavoriteButton'
import * as FavCtx from '../context/FavoritesContext'

vi.mock('../context/FavoritesContext', () => ({
  useFavorites: vi.fn(),
}))

describe('FavoriteButton', () => {
  const toggleFavorite = vi.fn()

  function setup(isFav, props = {}) {
    FavCtx.useFavorites.mockReturnValue({ isFavorite: () => isFav, toggleFavorite })
    return render(<FavoriteButton type="book" id="b1" {...props} />)
  }

  beforeEach(() => {
    vi.resetAllMocks()
    toggleFavorite.mockReset()
  })

  it('renders a button element', () => {
    setup(false)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows "Add to favorites" label when not favorited', () => {
    setup(false)
    expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument()
  })

  it('shows "Remove from favorites" label when already favorited', () => {
    setup(true)
    expect(screen.getByRole('button', { name: 'Remove from favorites' })).toBeInTheDocument()
  })

  it('calls toggleFavorite with type and id when clicked', () => {
    setup(false)
    fireEvent.click(screen.getByRole('button'))
    expect(toggleFavorite).toHaveBeenCalledWith('book', 'b1')
  })

  it('is fully visible when cardHovered is not provided', () => {
    setup(false)
    expect(screen.getByRole('button')).toHaveStyle({ opacity: '1' })
  })

  it('is visible when cardHovered is true', () => {
    setup(false, { cardHovered: true })
    expect(screen.getByRole('button')).toHaveStyle({ opacity: '1' })
  })

  it('is invisible when card is not hovered and item is not favorited', () => {
    setup(false, { cardHovered: false })
    expect(screen.getByRole('button')).toHaveStyle({ opacity: '0' })
  })

  it('remains visible when favorited even if card is not hovered', () => {
    setup(true, { cardHovered: false })
    expect(screen.getByRole('button')).toHaveStyle({ opacity: '1' })
  })
})
