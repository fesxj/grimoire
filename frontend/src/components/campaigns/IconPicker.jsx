import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LuChevronDown, LuBan } from 'react-icons/lu'
import { CAMPAIGN_ICONS, CAMPAIGN_ICON_NAMES, CampaignIcon } from './campaignIcons'

// Compact icon picker: a trigger button showing the current icon, opening a grid
// of the curated Lucide set plus a "none" option. `value` is the stored name.
export default function IconPicker({ value, onChange, fallback, ariaLabel }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const pick = (name) => {
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel || t('iconPicker.label')}
        title={ariaLabel || t('iconPicker.label')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 8px',
          background: 'var(--bg-deep)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: 'var(--text-dim)',
          cursor: 'pointer',
        }}
      >
        {value ? (
          <CampaignIcon name={value} size={15} />
        ) : fallback ? (
          fallback
        ) : (
          <LuBan size={15} aria-hidden="true" />
        )}
        <LuChevronDown size={12} aria-hidden="true" />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 1200,
            top: 'calc(100% + 4px)',
            left: 0,
            width: 232,
            maxHeight: 220,
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
        </div>
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
