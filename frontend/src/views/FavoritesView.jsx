import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LuHeart, LuMap, LuUser, LuFileText, LuLibrary, LuChevronDown } from 'react-icons/lu'
import { mediaUrl } from '../api'
import { useFavorites } from '../context/FavoritesContext'
import FavoriteButton from '../components/FavoriteButton'
import { CATEGORY_ICONS } from '../constants'
import { getDefaultViewMode } from '../hooks/useViewMode'
import { getUserPrefs, saveUserPref } from '../hooks/useUserPrefs'

// Grid column sizing per view mode, matching the library/maps/tokens grids.
const gridStyle = (mode) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${mode === 'compact' ? '140px' : '160px'}, 1fr))`,
  gap: 12,
})

const ROW_LIST_STYLE = { display: 'flex', flexDirection: 'column', gap: 8 }

// Shared hover border handlers for the card wrappers.
const hoverIn = (e) => (e.currentTarget.style.borderColor = 'var(--border-light)')
const hoverOut = (e) => (e.currentTarget.style.borderColor = 'var(--border)')

const cardWrapperStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  overflow: 'hidden',
  cursor: 'pointer',
  position: 'relative',
}

const rowWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '10px 14px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  cursor: 'pointer',
  position: 'relative',
}

// ----- Books -----

function BookFavorite({ item, grid }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const CatIcon = CATEGORY_ICONS[item.category] || LuFileText
  const open = () =>
    navigate(`/library/book/${item.item_id}`, { state: { from: window.location.pathname } })

  if (grid) {
    return (
      <div onClick={open} style={cardWrapperStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        <div
          style={{
            width: '100%',
            aspectRatio: '3 / 4',
            background: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.has_thumbnail ? (
            <img
              src={mediaUrl(`/books/${item.item_id}/thumbnail`)}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <CatIcon size={28} color="var(--text-muted)" style={{ opacity: 0.4 }} />
          )}
        </div>
        <FavoriteButton type="book" id={item.item_id} />
        <div style={{ padding: '8px 10px' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {item.category}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div onClick={open} style={rowWrapperStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
      <div
        style={{
          width: 32,
          height: 44,
          borderRadius: 3,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--bg-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.has_thumbnail ? (
          <img
            src={mediaUrl(`/books/${item.item_id}/thumbnail`)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <CatIcon size={14} color="var(--text-muted)" />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          {item.category}
          {item.page_count > 0 ? ` · ${t('bookRow.pages', { count: item.page_count })}` : ''}
        </div>
      </div>
      <FavoriteButton
        type="book"
        id={item.item_id}
        style={{
          position: 'static',
          background: 'none',
          width: 'auto',
          height: 'auto',
          borderRadius: 0,
        }}
      />
    </div>
  )
}

// ----- Maps -----

function MapFavorite({ item, grid }) {
  const navigate = useNavigate()
  const open = () => navigate(`/maps/${item.item_id}`)

  if (!grid) {
    return (
      <div onClick={open} style={rowWrapperStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        <div
          style={{
            width: 56,
            height: 36,
            borderRadius: 4,
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.has_thumbnail ? (
            <img
              src={mediaUrl(`/maps/${item.item_id}/thumbnail`)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <LuMap size={16} color="var(--text-muted)" style={{ opacity: 0.4 }} />
          )}
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.filename}
        </div>
        <FavoriteButton
          type="map"
          id={item.item_id}
          style={{
            position: 'static',
            background: 'none',
            width: 'auto',
            height: 'auto',
            borderRadius: 0,
          }}
        />
      </div>
    )
  }

  return (
    <div onClick={open} style={cardWrapperStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
      <div
        style={{
          width: '100%',
          height: 110,
          background: 'var(--bg-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.has_thumbnail ? (
          <img
            src={mediaUrl(`/maps/${item.item_id}/thumbnail`)}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <LuMap size={28} color="var(--text-muted)" style={{ opacity: 0.4 }} />
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div
          style={{
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.filename}
        </div>
      </div>
      <FavoriteButton type="map" id={item.item_id} />
    </div>
  )
}

// ----- Tokens -----

function TokenFavorite({ item, grid }) {
  const navigate = useNavigate()
  const open = () => navigate(`/tokens/${item.item_id}`)

  if (!grid) {
    return (
      <div onClick={open} style={rowWrapperStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.has_thumbnail ? (
            <img
              src={mediaUrl(`/tokens/${item.item_id}/thumbnail`)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <LuUser size={16} color="var(--text-muted)" style={{ opacity: 0.4 }} />
          )}
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.filename}
        </div>
        <FavoriteButton
          type="token"
          id={item.item_id}
          style={{
            position: 'static',
            background: 'none',
            width: 'auto',
            height: 'auto',
            borderRadius: 0,
          }}
        />
      </div>
    )
  }

  return (
    <div onClick={open} style={cardWrapperStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
      <div
        style={{
          width: '100%',
          aspectRatio: '1/1',
          background: 'var(--bg-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.has_thumbnail ? (
          <img
            src={mediaUrl(`/tokens/${item.item_id}/thumbnail`)}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <LuUser size={28} color="var(--text-muted)" style={{ opacity: 0.4 }} />
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div
          style={{
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.filename}
        </div>
      </div>
      <FavoriteButton type="token" id={item.item_id} />
    </div>
  )
}

// ----- Systems -----

function SystemFavorite({ item, grid }) {
  const navigate = useNavigate()
  const open = () => navigate(`/library/system/${item.item_id}`)
  const publisher = (item.publishers || []).map((p) => p.name).join(', ')

  if (grid) {
    return (
      <div onClick={open} style={cardWrapperStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        <div
          style={{
            width: '100%',
            aspectRatio: '3 / 4',
            background: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.cover_book_id ? (
            <img
              src={mediaUrl(`/books/${item.cover_book_id}/thumbnail`)}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <LuLibrary size={28} color="var(--text-muted)" style={{ opacity: 0.4 }} />
          )}
        </div>
        <FavoriteButton type="system" id={item.item_id} />
        <div style={{ padding: '8px 10px' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </div>
          {publisher && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {publisher}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div onClick={open} style={rowWrapperStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
      <div
        style={{
          width: 32,
          height: 44,
          borderRadius: 3,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--bg-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.cover_book_id ? (
          <img
            src={mediaUrl(`/books/${item.cover_book_id}/thumbnail`)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <LuLibrary size={14} color="var(--text-muted)" />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </div>
        {publisher && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{publisher}</div>
        )}
      </div>
      <FavoriteButton
        type="system"
        id={item.item_id}
        style={{
          position: 'static',
          background: 'none',
          width: 'auto',
          height: 'auto',
          borderRadius: 0,
        }}
      />
    </div>
  )
}

const PREFS_KEY = 'favoritesCollapsed'

/**
 * A favorites section with a collapsible header. Items render using the user's
 * preferred view style for the section's content type (card/compact → grid,
 * list → rows). Collapse state persists per content type in user prefs.
 */
function FavoritesSection({ type, title, items, renderItem }) {
  const [collapsed, setCollapsed] = useState(() => Boolean(getUserPrefs()[PREFS_KEY]?.[type]))
  const mode = getDefaultViewMode(type)
  const grid = mode !== 'list'

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    const prev = getUserPrefs()[PREFS_KEY] || {}
    saveUserPref(PREFS_KEY, { ...prev, [type]: next })
  }

  return (
    <section style={{ marginBottom: 32 }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          marginBottom: 12,
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: 14,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <LuChevronDown
          size={16}
          aria-hidden="true"
          style={{
            transition: 'transform 0.15s',
            transform: collapsed ? 'rotate(-90deg)' : 'none',
            flexShrink: 0,
          }}
        />
        {title}
      </button>
      {!collapsed && (
        <div style={grid ? gridStyle(mode) : ROW_LIST_STYLE}>
          {items.map((item) => renderItem(item, grid))}
        </div>
      )}
    </section>
  )
}

export default function FavoritesView() {
  const { t } = useTranslation()
  const { items } = useFavorites()

  const systems = items.filter((i) => i.item_type === 'system')
  const books = items.filter((i) => i.item_type === 'book')
  const maps = items.filter((i) => i.item_type === 'map')
  const tokens = items.filter((i) => i.item_type === 'token')

  if (items.length === 0) {
    return (
      <div
        className="fade-in"
        style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}
      >
        <LuHeart size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{t('favorites.empty')}</div>
        <div style={{ fontSize: 14 }}>{t('favorites.emptyHint')}</div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 600,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <LuHeart size={20} fill="var(--gold)" color="var(--gold)" /> {t('favorites.title')}
      </h2>

      {systems.length > 0 && (
        <FavoritesSection
          type="system"
          title={t('favorites.systems', { count: systems.length })}
          items={systems}
          renderItem={(item, grid) => <SystemFavorite key={item.item_id} item={item} grid={grid} />}
        />
      )}

      {books.length > 0 && (
        <FavoritesSection
          type="book"
          title={t('favorites.books', { count: books.length })}
          items={books}
          renderItem={(item, grid) => <BookFavorite key={item.item_id} item={item} grid={grid} />}
        />
      )}

      {maps.length > 0 && (
        <FavoritesSection
          type="map"
          title={t('favorites.maps', { count: maps.length })}
          items={maps}
          renderItem={(item, grid) => <MapFavorite key={item.item_id} item={item} grid={grid} />}
        />
      )}

      {tokens.length > 0 && (
        <FavoritesSection
          type="token"
          title={t('favorites.tokens', { count: tokens.length })}
          items={tokens}
          renderItem={(item, grid) => <TokenFavorite key={item.item_id} item={item} grid={grid} />}
        />
      )}
    </div>
  )
}
