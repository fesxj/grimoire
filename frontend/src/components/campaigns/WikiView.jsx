import { useState, useEffect, useRef, useCallback } from 'react'
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
  LuArrowLeft,
  LuFolderCog,
  LuFileText,
} from 'react-icons/lu'
import { campaigns } from '../../api'
import Spinner from '../Spinner'
import WikiMarkdown from './WikiMarkdown'
import GrimoireEmbedPicker from './GrimoireEmbedPicker'
import CategoryManager from './CategoryManager'
import IconPicker from './IconPicker'
import { CampaignIcon } from './campaignIcons'

const VIS_META = {
  gm: { Icon: LuShield, color: 'var(--gold)', key: 'gm' },
  group: { Icon: LuUsers, color: 'var(--text-dim)', key: 'group' },
  members: { Icon: LuLock, color: '#a78bfa', key: 'members' },
}

function VisibilityBadge({ visibility }) {
  const { t } = useTranslation()
  const meta = VIS_META[visibility] || VIS_META.gm
  const { Icon } = meta
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: meta.color,
        border: `1px solid var(--border)`,
        borderRadius: 12,
        padding: '1px 8px',
      }}
    >
      <Icon size={11} /> {t(`wiki.vis_${meta.key}`)}
    </span>
  )
}

function PageEditor({ campaign, isOwner, page, allPages, categories, onSaved, onCancel }) {
  const { t } = useTranslation()
  const isNew = !page?.id
  const [title, setTitle] = useState(page?.title ?? '')
  const [body, setBody] = useState(page?.body ?? '')
  const [visibility, setVisibility] = useState(page?.visibility ?? (isOwner ? 'gm' : 'group'))
  const [sharedIds, setSharedIds] = useState(page?.shared_user_ids ?? [])
  const [categoryId, setCategoryId] = useState(page?.category_id ?? '')
  const [icon, setIcon] = useState(page?.icon ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showEmbedPicker, setShowEmbedPicker] = useState(false)
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

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: title.trim() || t('wiki.untitled'),
        body,
        visibility,
        shared_user_ids: visibility === 'members' ? sharedIds : [],
        category_id: categoryId || '',
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
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label={t('wiki.groupLabel')}
          style={toolbarControl}
        >
          <option value="">{t('wiki.uncategorized')}</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button type="button" onClick={() => insertAtCursor('[[]]')} style={toolbarBtn}>
          <LuLink2 size={13} /> {t('wiki.insertLink')}
        </button>
        <button type="button" onClick={() => setShowEmbedPicker(true)} style={toolbarBtn}>
          <LuBookOpen size={13} /> {t('wiki.insertEmbed')}
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
  const [categories, setCategories] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [page, setPage] = useState(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [managingCats, setManagingCats] = useState(false)
  const dragId = useRef(null)

  const loadCategories = useCallback(() => {
    campaigns
      .listCategories(campaign.id, 'note')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [campaign.id])

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
    loadCategories()
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

  // --- Drag to reorder / recategorize pages (owner only) ---
  const onPageDragStart = (e, id) => {
    dragId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDropOnGroup = async (group) => {
    const id = dragId.current
    dragId.current = null
    if (!id) return
    const dragged = pages.find((p) => p.id === id)
    if (dragged && (dragged.category_id || null) !== (group.categoryId || null)) {
      await campaigns.updateWikiPage(campaign.id, id, { category_id: group.categoryId || '' })
      loadList()
    }
  }
  const onDropOnPage = async (e, target) => {
    e.preventDefault()
    e.stopPropagation()
    const id = dragId.current
    dragId.current = null
    if (!id || id === target.id) return
    const dragged = pages.find((p) => p.id === id)
    if (dragged && (dragged.category_id || null) !== (target.category_id || null)) {
      await campaigns.updateWikiPage(campaign.id, id, {
        category_id: target.category_id || '',
      })
    }
    const ids = pages.map((p) => p.id).filter((x) => x !== id)
    const idx = ids.indexOf(target.id)
    ids.splice(idx, 0, id)
    await campaigns.reorderWikiPages(campaign.id, ids)
    loadList()
  }

  if (pages === null)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spinner size={24} />
      </div>
    )

  const filtered = query.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()))
    : pages

  // Uncategorized pages sit at the top level (no header). Each custom category
  // follows, always shown — even when it has no pages — so it's a drop target.
  const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order)
  const uncategorized = filtered.filter(
    (p) => !p.category_id || !categories.some((c) => c.id === p.category_id)
  )
  const groups = [
    { key: '__uncat__', name: null, icon: null, categoryId: null, pages: uncategorized },
  ]
  for (const cat of sortedCats) {
    groups.push({
      key: cat.id,
      name: cat.name,
      icon: cat.icon,
      categoryId: cat.id,
      pages: filtered.filter((p) => p.category_id === cat.id),
    })
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Page list */}
      <div style={{ flex: '0 0 240px', maxWidth: 240 }}>
        <button
          onClick={() => {
            setCreating(true)
            setEditing(false)
            setPage(null)
            setSelectedId(null)
          }}
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

        {filtered.length === 0 && categories.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 4px' }}>
            {t('wiki.noPages')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((g) => (
              <div
                key={g.key}
                onDragOver={isOwner ? (e) => e.preventDefault() : undefined}
                onDrop={isOwner ? () => onDropOnGroup(g) : undefined}
              >
                {g.name && (
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      padding: '0 4px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <CampaignIcon name={g.icon} size={12} />
                    {g.name}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {g.pages.length === 0 && g.name ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        padding: '6px 10px',
                        border: '1px dashed var(--border)',
                        borderRadius: 8,
                      }}
                    >
                      {t('wiki.emptyGroup')}
                    </div>
                  ) : (
                    g.pages.map((p) => {
                      const active = p.id === selectedId && !creating
                      const { Icon } = VIS_META[p.visibility] || VIS_META.gm
                      return (
                        <button
                          key={p.id}
                          draggable={isOwner}
                          onDragStart={(e) => onPageDragStart(e, p.id)}
                          onDragOver={isOwner ? (e) => e.preventDefault() : undefined}
                          onDrop={isOwner ? (e) => onDropOnPage(e, p) : undefined}
                          onClick={() => {
                            setCreating(false)
                            setSelectedId(p.id)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            width: '100%',
                            textAlign: 'left',
                            padding: '7px 10px',
                            background: active ? 'var(--bg-card)' : 'transparent',
                            border: active ? '1px solid var(--border)' : '1px solid transparent',
                            borderRadius: 8,
                            color: active ? 'var(--text)' : 'var(--text-dim)',
                            cursor: isOwner ? 'grab' : 'pointer',
                            fontSize: 13,
                          }}
                        >
                          <CampaignIcon
                            name={p.icon}
                            fallback={Icon}
                            size={12}
                            style={{
                              flexShrink: 0,
                              color: (VIS_META[p.visibility] || VIS_META.gm).color,
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.title}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <button
            onClick={() => setManagingCats(true)}
            style={{
              marginTop: 12,
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
            }}
          >
            <LuFolderCog size={13} /> {t('wiki.manageGroups')}
          </button>
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
            categories={categories}
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
            categories={categories}
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
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>{page.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <VisibilityBadge visibility={page.visibility} />
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

      {managingCats && (
        <CategoryManager
          campaignId={campaign.id}
          kind="note"
          onClose={() => setManagingCats(false)}
          onChanged={() => {
            loadCategories()
            loadList()
          }}
        />
      )}
    </div>
  )
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
