import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuX, LuLibrary, LuFolder } from 'react-icons/lu'
import { campaigns } from '../../api'
import Spinner from '../Spinner'

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
}

const panel = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 24,
  width: '100%',
  maxWidth: 520,
  maxHeight: '85vh',
  overflowY: 'auto',
  position: 'relative',
}

const closeBtn = {
  position: 'absolute',
  top: 14,
  right: 14,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
}

const goldBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 16px',
  background: 'var(--gold)',
  border: 'none',
  borderRadius: 8,
  color: '#1a1209',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
}

const ghostBtn = {
  padding: '9px 16px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: 13,
}

const fieldInput = {
  width: '100%',
  padding: '7px 9px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-deep)',
  color: 'var(--text)',
  fontSize: 13,
}

// Edits a form-fillable PDF character sheet by its AcroForm fields. Loads the
// fields on open; on save, writes the values back into the member's PDF.
export function CharacterSheetEditor({ campaignId, memberId, onClose, onSaved }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [fields, setFields] = useState([])
  const [values, setValues] = useState({})
  const [fillable, setFillable] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    campaigns
      .getMemberSheetFields(campaignId, memberId)
      .then((res) => {
        if (!active) return
        setFillable(res.fillable)
        setFields(res.fields)
        setValues(Object.fromEntries(res.fields.map((f) => [f.name, f.value])))
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [campaignId, memberId])

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await campaigns.saveMemberSheetFields(campaignId, memberId, values)
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const renderField = (f) => {
    if (f.type === 'checkbox') {
      return (
        <label key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={!!values[f.name]}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))}
          />
          {f.name}
        </label>
      )
    }
    if (f.options && f.options.length) {
      return (
        <label key={f.name} style={{ display: 'block', fontSize: 12 }}>
          <span style={{ color: 'var(--text-dim)' }}>{f.name}</span>
          <select
            value={values[f.name] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            style={fieldInput}
          >
            <option value="">—</option>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      )
    }
    return (
      <label key={f.name} style={{ display: 'block', fontSize: 12 }}>
        <span style={{ color: 'var(--text-dim)' }}>{f.name}</span>
        <input
          type="text"
          value={values[f.name] ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
          style={fieldInput}
        />
      </label>
    )
  }

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={panel}>
        <button onClick={onClose} aria-label={t('common.close')} style={closeBtn}>
          <LuX size={18} />
        </button>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>
          {t('members.editSheetTitle')}
        </h3>

        {loading ? (
          <Spinner size={18} />
        ) : !fillable ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            {t('members.sheetNotFillable')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fields.map(renderField)}
          </div>
        )}

        {error && (
          <p style={{ fontSize: 13, color: 'var(--danger)', margin: '14px 0 0' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={ghostBtn}>
            {t('members.cancel')}
          </button>
          {fillable && !loading && (
            <button onClick={save} disabled={busy} style={goldBtn}>
              {busy ? t('members.saving') : t('members.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Lets a member pick a blank form-fillable PDF (from the library Character
// Sheets category or a campaign file) to duplicate into their sheet slot.
export function SheetTemplatePicker({ campaignId, memberId, onClose, onDuplicated }) {
  const { t } = useTranslation()
  const [sources, setSources] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    campaigns
      .listSheetSources(campaignId)
      .then(setSources)
      .catch((err) => {
        setError(err.message)
        setSources({ books: [], files: [] })
      })
  }, [campaignId])

  const duplicate = async (sourceType, sourceId) => {
    setBusy(true)
    setError(null)
    try {
      await campaigns.duplicateMemberSheet(campaignId, memberId, {
        source_type: sourceType,
        source_id: sourceId,
      })
      onDuplicated?.()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const renderGroup = (icon, label, items, sourceType) =>
    items.length > 0 && (
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-dim)',
            margin: '0 0 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {icon} {label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => duplicate(sourceType, item.id)}
              disabled={busy}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-deep)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    )

  const isEmpty = sources && sources.books.length === 0 && sources.files.length === 0

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={panel}>
        <button onClick={onClose} aria-label={t('common.close')} style={closeBtn}>
          <LuX size={18} />
        </button>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>
          {t('members.chooseTemplate')}
        </h3>

        {!sources ? (
          <Spinner size={18} />
        ) : isEmpty ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            {t('members.noTemplates')}
          </p>
        ) : (
          <>
            {renderGroup(
              <LuLibrary size={13} />,
              t('members.librarySheets'),
              sources.books,
              'book'
            )}
            {renderGroup(
              <LuFolder size={13} />,
              t('members.campaignSheets'),
              sources.files,
              'file'
            )}
          </>
        )}

        {error && (
          <p style={{ fontSize: 13, color: 'var(--danger)', margin: '14px 0 0' }}>{error}</p>
        )}
      </div>
    </div>
  )
}
