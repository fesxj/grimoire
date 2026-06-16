import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuMap, LuCheck } from 'react-icons/lu'
import { mediaUrl } from '../../api'
import { formatSize } from '../../utils'
import FavoriteButton from '../FavoriteButton'
import DownloadButton from '../DownloadButton'

export default function MapCard({ map, onClick, bulkMode, selected, onToggle, list }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)

  const handleClick = (e) => {
    if (bulkMode) {
      e.stopPropagation()
      onToggle({ shift: e.shiftKey, meta: e.metaKey || e.ctrlKey })
      return
    }
    onClick()
  }

  if (list) {
    return (
      <div
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick(e)
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={map.filename}
        aria-pressed={bulkMode ? selected : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 14px',
          background: selected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
          border: selected ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
          borderRadius: 8,
          cursor: bulkMode ? 'default' : 'pointer',
          transition: 'border-color 0.15s',
          position: 'relative',
        }}
      >
        {bulkMode && (
          <div
            style={{
              width: 20,
              height: 20,
              flexShrink: 0,
              borderRadius: 4,
              background: selected ? 'var(--gold)' : 'transparent',
              border: selected ? 'none' : '2px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected && <LuCheck size={12} color="var(--bg-deep)" strokeWidth={3} />}
          </div>
        )}
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
          {map.has_thumbnail ? (
            <img
              src={mediaUrl(`/maps/${map.id}/thumbnail`)}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <LuMap
              size={18}
              color="var(--text-muted)"
              aria-hidden="true"
              style={{ opacity: 0.4 }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {map.filename}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              display: 'flex',
              gap: 8,
              marginTop: 2,
              alignItems: 'center',
            }}
          >
            <span>{formatSize(map.file_size)}</span>
            {map.is_missing && <span style={{ color: '#c8860a' }}>{t('maps.missing')}</span>}
          </div>
        </div>
        {!bulkMode && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <DownloadButton
              type="maps"
              id={map.id}
              style={{ position: 'static', background: 'transparent', width: 28, height: 28 }}
            />
            <FavoriteButton
              type="map"
              id={map.id}
              style={{
                position: 'static',
                background: 'transparent',
                width: 28,
                height: 28,
              }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick(e)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={map.filename}
      aria-pressed={bulkMode ? selected : undefined}
      style={{
        background: selected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: selected ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: bulkMode ? 'default' : 'pointer',
        transition: 'border-color 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        setHovered(true)
        if (!bulkMode && !selected) e.currentTarget.style.borderColor = 'var(--border-light)'
      }}
      onMouseLeave={(e) => {
        setHovered(false)
        if (!selected) e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {!bulkMode && <DownloadButton type="maps" id={map.id} cardHovered={hovered} />}
      {!bulkMode && <FavoriteButton type="map" id={map.id} cardHovered={hovered} />}
      {bulkMode && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            width: 20,
            height: 20,
            borderRadius: 4,
            background: selected ? 'var(--gold)' : 'rgba(0,0,0,0.55)',
            border: selected ? 'none' : '2px solid rgba(255,255,255,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          {selected && <LuCheck size={12} color="var(--bg-deep)" strokeWidth={3} />}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: 140,
          background: 'var(--bg-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {map.has_thumbnail ? (
          <img
            src={mediaUrl(`/maps/${map.id}/thumbnail`)}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <LuMap size={32} color="var(--text-muted)" aria-hidden="true" style={{ opacity: 0.4 }} />
        )}
        {map.is_missing && (
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              left: 6,
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 6,
              background: 'rgba(200,134,10,0.9)',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {t('maps.missing')}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div
          style={{
            fontSize: 15,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {map.filename}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          {formatSize(map.file_size)}
        </div>
      </div>
    </div>
  )
}
