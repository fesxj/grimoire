import { useState } from 'react'
import { LuX } from 'react-icons/lu'
import RoleBadge from './RoleBadge'

const isMobile = window.matchMedia('(max-width: 640px)').matches

export default function UserRow({ user, currentUserId, onRoleChange, onExplicitChange, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isSelf = user.id === currentUserId

  if (isMobile) {
    return (
      <div style={{
        padding: '12px 14px', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 8,
      }}>
        {/* Top row: username + delete */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.username}
            </span>
            {isSelf && <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>(you)</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <RoleBadge role={user.role} />
            {confirmDelete ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Delete?</span>
                <button onClick={() => onDelete(user.id)} style={dangerBtnStyle}>Yes</button>
                <button onClick={() => setConfirmDelete(false)} style={ghostBtnStyle}>No</button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={isSelf}
                title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                aria-label={`Delete user ${user.username}`}
                style={{
                  ...ghostBtnStyle, padding: '5px 8px',
                  opacity: isSelf ? 0.3 : 1, cursor: isSelf ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <LuX size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom row: role select + explicit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={user.role}
            onChange={e => onRoleChange(user.id, e.target.value)}
            disabled={isSelf}
            title={isSelf ? 'Cannot change your own role' : 'Change role'}
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: 6, padding: '4px 8px',
              fontSize: 13, cursor: isSelf ? 'not-allowed' : 'pointer',
              opacity: isSelf ? 0.4 : 1,
            }}
          >
            <option value="player">Player</option>
            <option value="gm">GM</option>
            <option value="admin">Admin</option>
          </select>

          <label
            title="Allow explicit content"
            style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: isSelf ? 'default' : 'pointer', opacity: isSelf ? 0.4 : 1 }}
          >
            <input
              type="checkbox"
              checked={user.allow_explicit ?? true}
              onChange={() => !isSelf && onExplicitChange(user.id, !(user.allow_explicit ?? true))}
              disabled={isSelf}
              style={{ width: 14, height: 14, cursor: isSelf ? 'not-allowed' : 'pointer', accentColor: '#e07070' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Explicit</span>
          </label>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8,
    }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{user.username}</span>
        {isSelf && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>(you)</span>}
      </div>

      <RoleBadge role={user.role} />

      <label
        title="Allow explicit content"
        style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: isSelf ? 'default' : 'pointer', opacity: isSelf ? 0.4 : 1 }}
      >
        <input
          type="checkbox"
          checked={user.allow_explicit ?? true}
          onChange={() => !isSelf && onExplicitChange(user.id, !(user.allow_explicit ?? true))}
          disabled={isSelf}
          style={{ width: 14, height: 14, cursor: isSelf ? 'not-allowed' : 'pointer', accentColor: '#e07070' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Explicit</span>
      </label>

      <select
        value={user.role}
        onChange={e => onRoleChange(user.id, e.target.value)}
        disabled={isSelf}
        title={isSelf ? 'Cannot change your own role' : 'Change role'}
        style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          color: 'var(--text)', borderRadius: 6, padding: '4px 8px',
          fontSize: 13, cursor: isSelf ? 'not-allowed' : 'pointer',
          opacity: isSelf ? 0.4 : 1,
        }}
      >
        <option value="player">Player</option>
        <option value="gm">GM</option>
        <option value="admin">Admin</option>
      </select>

      {confirmDelete ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Delete?</span>
          <button onClick={() => onDelete(user.id)} style={dangerBtnStyle}>Yes</button>
          <button onClick={() => setConfirmDelete(false)} style={ghostBtnStyle}>No</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={isSelf}
          title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
          aria-label={`Delete user ${user.username}`}
          style={{
            ...ghostBtnStyle, padding: '5px 8px',
            opacity: isSelf ? 0.3 : 1, cursor: isSelf ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        >
          <LuX size={13} />
        </button>
      )}
    </div>
  )
}

const ghostBtnStyle = {
  padding: '6px 12px', borderRadius: 6, fontSize: 13,
  background: 'var(--bg-card)', color: 'var(--text-dim)',
  border: '1px solid var(--border)', cursor: 'pointer',
}

const dangerBtnStyle = {
  padding: '4px 10px', borderRadius: 6, fontSize: 12,
  background: 'rgba(196, 80, 64, 0.15)', color: 'var(--red)',
  border: '1px solid var(--red)', cursor: 'pointer',
}
