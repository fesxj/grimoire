import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SetupView from './SetupView'

describe('SetupView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the First-Time Setup heading', () => {
    render(<SetupView onSetup={vi.fn()} />)
    expect(screen.getByText('First-Time Setup')).toBeInTheDocument()
  })

  it('renders username, password, and confirm password fields', () => {
    render(<SetupView onSetup={vi.fn()} />)
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
  })

  it('shows an error when passwords do not match', async () => {
    render(<SetupView onSetup={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Username'), 'admin')
    await userEvent.type(screen.getByLabelText('Password'), 'password1')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'password2')
    fireEvent.click(screen.getByRole('button', { name: /create admin account/i }))
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('does not call fetch when passwords mismatch', async () => {
    global.fetch = vi.fn()
    render(<SetupView onSetup={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Password'), 'aaa')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'bbb')
    fireEvent.click(screen.getByRole('button', { name: /create admin account/i }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows an error when password is shorter than 8 characters', async () => {
    render(<SetupView onSetup={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Username'), 'admin')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'short')
    fireEvent.click(screen.getByRole('button', { name: /create admin account/i }))
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
  })

  it('calls onSetup with token and user on successful account creation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'tok', user: { username: 'admin', role: 'admin' } }),
    })
    const onSetup = vi.fn()

    render(<SetupView onSetup={onSetup} />)
    await userEvent.type(screen.getByLabelText('Username'), 'admin')
    await userEvent.type(screen.getByLabelText('Password'), 'securepassword')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'securepassword')
    fireEvent.click(screen.getByRole('button', { name: /create admin account/i }))

    await waitFor(() =>
      expect(onSetup).toHaveBeenCalledWith('tok', { username: 'admin', role: 'admin' })
    )
  })

  it('sends trimmed username to the API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 't', user: {} }),
    })

    render(<SetupView onSetup={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Username'), '  admin  ')
    await userEvent.type(screen.getByLabelText('Password'), 'securepassword')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'securepassword')
    fireEvent.click(screen.getByRole('button', { name: /create admin account/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.username).toBe('admin')
  })

  it('shows the server error detail when setup fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Already initialized' }),
    })

    render(<SetupView onSetup={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Username'), 'admin')
    await userEvent.type(screen.getByLabelText('Password'), 'securepassword')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'securepassword')
    fireEvent.click(screen.getByRole('button', { name: /create admin account/i }))

    expect(await screen.findByText('Already initialized')).toBeInTheDocument()
  })

  it('shows a generic error when the server is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<SetupView onSetup={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Username'), 'admin')
    await userEvent.type(screen.getByLabelText('Password'), 'securepassword')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'securepassword')
    fireEvent.click(screen.getByRole('button', { name: /create admin account/i }))

    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument()
  })
})
