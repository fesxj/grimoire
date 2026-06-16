import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BulkEditModal from './BulkEditModal'

const patch = vi.fn(() => Promise.resolve({}))
vi.mock('../api', () => ({
  default: { patch: (...args) => patch(...args) },
}))

const items = [
  { id: 'm1', filename: 'alpha.png', tags: ['old'], description: 'first' },
  { id: 'm2', filename: 'beta.png', tags: [], description: '' },
]

function renderModal(props = {}) {
  return render(
    <BulkEditModal type="map" items={items} onClose={vi.fn()} onSaved={vi.fn()} {...props} />
  )
}

describe('BulkEditModal', () => {
  beforeEach(() => patch.mockClear())

  it('shows the first item and a position indicator', () => {
    renderModal()
    expect(screen.getByText('alpha.png')).toBeInTheDocument()
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
  })

  it('navigates through the carousel', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Next'))
    expect(screen.getByText('beta.png')).toBeInTheDocument()
    expect(screen.getByText('2 of 2')).toBeInTheDocument()
  })

  it('only PATCHes items whose fields changed', async () => {
    const onSaved = vi.fn()
    renderModal({ onSaved })

    // Edit the tags field of the first (currently shown) item.
    const tagsInput = screen.getByPlaceholderText('Comma-separated tags')
    fireEvent.change(tagsInput, { target: { value: 'old, new' } })

    fireEvent.click(screen.getByText('Save all'))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    // Only m1 changed → one PATCH.
    expect(patch).toHaveBeenCalledTimes(1)
    expect(patch).toHaveBeenCalledWith('/maps/m1', { tags: ['old', 'new'] })
    expect(onSaved).toHaveBeenCalledWith({ m1: { tags: ['old', 'new'] } })
  })
})
