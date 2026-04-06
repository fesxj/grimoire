import { NavLink } from 'react-router-dom'
import {
  LuLibrary, LuMap, LuSearch, LuSettings,
  LuLogOut, LuUser, LuHeart, LuScroll,
} from 'react-icons/lu'

export default function Sidebar({ stats, user, onLogout, uiSettings = {} }) {
  const hide_maps      = uiSettings.hide_maps
  const hide_tokens    = uiSettings.hide_tokens
  const hide_campaigns = uiSettings.hide_campaigns
  const {
    show_stat_systems = true,
    show_stat_books   = false,
    show_stat_pages   = true,
    show_stat_maps    = false,
    show_stat_tokens  = false,
    show_stat_size    = true,
    show_stat_version = true,
  } = uiSettings
  return (
    <div style={{
      width: 220, minWidth: 220, background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '12px 4px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/android-chrome-192x192.png" alt="" aria-hidden="true" width={72} height={72} style={{ borderRadius: 12, flexShrink: 0 }} />
        <div>
          <h1 style={{ fontSize: 20, letterSpacing: '0.08em', margin: 0, lineHeight: 1.1 }}>GRIMOIRE</h1>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            TTRPG Library
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" style={{ padding: '12px 8px', flex: 1 }}>
        <NavLink to="/library" end={false} style={({ isActive }) => navLinkStyle(isActive)}>
          <LuLibrary size={16} /> Library
        </NavLink>
        {!hide_maps && (
          <NavLink to="/maps" end style={({ isActive }) => navLinkStyle(isActive)}>
            <LuMap size={16} /> Maps
          </NavLink>
        )}
        {!hide_tokens && (
          <NavLink to="/tokens" end style={({ isActive }) => navLinkStyle(isActive)}>
            <LuUser size={16} /> Tokens
          </NavLink>
        )}
        <NavLink to="/search" end style={({ isActive }) => navLinkStyle(isActive)}>
          <LuSearch size={16} /> Search
        </NavLink>

        <div style={{ margin: '12px 8px 8px', borderTop: '1px solid var(--border)' }} />

        <NavLink to="/favorites" end style={({ isActive }) => navLinkStyle(isActive)}>
          <LuHeart size={16} /> Favorites
        </NavLink>
        {!hide_campaigns && (
          <NavLink to="/campaigns" end style={({ isActive }) => navLinkStyle(isActive)}>
            <LuScroll size={16} /> Campaigns
          </NavLink>
        )}
      </nav>

      {/* Stats footer */}
      {stats && (show_stat_systems || show_stat_books || show_stat_pages || show_stat_maps || show_stat_tokens || show_stat_size || show_stat_version) && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--text-muted)' }}>
          {show_stat_systems && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Systems</span><span style={{ color: 'var(--text-dim)' }}>{stats.game_systems}</span>
          </div>}
          {show_stat_books && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Books</span><span style={{ color: 'var(--text-dim)' }}>{stats.books}</span>
          </div>}
          {show_stat_pages && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Pages</span><span style={{ color: 'var(--text-dim)' }}>{stats.total_pages?.toLocaleString()}</span>
          </div>}
          {show_stat_maps && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Maps</span><span style={{ color: 'var(--text-dim)' }}>{stats.maps}</span>
          </div>}
          {show_stat_tokens && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Tokens</span><span style={{ color: 'var(--text-dim)' }}>{stats.tokens}</span>
          </div>}
          {show_stat_size && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Size</span><span style={{ color: 'var(--text-dim)' }}>{stats.total_size_mb >= 1024 ? `${(stats.total_size_mb / 1024).toFixed(2)} GB` : `${stats.total_size_mb} MB`}</span>
          </div>}
          {show_stat_version && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Version</span><span style={{ color: 'var(--text-dim)' }}>v{stats.version}</span>
          </div>}
        </div>
      )}

      {/* User + logout */}
      {user && (
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.display_name || user.username}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {user.role}
            </div>
          </div>
          <NavLink
            to="/settings"
            title="Settings"
            aria-label="Settings"
            style={({ isActive }) => ({
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              color: isActive ? 'var(--gold)' : 'var(--text-muted)', padding: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', textDecoration: 'none',
            })}
          >
            <LuSettings size={14} />
          </NavLink>
          <button
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text-muted)', padding: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <LuLogOut size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

const navLinkStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
  padding: '10px 14px', borderRadius: 8, marginBottom: 2,
  background: active ? 'var(--bg-card)' : 'transparent',
  border: active ? '1px solid var(--border)' : '1px solid transparent',
  color: active ? 'var(--gold)' : 'var(--text-dim)',
  fontSize: 16, fontWeight: active ? 500 : 400,
  textDecoration: 'none',
})
