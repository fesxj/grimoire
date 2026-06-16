import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  LuPlus,
  LuSearch,
  LuPencil,
  LuTrash2,
  LuShield,
  LuUsers,
  LuLock,
  LuLink2,
  LuBookOpen,
  LuEye,
  LuEyeOff,
  LuArrowLeft,
  LuFileText,
  LuDownload,
  LuUpload,
  LuChevronRight,
  LuChevronDown,
  LuCheck,
} from 'react-icons/lu'
import { campaigns } from '../../api'
import Spinner from '../Spinner'
import WikiMarkdown from './WikiMarkdown'
import GrimoireEmbedPicker from './GrimoireEmbedPicker'
import WikiImportModal from './WikiImportModal'
import IconPicker from './IconPicker'
import { CampaignIcon } from './campaignIcons'

// Return the ids of `pageId` and all its descendants, so a parent picker can
// exclude them (a page may not nest under itself or its own subtree).
function descendantIds(pageId, pages) {
  const childrenOf = {}
  for (const p of pages) (childrenOf[p.parent_id] ||= []).push(p)
  const out = new Set([pageId])
  const stack = [pageId]
  while (stack.length) {
    for (const child of childrenOf[stack.pop()] || []) {
      if (!out.has(child.id)) {
        out.add(child.id)
        stack.push(child.id)
      }
    }
  }
  return out
}

// Visibility colour coding: GM-only is the app's red, Private uses the same gold
// as default icons, and Public is plain white/foreground.
const VIS_META = {
  gm: { Icon: LuShield, color: 'var(--red)', key: 'gm' },
  group: { Icon: LuUsers, color: 'var(--text)', key: 'group' },
  members: { Icon: LuLock, color: 'var(--gold)', key: 'members' },
}

function badgeStyle(meta, interactive) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: meta.color,
    background: 'transparent',
    border: `1px solid var(--border)`,
    borderRadius: 12,
    padding: '1px 8px',
    cursor: interactive ? 'pointer' : 'default',
    font: 'inherit',
    lineHeight: 1.6,
  }
}

function VisibilityBadge({ visibility }) {
  const { t } = useTranslation()
  const meta = VIS_META[visibility] || VIS_META.gm
  const { Icon } = meta
  return (
    <span style={badgeStyle(meta, false)}>
      <Icon size={11} /> {t(`wiki.vis_${meta.key}`)}
    </span>
  )
}

const POPOVER_WIDTH = 220

// Editable visibility badge: a pill that opens a popover for changing the page's
// visibility level. For "members" (Private), the popover lists campaign members
// with per-member access toggles so the owner can grant/revoke without opening
// the full editor. The popover is portalled at fixed coordinates so it isn't
// clipped by surrounding overflow.
function VisibilityEditor({ campaign, isOwner, page, onSetVisibility, onSetShares }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  const meta = VIS_META[page.visibility] || VIS_META.gm
  const { Icon } = meta
  // Match PageEditor's option gating: only the campaign owner may use the GM-only
  // and Private (specific members) levels; everyone else is limited to Public.
  const options = isOwner ? ['gm', 'group', 'members'] : ['group']
  const members = (campaign.members || []).filter((m) => !m.is_owner)
  const sharedIds = page.shared_user_ids || []

  const place = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 8
    let left = r.left
    if (left + POPOVER_WIDTH > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - POPOVER_WIDTH)
    }
    setCoords({ top: r.bottom + 4, left })
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
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, place])

  const toggleMember = (userId) => {
    const next = sharedIds.includes(userId)
      ? sharedIds.filter((id) => id !== userId)
      : [...sharedIds, userId]
    onSetShares(next)
  }

  return (
    <span style={{ display: 'inline-flex' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('wiki.changeVisibility')}
        title={t('wiki.changeVisibility')}
        style={badgeStyle(meta, true)}
      >
        <Icon size={11} /> {t(`wiki.vis_${meta.key}`)}
        <LuChevronDown size={11} aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="menu"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              zIndex: 2000,
              width: POPOVER_WIDTH,
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 6,
              boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {options.map((v) => {
              const m = VIS_META[v]
              const OptIcon = m.Icon
              const selected = page.visibility === v
              return (
                <button
                  key={v}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    if (!selected) onSetVisibility(v)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    background: selected ? 'var(--bg-card)' : 'transparent',
                    border: '1px solid transparent',
                    borderRadius: 6,
                    color: selected ? 'var(--text)' : 'var(--text-dim)',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <OptIcon size={13} style={{ color: m.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{t(`wiki.vis_${m.key}`)}</span>
                  {selected && <LuCheck size={13} style={{ color: 'var(--gold)' }} />}
                </button>
              )
            })}

            {isOwner && page.visibility === 'members' && (
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  marginTop: 4,
                  paddingTop: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    padding: '0 4px 4px',
                  }}
                >
                  {t('wiki.shareWith')}
                </div>
                {members.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '2px 4px' }}>
                    {t('wiki.noMembers')}
                  </div>
                ) : (
                  members.map((mb) => {
                    const checked = sharedIds.includes(mb.user_id)
                    const name = mb.character_name || mb.display_name || mb.username
                    return (
                      <button
                        key={mb.user_id}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={checked}
                        onClick={() => toggleMember(mb.user_id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '5px 8px',
                          background: 'transparent',
                          border: '1px solid transparent',
                          borderRadius: 6,
                          color: checked ? 'var(--text)' : 'var(--text-dim)',
                          cursor: 'pointer',
                          font: 'inherit',
                          fontSize: 13,
                          textAlign: 'left',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            flexShrink: 0,
                            width: 15,
                            height: 15,
                            borderRadius: 4,
                            border: `1px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
                            background: checked ? 'var(--gold)' : 'transparent',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {checked && <LuCheck size={11} color="#1a1209" />}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {name}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </span>
  )
}

function PageEditor({ campaign, isOwner, page, allPages, defaultParentId, onSaved, onCancel }) {
  const { t } = useTranslation()
  const isNew = !page?.id
  const [title, setTitle] = useState(page?.title ?? '')
  const [body, setBody] = useState(page?.body ?? '')
  const [visibility, setVisibility] = useState(page?.visibility ?? (isOwner ? 'gm' : 'group'))
  const [sharedIds, setSharedIds] = useState(page?.shared_user_ids ?? [])
  const [parentId, setParentId] = useState(page?.parent_id ?? defaultParentId ?? '')
  const [icon, setIcon] = useState(page?.icon ?? '')

  // Pages eligible as a parent: every page except this one and its descendants.
  const excluded = page?.id ? descendantIds(page.id, allPages) : new Set()
  const parentOptions = allPages
    .filter((p) => !excluded.has(p.id))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showEmbedPicker, setShowEmbedPicker] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const bodyRef = useRef(null)

  const members = (campaign.members || []).filter((m) => !m.is_owner)

  const insertAtCursor = useCallback(
    (text) => {
      const ta = bodyRef.current
      if (!ta) {
        setBody((b) => b + text)
        return
      }
      const start = ta.selectionStart ?? body.length
      const end = ta.selectionEnd ?? body.length
      setBody((b) => b.slice(0, start) + text + b.slice(end))
      requestAnimationFrame(() => {
        ta.focus()
        const pos = start + text.length
        ta.setSelectionRange(pos, pos)
      })
    },
    [body.length]
  )

  // Wrap the current selection in before/after markers (or insert the empty pair
  // and drop the cursor between them when nothing is selected).
  const wrapSelection = useCallback(
    (before, after) => {
      const ta = bodyRef.current
      if (!ta) {
        setBody((b) => b + before + after)
        return
      }
      const start = ta.selectionStart ?? body.length
      const end = ta.selectionEnd ?? body.length
      const selected = body.slice(start, end)
      setBody((b) => b.slice(0, start) + before + selected + after + b.slice(end))
      requestAnimationFrame(() => {
        ta.focus()
        const pos = start + before.length + selected.length
        ta.setSelectionRange(pos, pos)
      })
    },
    [body]
  )

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: title.trim() || t('wiki.untitled'),
        body,
        visibility,
        shared_user_ids: visibility === 'members' ? sharedIds : [],
        parent_id: parentId || '',
        icon: icon || '',
      }
      const result = isNew
        ? await campaigns.createWikiPage(campaign.id, payload)
        : await campaigns.updateWikiPage(campaign.id, page.id, payload)
      onSaved(result)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const toggleShared = (userId) =>
    setSharedIds((ids) =>
      ids.includes(userId) ? ids.filter((i) => i !== userId) : [...ids, userId]
    )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <IconPicker
          value={icon}
          onChange={setIcon}
          fallback={<LuFileText size={16} aria-hidden="true" />}
          ariaLabel={t('wiki.iconLabel')}
        />
        <input
          aria-label={t('wiki.titleLabel')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('wiki.titlePlaceholder')}
          autoFocus
          style={{
            flex: 1,
            fontSize: 20,
            fontWeight: 700,
            background: 'var(--bg-deep)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            padding: '8px 12px',
            minWidth: 0,
          }}
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          disabled={!isOwner}
          aria-label={t('wiki.visibilityLabel')}
          style={toolbarControl}
        >
          {isOwner && <option value="gm">{t('wiki.vis_gm')}</option>}
          <option value="group">{t('wiki.vis_group')}</option>
          {isOwner && <option value="members">{t('wiki.vis_members')}</option>}
        </select>

        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          aria-label={t('wiki.parentLabel')}
          style={toolbarControl}
        >
          <option value="">{t('wiki.noParent')}</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <button type="button" onClick={() => insertAtCursor('[[]]')} style={toolbarBtn}>
          <LuLink2 size={13} /> {t('wiki.insertLink')}
        </button>
        <button type="button" onClick={() => setShowEmbedPicker(true)} style={toolbarBtn}>
          <LuBookOpen size={13} /> {t('wiki.insertEmbed')}
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={() => wrapSelection('||', '||')}
            title={t('wiki.insertSecretHint')}
            style={toolbarBtn}
          >
            <LuEyeOff size={13} /> {t('wiki.insertSecret')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          aria-pressed={showPreview}
          style={showPreview ? { ...toolbarBtn, ...toolbarBtnActive } : toolbarBtn}
        >
          <LuEye size={13} /> {t('wiki.preview')}
        </button>
      </div>

      {/* Members share picker */}
      {isOwner && visibility === 'members' && (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 12px',
            background: 'var(--bg-deep)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            {t('wiki.shareWith')}
          </div>
          {members.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('wiki.noMembers')}</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {members.map((m) => (
                <label
                  key={m.user_id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sharedIds.includes(m.user_id)}
                    onChange={() => toggleShared(m.user_id)}
                  />
                  {m.character_name || m.display_name || m.username}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor + live preview */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px', minWidth: 280 }}>
          <div style={paneLabel}>{t('wiki.markdown')}</div>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('wiki.bodyPlaceholder')}
            rows={20}
            aria-label={t('wiki.markdown')}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'vertical',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              boxSizing: 'border-box',
            }}
          />
        </div>
        {showPreview && (
          <div style={{ flex: '1 1 360px', minWidth: 280 }}>
            <div style={paneLabel}>
              <LuEye size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {t('wiki.preview')}
            </div>
            <div
              style={{
                padding: '12px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                minHeight: 200,
              }}
            >
              <WikiMarkdown body={body} pageSlugs={allPages.map((p) => p.slug)} />
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>
          {t('common.cancel')}
        </button>
        <button type="button" onClick={save} disabled={saving} style={goldBtn}>
          {saving ? t('wiki.saving') : t('common.save')}
        </button>
      </div>

      {showEmbedPicker && (
        <GrimoireEmbedPicker
          onInsert={(token) => {
            insertAtCursor(token)
            setShowEmbedPicker(false)
          }}
          onClose={() => setShowEmbedPicker(false)}
        />
      )}
    </div>
  )
}

export default function WikiView({ campaign, isOwner }) {
  const { t } = useTranslation()
  const [pages, setPages] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [page, setPage] = useState(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createParentId, setCreateParentId] = useState('')
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState(false)
  // Ids of parent pages whose children are collapsed in the sidebar tree.
  const [collapsed, setCollapsed] = useState(() => new Set())
  const dragId = useRef(null)

  const exportWiki = async (format) => {
    try {
      await campaigns.exportWiki(campaign.id, format)
    } catch (e) {
      alert(e.message)
    }
  }

  const toggleCollapse = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const loadList = useCallback(
    (selectId) => {
      campaigns.listWikiPages(campaign.id).then((list) => {
        setPages(list)
        if (selectId) setSelectedId(selectId)
        else if (!selectId && list.length && !selectedId) setSelectedId(list[0].id)
      })
    },
    [campaign.id, selectedId]
  )

  useEffect(() => {
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id])

  useEffect(() => {
    if (!selectedId) {
      setPage(null)
      return
    }
    setEditing(false)
    campaigns
      .getWikiPage(campaign.id, selectedId)
      .then(setPage)
      .catch(() => setPage(null))
  }, [campaign.id, selectedId])

  const openSlug = (slug) => {
    const match = pages?.find((p) => p.slug === slug)
    if (match) {
      setSelectedId(match.id)
    } else {
      // The target isn't visible to this user (or doesn't exist yet); refresh list.
      loadList()
    }
  }

  const handleSaved = (saved) => {
    setCreating(false)
    setEditing(false)
    loadList(saved.id)
    setSelectedId(saved.id)
    campaigns.getWikiPage(campaign.id, saved.id).then(setPage)
  }

  const handleDelete = async () => {
    if (!page || !confirm(t('wiki.deleteConfirm', { title: page.title }))) return
    await campaigns.deleteWikiPage(campaign.id, page.id)
    setSelectedId(null)
    setPage(null)
    loadList()
  }

  // Quick icon change without entering the full editor. Updates the list (and the
  // open page, if it's the one changed) so the new icon shows immediately.
  const changeIcon = async (pageId, icon) => {
    await campaigns.updateWikiPage(campaign.id, pageId, { icon: icon || '' })
    loadList(selectedId)
    if (page?.id === pageId) setPage((p) => (p ? { ...p, icon: icon || '' } : p))
  }

  // Change the open page's visibility from its badge. Switching away from
  // "members" clears the share list to mirror PageEditor's save behaviour.
  const changeVisibility = async (visibility) => {
    if (!page) return
    const payload = { visibility }
    if (visibility !== 'members') payload.shared_user_ids = []
    await campaigns.updateWikiPage(campaign.id, page.id, payload)
    setPage((p) =>
      p
        ? { ...p, visibility, shared_user_ids: visibility === 'members' ? p.shared_user_ids : [] }
        : p
    )
    loadList(selectedId)
  }

  // Toggle which members can access the open Private page.
  const changeShares = async (sharedIds) => {
    if (!page) return
    await campaigns.updateWikiPage(campaign.id, page.id, { shared_user_ids: sharedIds })
    setPage((p) => (p ? { ...p, shared_user_ids: sharedIds } : p))
  }

  const startCreate = (parentId = '') => {
    setCreateParentId(parentId)
    setCreating(true)
    setEditing(false)
    setPage(null)
    setSelectedId(null)
  }

  // --- Drag to reparent / reorder pages (owner only) ---
  const onPageDragStart = (e, id) => {
    dragId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }
  // Drop onto the top-level zone: move the dragged page to the root.
  const onDropOnRoot = async () => {
    const id = dragId.current
    dragId.current = null
    if (!id) return
    const dragged = pages.find((p) => p.id === id)
    if (dragged && dragged.parent_id) {
      await campaigns.updateWikiPage(campaign.id, id, { parent_id: '' })
      loadList()
    }
  }
  // Drop onto a page: nest the dragged page under it (no-op if that would create
  // a cycle — the server rejects it, but we guard client-side too).
  const onDropOnPage = async (e, target) => {
    e.preventDefault()
    e.stopPropagation()
    const id = dragId.current
    dragId.current = null
    if (!id || id === target.id) return
    if (descendantIds(id, pages).has(target.id)) return
    const dragged = pages.find((p) => p.id === id)
    if (dragged && (dragged.parent_id || null) !== target.id) {
      await campaigns.updateWikiPage(campaign.id, id, { parent_id: target.id })
    }
    loadList()
  }

  if (pages === null)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spinner size={24} />
      </div>
    )

  const searching = !!query.trim()
  const matches = searching
    ? pages.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()))
    : pages

  // Build the child lookup for the tree. While searching we flatten to the matching
  // rows (a filtered tree would hide parents of matches), so the list stays useful.
  const childrenOf = {}
  for (const p of pages) (childrenOf[p.parent_id || '__root__'] ||= []).push(p)
  const idSet = new Set(pages.map((p) => p.id))
  // A page whose parent_id points nowhere (e.g. its parent was filtered out by
  // visibility) is treated as a root so it never disappears.
  const rootKey = (p) => (p.parent_id && idSet.has(p.parent_id) ? p.parent_id : '__root__')
  const roots = pages.filter((p) => rootKey(p) === '__root__')

  const renderRow = (p, depth, flat = false) => {
    const active = p.id === selectedId && !creating
    const meta = VIS_META[p.visibility] || VIS_META.gm
    const { Icon } = meta
    // In the flat search view, nesting and chevrons are suppressed.
    const kids = flat ? [] : (childrenOf[p.id] || []).filter((c) => idSet.has(c.id))
    const hasKids = kids.length > 0
    const isCollapsed = collapsed.has(p.id)
    const selectPage = () => {
      setCreating(false)
      setSelectedId(p.id)
    }
    return (
      <div key={p.id}>
        <div
          draggable={isOwner}
          onDragStart={(e) => onPageDragStart(e, p.id)}
          onDragOver={isOwner ? (e) => e.preventDefault() : undefined}
          onDrop={isOwner ? (e) => onDropOnPage(e, p) : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '7px 10px',
            paddingLeft: 10 + depth * 14,
            background: active ? 'var(--bg-card)' : 'transparent',
            border: active ? '1px solid var(--border)' : '1px solid transparent',
            borderRadius: 8,
            color: active ? 'var(--text)' : 'var(--text-dim)',
            cursor: isOwner ? 'grab' : 'pointer',
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        >
          {/* Expand/collapse chevron, or a spacer to keep rows aligned. */}
          {hasKids ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleCollapse(p.id)
              }}
              aria-label={t(isCollapsed ? 'wiki.expand' : 'wiki.collapse')}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              {isCollapsed ? <LuChevronRight size={13} /> : <LuChevronDown size={13} />}
            </button>
          ) : (
            <span style={{ flexShrink: 0, width: 13 }} aria-hidden="true" />
          )}
          {/* The icon is its own popover control on editable rows; the wrapper is
              non-draggable and stops propagation so grabbing or clicking the icon
              doesn't start a drag or select the row. */}
          {p.can_edit ? (
            <div
              draggable={false}
              onDragStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{ flexShrink: 0, display: 'inline-flex' }}
            >
              <IconPicker
                value={p.icon}
                onChange={(icon) => changeIcon(p.id, icon)}
                fallback={<Icon size={14} aria-hidden="true" />}
                ariaLabel={t('wiki.iconLabel')}
                compact
                color={meta.color}
              />
            </div>
          ) : (
            <CampaignIcon
              name={p.icon}
              fallback={Icon}
              size={12}
              style={{ flexShrink: 0, color: meta.color }}
            />
          )}
          <button
            type="button"
            onClick={selectPage}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              font: 'inherit',
              padding: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.title}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                startCreate(p.id)
              }}
              aria-label={t('wiki.addSubpage')}
              title={t('wiki.addSubpage')}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <LuPlus size={13} />
            </button>
          )}
        </div>
        {hasKids && !isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            {kids.map((c) => renderRow(c, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Page list */}
      <div style={{ flex: '0 0 240px', maxWidth: 240 }}>
        <button
          onClick={() => startCreate('')}
          style={{ ...goldBtn, width: '100%', justifyContent: 'center', marginBottom: 10 }}
        >
          <LuPlus size={14} /> {t('wiki.newPage')}
        </button>

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <LuSearch
            size={13}
            style={{
              position: 'absolute',
              left: 9,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('wiki.searchPlaceholder')}
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
              background: 'var(--bg-deep)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {pages.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 4px' }}>
            {t('wiki.noPages')}
          </div>
        ) : (
          <div
            // Dropping in the empty space below the tree moves a page to the root.
            onDragOver={isOwner ? (e) => e.preventDefault() : undefined}
            onDrop={isOwner ? onDropOnRoot : undefined}
            style={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 40 }}
          >
            {searching
              ? matches.map((p) => renderRow(p, 0, true))
              : roots.map((p) => renderRow(p, 0))}
          </div>
        )}

        {isOwner && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => exportWiki('md')}
                title={t('wiki.exportMd')}
                style={{ ...dashedBtn, flex: 1 }}
              >
                <LuDownload size={13} /> {t('wiki.export')}
              </button>
              <button
                onClick={() => setImporting(true)}
                title={t('wiki.importTitle')}
                style={{ ...dashedBtn, flex: 1 }}
              >
                <LuUpload size={13} /> {t('wiki.import')}
              </button>
            </div>
            <button onClick={() => exportWiki('json')} style={{ ...dashedBtn, fontSize: 11 }}>
              {t('wiki.exportJson')}
            </button>
          </div>
        )}
      </div>

      {/* Main pane */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {creating ? (
          <PageEditor
            campaign={campaign}
            isOwner={isOwner}
            page={null}
            allPages={pages}
            defaultParentId={createParentId}
            onSaved={handleSaved}
            onCancel={() => setCreating(false)}
          />
        ) : !page ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 20 }}>
            {t('wiki.selectPrompt')}
          </div>
        ) : editing ? (
          <PageEditor
            campaign={campaign}
            isOwner={isOwner}
            page={page}
            allPages={pages}
            onSaved={handleSaved}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 6px' }}>
                  {(() => {
                    const visColor = (VIS_META[page.visibility] || VIS_META.gm).color
                    return page.can_edit ? (
                      <IconPicker
                        value={page.icon}
                        onChange={(icon) => changeIcon(page.id, icon)}
                        fallback={<LuFileText size={20} aria-hidden="true" />}
                        ariaLabel={t('wiki.iconLabel')}
                        compact
                        size={20}
                        color={visColor}
                      />
                    ) : (
                      <CampaignIcon
                        name={page.icon}
                        fallback={LuFileText}
                        size={20}
                        style={{ color: visColor }}
                      />
                    )
                  })()}
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{page.title}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {page.can_edit ? (
                    <VisibilityEditor
                      campaign={campaign}
                      isOwner={isOwner}
                      page={page}
                      onSetVisibility={changeVisibility}
                      onSetShares={changeShares}
                    />
                  ) : (
                    <VisibilityBadge visibility={page.visibility} />
                  )}
                  {page.created_by_name && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {t('wiki.byAuthor', { name: page.created_by_name })}
                    </span>
                  )}
                </div>
              </div>
              {page.can_edit && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setEditing(true)} style={ghostBtn}>
                    <LuPencil size={13} /> {t('common.edit')}
                  </button>
                  <button onClick={handleDelete} style={{ ...ghostBtn, color: 'var(--danger)' }}>
                    <LuTrash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '20px 24px',
              }}
            >
              <WikiMarkdown
                body={page.body}
                pageSlugs={pages.map((p) => p.slug)}
                onOpenSlug={openSlug}
              />
            </div>

            {page.backlinks?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <LuArrowLeft size={13} /> {t('wiki.backlinks')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {page.backlinks.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 10px',
                        background: 'var(--bg-deep)',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      {b.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {importing && (
        <WikiImportModal
          campaignId={campaign.id}
          onClose={() => setImporting(false)}
          onImported={() => loadList()}
        />
      )}
    </div>
  )
}

const dashedBtn = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  width: '100%',
  justifyContent: 'center',
  padding: '6px 10px',
  background: 'transparent',
  border: '1px dashed var(--border)',
  borderRadius: 8,
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 12,
}
const toolbarBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 10px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  fontSize: 12,
}
const toolbarBtnActive = {
  background: 'var(--bg-card)',
  borderColor: 'var(--gold)',
  color: 'var(--gold)',
}
const toolbarControl = {
  appearance: 'auto',
  fontSize: 12,
  padding: '5px 8px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
}
const paneLabel = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  fontWeight: 600,
  marginBottom: 6,
}
const ghostBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '7px 12px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  fontSize: 13,
}
const goldBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: 'var(--gold)',
  border: 'none',
  borderRadius: 8,
  color: '#1a1209',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
}
