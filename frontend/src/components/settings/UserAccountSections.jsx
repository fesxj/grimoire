import { useState } from 'react'
import { LuCircleCheck } from 'react-icons/lu'
import api from '../../api'
import Spinner from '../Spinner'
import { useAuth } from '../../context/AuthContext'

export function DisplayNameSection() {
  const { user, refreshUser } = useAuth()
  const [value, setValue] = useState(user?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await api.patch('/users/me/preferences', { display_name: value.trim() })
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err?.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        Display Name
        {saved && <LuCircleCheck size={16} style={{ color: 'var(--green)' }} />}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
        Shown to other users in place of your username. Leave blank to use your username.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 400 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginBottom: 5 }}>Display name</label>
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={user?.username}
            maxLength={100}
            style={{ width: '100%', fontSize: 14, padding: '8px 12px', boxSizing: 'border-box' }}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 500,
            background: 'var(--gold-dim)', border: 'none',
            color: 'var(--bg-deep)', cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {saving && <Spinner size={13} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      {error && <div style={{ fontSize: 13, color: '#e07070', marginTop: 8 }}>{error}</div>}
    </div>
  )
}

export function ExplicitContentSection() {
  const { user, refreshUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const allowed = user?.allow_explicit ?? true

  const toggle = async () => {
    setSaving(true)
    try {
      await api.patch('/users/me/preferences', { allow_explicit: !allowed })
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        Content Preferences
        {saved && <LuCircleCheck size={16} style={{ color: 'var(--green)' }} />}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
        Control whether explicit content is shown to you.
      </p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', width: 'fit-content' }}>
        <input
          type="checkbox"
          checked={allowed}
          onChange={toggle}
          disabled={saving}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--gold)' }}
        />
        <span style={{ fontSize: 14, color: 'var(--text)' }}>Show explicit content</span>
        {saving && <Spinner size={13} />}
      </label>
    </div>
  )
}

export function ChangePasswordSection() {
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (next !== confirm) { setError('New passwords do not match.'); return }
    if (next.length < 8)  { setError('New password must be at least 8 characters.'); return }
    setSaving(true)
    try {
      await api.patch('/users/me/password', { current_password: current, new_password: next })
      setSaved(true)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err?.message || 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Change Password</h3>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
        Update your account password. You will stay logged in after changing it.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
        {[
          { label: 'Current password', value: current, onChange: setCurrent, complete: 'current-password' },
          { label: 'New password',     value: next,    onChange: setNext,    complete: 'new-password' },
          { label: 'Confirm new password', value: confirm, onChange: setConfirm, complete: 'new-password' },
        ].map(({ label, value, onChange, complete }) => (
          <div key={label}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginBottom: 5 }}>{label}</label>
            <input
              type="password"
              value={value}
              onChange={e => onChange(e.target.value)}
              required
              autoComplete={complete}
              style={{ width: '100%', fontSize: 14, padding: '8px 12px', boxSizing: 'border-box' }}
            />
          </div>
        ))}

        {error && <div style={{ fontSize: 13, color: '#e07070' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 500,
              background: 'var(--gold-dim)', border: 'none',
              color: 'var(--bg-deep)', cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving && <Spinner size={13} />}
            {saving ? 'Saving…' : 'Update Password'}
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <LuCircleCheck size={14} /> Password updated
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

export function DeleteAccountSection({ user, onLogout }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [error,      setError]      = useState(null)
  const isAdmin = user?.role === 'admin'

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await api.delete('/users/me')
      onLogout()
    } catch (err) {
      setError(err?.message || 'Failed to delete account.')
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: '#e07070' }}>Delete Account</h3>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
        Permanently deletes your account and all associated bookmarks and favorites. This cannot be undone.
        {isAdmin && <><br /><span style={{ color: '#e07070' }}>Admin accounts cannot be self-deleted.</span></>}
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={isAdmin}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 500,
            background: isAdmin ? 'var(--bg-card)' : 'rgba(180,60,60,0.15)',
            border: `1px solid ${isAdmin ? 'var(--border)' : 'rgba(180,60,60,0.5)'}`,
            color: isAdmin ? 'var(--text-muted)' : '#e07070',
            cursor: isAdmin ? 'not-allowed' : 'pointer',
            opacity: isAdmin ? 0.5 : 1,
          }}
        >
          Delete My Account
        </button>
      ) : (
        <div style={{
          padding: '16px 20px', borderRadius: 8,
          background: 'rgba(180,60,60,0.08)', border: '1px solid rgba(180,60,60,0.4)',
          maxWidth: 420,
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
            Are you sure? This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '7px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500,
                background: 'rgba(180,60,60,0.8)', border: 'none',
                color: '#fff', cursor: deleting ? 'default' : 'pointer',
                opacity: deleting ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {deleting && <Spinner size={13} />}
              {deleting ? 'Deleting…' : 'Yes, delete my account'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              style={{
                padding: '7px 16px', borderRadius: 6, fontSize: 14,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
          {error && <div style={{ fontSize: 13, color: '#e07070', marginTop: 10 }}>{error}</div>}
        </div>
      )}
    </div>
  )
}
