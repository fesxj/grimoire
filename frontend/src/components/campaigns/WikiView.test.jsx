import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WikiView from './WikiView'

vi.mock('../../api', () => ({
  campaigns: {
    listWikiPages: vi.fn(),
    getWikiPage: vi.fn(),
    updateWikiPage: vi.fn(),
  },
}))

import { campaigns } from '../../api'

const campaign = { id: 'c1', name: 'Test', members: [] }

const page = {
  id: 'p1',
  title: 'Dragons',
  slug: 'dragons',
  visibility: 'gm',
  parent_id: null,
  icon: null,
  can_edit: true,
  body: 'Here be dragons',
  backlinks: [],
}

function renderView(props = {}) {
  return render(
    <MemoryRouter>
      <WikiView campaign={campaign} isOwner {...props} />
    </MemoryRouter>
  )
}

describe('WikiView quick icon picker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    campaigns.listWikiPages.mockResolvedValue([page])
    campaigns.getWikiPage.mockResolvedValue(page)
    campaigns.updateWikiPage.mockResolvedValue(page)
  })

  it('opens the icon picker from a sidebar row without re-selecting the page', async () => {
    renderView()
    // Wait for the first page to auto-load, then forget that initial fetch.
    await screen.findByText('Here be dragons')
    campaigns.getWikiPage.mockClear()

    // The sidebar icon trigger carries the wiki icon aria-label.
    const triggers = await screen.findAllByRole('button', { name: 'Icon' })
    fireEvent.click(triggers[0])

    // The picker popover exposes a "No icon" option and the curated grid.
    expect(await screen.findByRole('button', { name: 'No icon' })).toBeTruthy()
    // Clicking the icon must not have triggered a page-select (which fetches it).
    expect(campaigns.getWikiPage).not.toHaveBeenCalled()
  })

  it('saves the chosen icon via updateWikiPage', async () => {
    renderView()
    const triggers = await screen.findAllByRole('button', { name: 'Icon' })
    fireEvent.click(triggers[0])

    const sword = await screen.findByRole('button', { name: 'swords' })
    fireEvent.click(sword)

    await waitFor(() =>
      expect(campaigns.updateWikiPage).toHaveBeenCalledWith('c1', 'p1', { icon: 'swords' })
    )
  })

  it('shows a static icon (no picker) for rows the user cannot edit', async () => {
    campaigns.listWikiPages.mockResolvedValue([{ ...page, can_edit: false }])
    campaigns.getWikiPage.mockResolvedValue({ ...page, can_edit: false })
    renderView({ isOwner: false })
    await screen.findByText('Dragons')
    expect(screen.queryByRole('button', { name: 'Icon' })).toBeNull()
  })
})

describe('WikiView nested tree', () => {
  const parent = { ...page, id: 'parent', title: 'Bestiary', slug: 'bestiary' }
  const child = {
    ...page,
    id: 'child',
    title: 'Goblins',
    slug: 'goblins',
    parent_id: 'parent',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    campaigns.listWikiPages.mockResolvedValue([parent, child])
    campaigns.getWikiPage.mockResolvedValue(parent)
    campaigns.updateWikiPage.mockResolvedValue(parent)
  })

  it('renders children under their parent and collapses/expands them', async () => {
    renderView()
    await screen.findByText('Bestiary')
    // Child is visible by default (expanded).
    expect(screen.getByText('Goblins')).toBeTruthy()

    // Collapsing the parent hides its child.
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(screen.queryByText('Goblins')).toBeNull()

    // Expanding brings it back.
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(screen.getByText('Goblins')).toBeTruthy()
  })

  it('creates a subpage under a parent via the row + button', async () => {
    renderView()
    await screen.findByText('Bestiary')
    // Each owner row has an "Add subpage" button; click the parent's.
    fireEvent.click(screen.getAllByRole('button', { name: 'Add subpage' })[0])
    // The editor's parent select defaults to the chosen parent.
    const select = await screen.findByLabelText('Parent page')
    expect(select.value).toBe('parent')
  })
})
