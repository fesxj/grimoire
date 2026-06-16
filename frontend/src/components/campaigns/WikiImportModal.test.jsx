import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WikiImportModal from './WikiImportModal'

vi.mock('../../api', () => ({
  campaigns: {
    importWiki: vi.fn(),
  },
}))

import { campaigns } from '../../api'

function renderModal(props = {}) {
  return render(
    <WikiImportModal campaignId="c1" onClose={vi.fn()} onImported={vi.fn()} {...props} />
  )
}

describe('WikiImportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the import dialog with format guidance', () => {
    renderModal()
    expect(screen.getByText('Import wiki pages')).toBeTruthy()
    expect(screen.getByText(/Accepts .zip/)).toBeTruthy()
  })

  it('accepts LegendKeeper .lk files in the picker', () => {
    const { container } = renderModal()
    const input = container.querySelector('input[type="file"]')
    expect(input.getAttribute('accept')).toContain('.lk')
  })

  it('imports a chosen file and shows the result count', async () => {
    campaigns.importWiki.mockResolvedValue({ imported: 3, format: 'markdown', pages: [] })
    const onImported = vi.fn()
    const { container } = renderModal({ onImported })

    const file = new File(['# Hi'], 'notes.md', { type: 'text/markdown' })
    const input = container.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(campaigns.importWiki).toHaveBeenCalledWith('c1', file))
    await waitFor(() => expect(screen.getByText('Imported 3 pages')).toBeTruthy())
    expect(onImported).toHaveBeenCalled()
  })

  it('shows an error when the import fails', async () => {
    campaigns.importWiki.mockRejectedValue(new Error('Unrecognised JSON format'))
    const { container } = renderModal()

    const file = new File(['{}'], 'bad.json', { type: 'application/json' })
    const input = container.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(screen.getByText('Unrecognised JSON format')).toBeTruthy())
  })
})
