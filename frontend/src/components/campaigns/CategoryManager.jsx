import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LuX,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuChevronUp,
  LuChevronDown,
  LuCheck,
  LuFolder,
} from 'react-icons/lu'
import { campaigns } from '../../api'
import Spinner from '../Spinner'
import IconPicker from './IconPicker'

// Modal for managing a campaign's categories of a given kind ('note' | 'resource').
// Supports create, rename, reorder, and delete with two modes.
export default function CategoryManager({ campaignId, kind, onClose, onChanged }) {
  const { t } = useTranslation()
  const [cats, setCats] = useState(null)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState(null) // the category pending delete-mode choice
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    campaigns
      .listCategories(campaignId, kind)
      .then((list) => setCats([...list].sort((a, b) => a.sort_order - b.sort_order)))
      .catch(() => setCats([]))
  }, [campaignId, kind])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    try {
      await campaigns.createCategory(campaignId, name, kind)
      setNewName('')
      load()
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  const rename = async (id) => {
    const name = editName.trim()
    if (!name) return
    setBusy(true)
    try {
      await campaigns.renameCategory(campaignId, id, name)
      setEditingId(null)
      load()
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  const setIcon = async (id, icon) => {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, icon } : c)))
    await campaigns.updateCategory(campaignId, id, { icon: icon || '' })
    onChanged?.()
  }

  const move = async (index, dir) => {
    const next = [...cats]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setCats(next)
    await campaigns.reorderCategories(
      campaignId,
      next.map((c) => c.id)
    )
    onChanged?.()
  }

  const doDelete = async (mode) => {
    setBusy(true)
    try {
      await campaigns.deleteCategory(campaignId, deleting.id, mode)
      setDeleting(null)
      load()
      onChanged?.()
    } finally {
      setBusy(false)
    }
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
          maxWidth: 460,
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
          {kind === 'note'
            ? t('campaignCategories.titleNotes')
            : t('campaignCategories.titleResources')}
        </h3>

        {/* Create */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder={t('campaignCategories.newPlaceholder')}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'var(--bg-deep)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
          <button onClick={create} disabled={busy || !newName.trim()} style={goldBtn}>
            <LuPlus size={14} /> {t('campaignCategories.add')}
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {cats === null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <Spinner size={18} />
            </div>
          ) : cats.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 2px' }}>
              {t('campaignCategories.none')}
            </div>
          ) : (
            cats.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 4px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={t('campaignCategories.moveUp')}
                    style={arrowBtn(i === 0)}
                  >
                    <LuChevronUp size={13} />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === cats.length - 1}
                    aria-label={t('campaignCategories.moveDown')}
                    style={arrowBtn(i === cats.length - 1)}
                  >
                    <LuChevronDown size={13} />
                  </button>
                </div>

                <IconPicker
                  value={c.icon}
                  onChange={(icon) => setIcon(c.id, icon)}
                  fallback={<LuFolder size={15} aria-hidden="true" />}
                  ariaLabel={t('campaignCategories.iconLabel')}
                />

                {editingId === c.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') rename(c.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      background: 'var(--bg-deep)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: 14 }}>{c.name}</span>
                )}

                {editingId === c.id ? (
                  <button
                    onClick={() => rename(c.id)}
                    aria-label={t('common.save')}
                    style={iconBtn}
                  >
                    <LuCheck size={14} color="var(--gold)" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(c.id)
                      setEditName(c.name)
                    }}
                    aria-label={t('common.edit')}
                    style={iconBtn}
                  >
                    <LuPencil size={13} />
                  </button>
                )}
                <button
                  onClick={() => setDeleting(c)}
                  aria-label={t('common.delete')}
                  style={{ ...iconBtn, color: 'var(--danger)' }}
                >
                  <LuTrash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Delete-mode choice */}
        {deleting && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              background: 'var(--bg-deep)',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              {t('campaignCategories.deletePrompt', { name: deleting.name })}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => doDelete('uncategorize')} disabled={busy} style={ghostBtn}>
                {t('campaignCategories.leaveUncategorized')}
              </button>
              <button
                onClick={() => doDelete('delete_items')}
                disabled={busy}
                style={{ ...ghostBtn, color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                {kind === 'note'
                  ? t('campaignCategories.deletePages')
                  : t('campaignCategories.unlinkResources')}
              </button>
              <button onClick={() => setDeleting(null)} style={ghostBtn}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const goldBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '8px 12px',
  background: 'var(--gold)',
  border: 'none',
  borderRadius: 8,
  color: '#1a1209',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
}
const ghostBtn = {
  padding: '6px 12px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  fontSize: 12,
}
const iconBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  display: 'flex',
  padding: 4,
}
const arrowBtn = (disabled) => ({
  background: 'none',
  border: 'none',
  cursor: disabled ? 'default' : 'pointer',
  color: disabled ? 'var(--border)' : 'var(--text-muted)',
  display: 'flex',
  padding: 0,
})
