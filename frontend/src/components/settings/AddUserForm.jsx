import { useState } from 'react'
import { LuCheck, LuX } from 'react-icons/lu'
import api from '../../api'

export default function AddUserForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'player' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const user = await api.post('/users', form)
      onAdd(user)
    } catch (err) {
      setError(err.message || 'Failed to create user.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" style={{
      background: 'var(--bg-input)', border: '1px solid var(--border-light)',
      borderRadius: 8, padding: 20, marginTop: 12,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
        <div>
          <label htmlFor="add-user-username" style={labelStyle}>Username</label>
          <input
            id="add-user-username"
            type="text" required autoFocus autoComplete="off"
            value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label htmlFor="add-user-password" style={labelStyle}>Password</label>
          <input
            id="add-user-password"
            type="password" required autoComplete="new-password"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label htmlFor="add-user-role" style={labelStyle}>Role</label>
          <select
            id="add-user-role"
            value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '8px 10px', fontSize: 15 }}
          >
            <option value="player">Player</option>
            <option value="gm">GM</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 10 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="submit" disabled={loading} style={{ ...primaryBtnStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuCheck size={13} />
          {loading ? 'Creating…' : 'Create User'}
        </button>
        <button type="button" onClick={onCancel} style={{ ...ghostBtnStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuX size={13} /> Cancel
        </button>
      </div>
    </form>
  )
}

const labelStyle = { display: 'block', fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }

const primaryBtnStyle = {
  padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
  background: 'var(--gold-dim)', color: 'var(--bg-deep)',
  border: '1px solid var(--gold-dim)', cursor: 'pointer',
}

const ghostBtnStyle = {
  padding: '6px 12px', borderRadius: 6, fontSize: 13,
  background: 'var(--bg-card)', color: 'var(--text-dim)',
  border: '1px solid var(--border)', cursor: 'pointer',
}
