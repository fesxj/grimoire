import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LuX, LuSearch, LuBookOpen, LuMap, LuUser, LuPlus } from 'react-icons/lu'
import { campaigns } from '../../api'
import Spinner from '../Spinner'

const TYPE_ICON = { book: LuBookOpen, map: LuMap, token: LuUser }

// Picks a Grimoire book/map/token and returns the [[...]] embed token to insert.
export default function GrimoireEmbedPicker({ onInsert, onClose }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [pageFor, setPageFor] = useState(null) // book item awaiting a page number
  const [pageNum, setPageNum] = useState('')
  const debounce = useRef(null)

  useEffect(() => {
    setLoading(true)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      campaigns
        .searchResources(query.trim())
        .then((data) => setResults(data || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(debounce.current)
  }, [query])

  const insert = (item, page) => {
    let token
    if (item.resource_type === 'book' && page) {
      token = `[[book:${item.resource_id}:${page}]]`
    } else {
      token = `[[${item.resource_type}:${item.resource_id}]]`
    }
    onInsert(token)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 480,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          <LuX size={18} />
        </button>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>
          {t('wiki.embedPickerTitle')}
        </h3>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <LuSearch
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('wiki.embedSearchPlaceholder')}
            style={{
              width: '100%',
              padding: '9px 12px 9px 32px',
              background: 'var(--bg-deep)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <Spinner size={18} />
            </div>
          ) : results.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 4px' }}>
              {t('common.noResults')}
            </div>
          ) : (
            results.map((item) => {
              const Icon = TYPE_ICON[item.resource_type] || LuBookOpen
              const key = `${item.resource_type}:${item.resource_id}`
              const awaitingPage = pageFor === key
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 6px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <Icon size={15} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>

                  {awaitingPage ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        min="1"
                        value={pageNum}
                        onChange={(e) => setPageNum(e.target.value)}
                        placeholder={t('wiki.pageNum')}
                        aria-label={t('wiki.pageNum')}
                        style={{
                          width: 64,
                          padding: '4px 6px',
                          background: 'var(--bg-deep)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          color: 'var(--text)',
                          fontSize: 12,
                        }}
                      />
                      <button
                        onClick={() => insert(item, pageNum || null)}
                        style={miniBtn}
                        title={t('wiki.insert')}
                      >
                        {t('wiki.insert')}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {item.resource_type === 'book' && (
                        <button
                          onClick={() => {
                            setPageFor(key)
                            setPageNum('')
                          }}
                          style={miniBtnGhost}
                          title={t('wiki.withPage')}
                        >
                          {t('wiki.withPage')}
                        </button>
                      )}
                      <button onClick={() => insert(item, null)} style={miniBtn}>
                        <LuPlus size={13} /> {t('wiki.insert')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

const miniBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  padding: '4px 10px',
  background: 'var(--gold)',
  border: 'none',
  borderRadius: 6,
  color: '#1a1209',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
}
const miniBtnGhost = {
  padding: '4px 10px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  fontSize: 12,
}
