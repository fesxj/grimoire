import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LuLibrary, LuHeart, LuChevronDown, LuChevronRight } from 'react-icons/lu'
import api, { mediaUrl } from '../api'
import Spinner from '../components/Spinner'
import Tag from '../components/Tag'
import FavoriteButton from '../components/FavoriteButton'
import { getUserPrefs, saveUserPref } from '../hooks/useUserPrefs'
import useViewMode from '../hooks/useViewMode'
import ViewModeToggle from '../components/ViewModeToggle'
import { getRecentBooks, getBookPrefs, removeRecentBook } from '../hooks/useBookPrefs'
import { useFavorites } from '../context/FavoritesContext'

function SystemCard({ system, onClick, compact, list }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)

  if (list) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 16px',
          background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'background 0.15s',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 36,
            height: 48,
            borderRadius: 4,
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {system.cover_book_id ? (
            <img
              src={mediaUrl(`/books/${system.cover_book_id}/thumbnail`)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <LuLibrary size={16} color="var(--text-muted)" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {system.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              display: 'flex',
              gap: 8,
              marginTop: 4,
              alignItems: 'center',
            }}
          >
            <span>{t('library.bookCount', { count: system.book_count })}</span>
            {system.is_explicit && <span style={{ color: '#e07070' }}>18+</span>}
          </div>
        </div>
        <FavoriteButton
          type="system"
          id={system.id}
          style={{
            position: 'static',
            background: 'transparent',
            width: 28,
            height: 28,
            flexShrink: 0,
          }}
        />
      </div>
    )
  }

  if (compact) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'background 0.15s',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <FavoriteButton type="system" id={system.id} cardHovered={hovered} />
        <div
          style={{
            width: '100%',
            height: 110,
            background: 'var(--bg-deep)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {system.cover_book_id ? (
            <img
              src={mediaUrl(`/books/${system.cover_book_id}/thumbnail`)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : null}
        </div>
        <div style={{ padding: '8px 10px' }}>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {system.name}
          </div>
          {system.is_explicit && (
            <div style={{ fontSize: 10, color: '#e07070', marginTop: 2 }}>18+</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {system.cover_book_id && (
        <div
          style={{
            width: '100%',
            aspectRatio: '3/4',
            maxHeight: 240,
            background: 'var(--bg-deep)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={mediaUrl(`/books/${system.cover_book_id}/thumbnail`)}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
      )}

      <FavoriteButton type="system" id={system.id} cardHovered={hovered} />
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <h3 style={{ fontSize: 18, lineHeight: 1.3, flex: 1 }}>{system.name}</h3>
          <div
            style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 10 }}
          >
            {system.is_explicit && (
              <span
                style={{
                  background: 'rgba(180,60,60,0.15)',
                  border: '1px solid rgba(180,60,60,0.4)',
                  borderRadius: 20,
                  padding: '2px 8px',
                  fontSize: 11,
                  color: '#e07070',
                  whiteSpace: 'nowrap',
                }}
              >
                18+
              </span>
            )}
            <span
              style={{
                background: 'var(--bg-deep)',
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: 13,
                color: 'var(--text-dim)',
                whiteSpace: 'nowrap',
              }}
            >
              {t('library.bookCount', { count: system.book_count })}
            </span>
          </div>
        </div>

        {system.description && (
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-dim)',
              marginBottom: 10,
              lineHeight: 1.5,
              fontFamily: 'Alegreya, serif',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {system.description}
          </p>
        )}

        {system.publishers?.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            {system.publishers.map((p) => p.name).join(', ')}
          </div>
        )}

        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 0, marginTop: 'auto', paddingTop: 8 }}
        >
          {(system.tags || []).slice(0, 4).map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Compact pill for system-agnostic collections — no cover image, sits at the
// top of the library for quick access.
function AgnosticChip({ system, onClick }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 14px',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <LuLibrary size={16} color="var(--gold-dim)" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{system.name}</span>
      {system.is_explicit && <span style={{ fontSize: 10, color: '#e07070' }}>18+</span>}
      <span
        style={{
          background: 'var(--bg-deep)',
          borderRadius: 20,
          padding: '1px 9px',
          fontSize: 12,
          color: 'var(--text-dim)',
          whiteSpace: 'nowrap',
        }}
      >
        {t('library.bookCount', { count: system.book_count })}
      </span>
    </div>
  )
}

export default function LibraryView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isFavorite } = useFavorites()
  const [systems, setSystems] = useState(null)
  const [favOnly, setFavOnly] = useState(false)
  const [viewMode, cycleViewMode] = useViewMode('system')
  const [recentBooks, setRecentBooks] = useState(() => getRecentBooks())
  const [recentCollapsed, setRecentCollapsed] = useState(
    () => getUserPrefs().recentCollapsed === true
  )

  useEffect(() => {
    api.get('/systems').then(setSystems)
  }, [])

  if (!systems)
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spinner size={32} />
      </div>
    )

  const prefs = getUserPrefs()
  const sort = prefs.librarySort || 'az'

  const sortFn = (a, b) =>
    sort === 'za' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)

  const normalSystems = systems
    .filter(
      (s) => s.book_count > 0 && !s.is_system_agnostic && (!favOnly || isFavorite('system', s.id))
    )
    .sort(sortFn)

  const agnosticSystems = systems
    .filter(
      (s) => s.book_count > 0 && s.is_system_agnostic && (!favOnly || isFavorite('system', s.id))
    )
    .sort(sortFn)

  const compact = viewMode === 'compact'
  const list = viewMode === 'list'
  const minCard = compact ? '130px' : '220px'

  return (
    <div
      className="fade-in"
      style={{
        padding: '32px 40px',
        maxWidth: 1400,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Recently Opened */}
      {recentBooks.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <button
            onClick={() => {
              const next = !recentCollapsed
              setRecentCollapsed(next)
              saveUserPref('recentCollapsed', next)
            }}
            aria-expanded={!recentCollapsed}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              marginBottom: recentCollapsed ? 0 : 12,
              cursor: 'pointer',
              fontSize: 16,
              color: 'var(--text-dim)',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {recentCollapsed ? <LuChevronRight size={16} /> : <LuChevronDown size={16} />}
            {t('library.recentlyOpened')}
          </button>
          <div
            style={{
              display: recentCollapsed ? 'none' : 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            {recentBooks.map((book) => {
              const lastPage = getBookPrefs(book.id).page || 1
              const progress = book.page_count > 0 ? Math.min(lastPage / book.page_count, 1) : 0
              return (
                <div
                  key={book.id}
                  onClick={() =>
                    navigate(`/library/book/${book.id}?page=${lastPage}`, {
                      state: { from: window.location.pathname },
                    })
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    maxWidth: 260,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeRecentBook(book.id)
                      setRecentBooks(getRecentBooks())
                    }}
                    title={t('library.removeFromRecent')}
                    aria-label={t('library.removeFromRecent')}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      lineHeight: 1,
                      padding: '1px 3px',
                      borderRadius: 3,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                  >
                    ✕
                  </button>
                  {progress > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: 'var(--bg-deep)',
                      }}
                    >
                      <div
                        style={{
                          width: `${progress * 100}%`,
                          height: '100%',
                          background: 'var(--gold-dim)',
                        }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      width: 28,
                      height: 36,
                      borderRadius: 3,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: 'var(--bg-deep)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {book.has_thumbnail ? (
                      <img
                        src={mediaUrl(`/books/${book.id}/thumbnail`)}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>📄</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 170,
                      }}
                    >
                      {book.title}
                    </div>
                    {progress > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--gold-dim)', marginTop: 2 }}>
                        {t('common.pageRange', {
                          page: lastPage,
                          total: book.page_count > 0 ? book.page_count : '?',
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* System-Agnostic Collections — kept at the top for quick access, shown as
          compact chips rather than full image cards. */}
      {agnosticSystems.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <LuLibrary size={18} color="var(--gold-dim)" />
            <h2 style={{ fontSize: 22, margin: 0 }}>{t('library.agnosticTitle')}</h2>
          </div>
          <p
            style={{
              color: 'var(--text-dim)',
              fontSize: 15,
              fontFamily: 'Alegreya, serif',
              fontStyle: 'italic',
              marginBottom: 16,
            }}
          >
            {t('library.agnosticSubtitle')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {agnosticSystems.map((system) => (
              <AgnosticChip
                key={system.id}
                system={system}
                onClick={() => navigate(`/library/system/${system.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Game Systems */}
      {(normalSystems.length > 0 || favOnly) && (
        <>
          <div
            style={{
              marginBottom: 32,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ fontSize: 28, marginBottom: 8 }}>{t('library.title')}</h2>
              <p
                style={{
                  color: 'var(--text-dim)',
                  fontSize: 17,
                  fontFamily: 'Alegreya, serif',
                  fontStyle: 'italic',
                }}
              >
                {t('library.subtitle', { count: normalSystems.length })}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ViewModeToggle mode={viewMode} onCycle={cycleViewMode} />
              <FavToggle active={favOnly} onClick={() => setFavOnly((v) => !v)} t={t} />
            </div>
          </div>
          {normalSystems.length > 0 ? (
            <div
              style={
                list
                  ? { display: 'flex', flexDirection: 'column', gap: 8 }
                  : {
                      display: 'grid',
                      gridTemplateColumns: `repeat(auto-fill, minmax(${minCard}, 1fr))`,
                      gap: compact ? 12 : 20,
                    }
              }
            >
              {normalSystems.map((system) => (
                <SystemCard
                  key={system.id}
                  system={system}
                  onClick={() => navigate(`/library/system/${system.id}`)}
                  compact={compact}
                  list={list}
                />
              ))}
            </div>
          ) : favOnly ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 32 }}>
              {t('favorites.noFavoritesInView')}
            </p>
          ) : null}
        </>
      )}

      {/* Empty state when library has no systems at all (not filtered) */}
      {!favOnly && normalSystems.length === 0 && agnosticSystems.length === 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, marginBottom: 8 }}>{t('library.title')}</h2>
          <p
            style={{
              color: 'var(--text-dim)',
              fontSize: 17,
              fontFamily: 'Alegreya, serif',
              fontStyle: 'italic',
            }}
          >
            {t('library.subtitle', { count: 0 })}
          </p>
        </div>
      )}
    </div>
  )
}

function FavToggle({ active, onClick, t }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={t('favorites.onlyFavorites')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: active ? 'rgba(180,120,60,0.15)' : 'var(--bg-card)',
        color: active ? 'var(--gold)' : 'var(--text-muted)',
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      <LuHeart size={14} fill={active ? 'var(--gold)' : 'none'} />
      {t('favorites.onlyFavorites')}
    </button>
  )
}
