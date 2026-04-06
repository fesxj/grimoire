import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'

function renderSidebar(user, uiSettings = {}) {
  return render(
    <MemoryRouter>
      <Sidebar user={user} onLogout={vi.fn()} uiSettings={uiSettings} />
    </MemoryRouter>
  )
}

describe('Sidebar user display', () => {
  it('shows display_name when set', () => {
    renderSidebar({ username: 'jdoe', display_name: 'Jane Doe', role: 'player' })
    expect(screen.getByText('Jane Doe')).toBeTruthy()
    expect(screen.queryByText('jdoe')).toBeNull()
  })

  it('falls back to username when display_name is not set', () => {
    renderSidebar({ username: 'jdoe', display_name: null, role: 'player' })
    expect(screen.getByText('jdoe')).toBeTruthy()
  })

  it('falls back to username when display_name is empty string', () => {
    renderSidebar({ username: 'jdoe', display_name: '', role: 'player' })
    expect(screen.getByText('jdoe')).toBeTruthy()
  })

  it('shows user role', () => {
    renderSidebar({ username: 'jdoe', display_name: null, role: 'admin' })
    expect(screen.getByText('admin')).toBeTruthy()
  })

  it('renders nothing in the user section when user is null', () => {
    render(
      <MemoryRouter>
        <Sidebar user={null} onLogout={vi.fn()} />
      </MemoryRouter>
    )
    // logout button only renders when user is present
    expect(screen.queryByLabelText('Log out')).toBeNull()
  })
})

describe('Sidebar navigation visibility', () => {
  it('shows campaigns link by default', () => {
    renderSidebar({ username: 'u', role: 'player' })
    expect(screen.getByText('Campaigns')).toBeTruthy()
  })

  it('hides campaigns link when hide_campaigns is true', () => {
    renderSidebar({ username: 'u', role: 'player' }, { hide_campaigns: true })
    expect(screen.queryByText('Campaigns')).toBeNull()
  })

  it('hides maps link when hide_maps is true', () => {
    renderSidebar({ username: 'u', role: 'player' }, { hide_maps: true })
    expect(screen.queryByText('Maps')).toBeNull()
  })
})
