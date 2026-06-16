import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { LuChevronDown, LuBan } from 'react-icons/lu'
import { CAMPAIGN_ICONS, CAMPAIGN_ICON_NAMES, CampaignIcon } from './campaignIcons'

const POPOVER_WIDTH = 232
const POPOVER_MAX_HEIGHT = 220

// Compact icon picker: a trigger button showing the current icon, opening a grid
// of the curated Lucide set plus a "none" option. `value` is the stored name.
// The popover is rendered in a portal at fixed viewport coordinates so it isn't
// clipped by a scrolling/overflow-hidden modal body (e.g. CategoryManager).
export default function IconPicker({ value, onChange, fallback, ariaLabel, compact, size, color }) {
  const iconSize = size ?? (compact ? 13 : 15)
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  const place = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 8
    // Prefer below-left; flip/clamp to stay within the viewport.
    let left = r.left
    if (left + POPOVER_WIDTH > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - POPOVER_WIDTH)
    }
    let top = r.bottom + 4
    if (top + POPOVER_MAX_HEIGHT > window.innerHeight - margin) {
      const above = r.top - 4 - POPOVER_MAX_HEIGHT
      top =
        above > margin ? above : Math.max(margin, window.innerHeight - margin - POPOVER_MAX_HEIGHT)
    }
    setCoords({ top, left })
  }, [])

  useEffect(() => {
    if (!open) return
    place()
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target) || popoverRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onReposition = () => place()
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('resize', onReposition)
    // Capture scroll on any ancestor (e.g. the modal body) so the popover tracks
    // the trigger while scrolling.
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, place])

  const pick = (name) => {
    onChange(name)
    setOpen(false)
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel || t('iconPicker.label')}
        title={ariaLabel || t('iconPicker.label')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? 1 : 4,
          padding: compact ? '2px 3px' : '6px 8px',
          background: compact ? 'transparent' : 'var(--bg-deep)',
          border: compact ? '1px solid transparent' : '1px solid var(--border)',
          borderRadius: 6,
          color: color || 'var(--text-dim)',
          cursor: 'pointer',
        }}
      >
        {value ? (
          <CampaignIcon name={value} size={iconSize} />
        ) : fallback ? (
          fallback
        ) : (
          <LuBan size={iconSize} aria-hidden="true" />
        )}
        {!compact && <LuChevronDown size={12} aria-hidden="true" />}
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              zIndex: 2000,
              width: POPOVER_WIDTH,
              maxHeight: POPOVER_MAX_HEIGHT,
              overflowY: 'auto',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 8,
              boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => pick('')}
              title={t('iconPicker.none')}
              aria-label={t('iconPicker.none')}
              style={iconCell(!value)}
            >
              <LuBan size={16} aria-hidden="true" />
            </button>
            {CAMPAIGN_ICON_NAMES.map((name) => {
              const Icon = CAMPAIGN_ICONS[name]
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => pick(name)}
                  title={name}
                  aria-label={name}
                  style={iconCell(value === name)}
                >
                  <Icon size={16} aria-hidden="true" />
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </div>
  )
}

const iconCell = (active) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  background: active ? 'var(--bg-card)' : 'transparent',
  border: active ? '1px solid var(--gold-dim, var(--gold))' : '1px solid transparent',
  borderRadius: 6,
  color: active ? 'var(--gold)' : 'var(--text-dim)',
  cursor: 'pointer',
})
