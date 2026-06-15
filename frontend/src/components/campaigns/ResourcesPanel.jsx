import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  LuBookOpen,
  LuMap,
  LuUser,
  LuPlus,
  LuTrash2,
  LuSearch,
  LuX,
  LuChevronRight,
  LuFolder,
  LuFolderCog,
  LuFile,
  LuUpload,
} from 'react-icons/lu'
import { campaigns, mediaUrl } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useUISettings } from '../../context/UISettingsContext'
import Spinner from '../Spinner'
import CategoryManager from './CategoryManager'
import { CampaignIcon } from './campaignIcons'

const TYPE_ICONS = {
  book: { Icon: LuBookOpen, color: '#a78bfa' },
  map: { Icon: LuMap, color: '#60a5fa' },
  token: { Icon: LuUser, color: '#34d399' },
  file: { Icon: LuFile, color: '#e0b341' },
}

const RESOURCE_NAV = {
  book: (id) => `/library/book/${id}`,
  map: (id) => `/maps/${id}`,
  token: (id) => `/tokens/${id}`,
}

// Visibility selector order: public, then private, then GM-only.
const VISIBILITY_OPTIONS = ['public', 'private', 'gm']

function ResourceRow({
  campaignId,
  resource,
  isOwner,
  isGmCampaign,
  members,
  categories,
  onRemove,
  onSetVisibility,
  onSetShares,
  onSetCategory,
  onDragStart,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const { Icon } = TYPE_ICONS[resource.resource_type] || { Icon: LuBookOpen }
  const isBook = resource.resource_type === 'book'
  const isFile = resource.resource_type === 'file'

  const thumbUrl =
    resource.has_thumbnail && !isFile
      ? mediaUrl(
          `/${isBook ? 'books' : resource.resource_type + 's'}/${resource.resource_id}/thumbnail`
        )
      : null

  const handleNav = () => {
    if (isFile) {
      window.open(campaigns.fileUrl(campaignId, resource.resource_id), '_blank')
      return
    }
    navigate(RESOURCE_NAV[resource.resource_type]?.(resource.resource_id) ?? '/', {
      state: { from: window.location.pathname },
    })
  }

  const stop = (e) => e.stopPropagation()

  return (
    <div
      draggable={isOwner}
      onDragStart={(e) => onDragStart?.(e, resource)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 10,
        padding: '10px 12px',
        background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        transition: 'background 0.15s',
        marginBottom: 6,
        cursor: isOwner ? 'grab' : 'default',
      }}
    >
      <div
        style={{
          width: isBook ? 36 : 44,
          height: isBook ? 48 : 44,
          borderRadius: 4,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--bg-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Icon size={16} color="var(--text-muted)" />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Row 1 — title (clickable) */}
        <div
          onClick={handleNav}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleNav()
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Open ${resource.name || resource.resource_id}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {resource.name || resource.resource_id}
          </span>
          {resource.subtitle && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
              {resource.subtitle}
            </span>
          )}
          <LuChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        </div>

        {/* Row 2 — options */}
        {isOwner ? (
          <div
            style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
            onClick={stop}
            role="presentation"
          >
            {isGmCampaign && (
              <select
                value={resource.visibility}
                onChange={(e) => onSetVisibility(resource.id, e.target.value)}
                aria-label={t('resources.visibilityLabel')}
                style={{
                  ...selectStyle,
                  color: resource.visibility === 'public' ? 'var(--gold)' : 'var(--text-dim)',
                }}
              >
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {t(`resources.vis_${v}`)}
                  </option>
                ))}
              </select>
            )}
            {categories?.length > 0 && (
              <select
                value={resource.category_id || ''}
                onChange={(e) => onSetCategory(resource.id, e.target.value)}
                aria-label={t('resources.categoryLabel')}
                style={{ ...selectStyle, maxWidth: 150 }}
              >
                <option value="">{t('resources.typeGroup')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => onRemove(resource)}
              aria-label={`Remove ${resource.name || resource.resource_id}`}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 4,
                display: 'flex',
              }}
            >
              <LuTrash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          isGmCampaign && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t(`resources.vis_${resource.visibility}`)}
            </span>
          )
        )}

        {/* Row 3 — private share checkboxes */}
        {isOwner && isGmCampaign && resource.visibility === 'private' && members.length > 0 && (
          <div
            onClick={stop}
            role="presentation"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 2 }}
          >
            {members.map((m) => {
              const checked = (resource.shared_user_ids || []).includes(m.user_id)
              return (
                <label
                  key={m.user_id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...(resource.shared_user_ids || []), m.user_id]
                        : (resource.shared_user_ids || []).filter((id) => id !== m.user_id)
                      onSetShares(resource.id, next)
                    }}
                  />
                  {m.character_name || m.display_name || m.username}
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ResourcePicker({ campaignId, linkedIds, onAdd, onClose }) {
  const { t } = useTranslation()
  const TYPE_TABS = [
    { key: '', label: t('resources.all') },
    { key: 'book', label: t('resources.books') },
    { key: 'map', label: t('resources.maps') },
    { key: 'token', label: t('resources.tokens') },
  ]
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const searchRef = useRef(null)
  const debounce = useRef(null)

  const doSearch = (q, type) => {
    setLoading(true)
    campaigns
      .searchResources(q, type)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    searchRef.current?.focus()
    doSearch('', '')
  }, [])

  const handleQuery = (v) => {
    setQuery(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(v, typeFilter), 250)
  }

  const handleType = (tp) => {
    setTypeFilter(tp)
    doSearch(query, tp)
  }

  const handleAdd = async (item) => {
    try {
      await campaigns.addResource(campaignId, {
        resource_type: item.resource_type,
        resource_id: item.resource_id,
        visibility: 'public',
      })
      onAdd()
    } catch (err) {
      if (err.status === 409) return
      alert(err.message)
    }
  }

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-light)',
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t('resources.linkTitle')}</div>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 2,
          }}
        >
          <LuX size={16} aria-hidden="true" />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 10,
          background: 'var(--bg-deep)',
          borderRadius: 8,
          padding: 4,
        }}
      >
        {TYPE_TABS.map((tp) => (
          <button
            key={tp.key}
            onClick={() => handleType(tp.key)}
            style={{
              flex: 1,
              padding: '5px 0',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              background: typeFilter === tp.key ? 'var(--bg-card)' : 'transparent',
              color: typeFilter === tp.key ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            {tp.label}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <LuSearch
          size={14}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          aria-label={t('resources.searchAriaLabel')}
          placeholder={t('resources.searchPlaceholder')}
          style={{
            width: '100%',
            padding: '8px 10px 8px 32px',
            background: 'var(--bg-deep)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div
        style={{
          maxHeight: 260,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <Spinner size={18} />
          </div>
        )}
        {!loading && results.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '16px 0',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            {t('resources.noResults')}
          </div>
        )}
        {!loading &&
          results.map((item) => {
            const key = `${item.resource_type}:${item.resource_id}`
            const alreadyLinked = linkedIds.has(key)
            const { Icon, color } = TYPE_ICONS[item.resource_type] || {
              Icon: LuBookOpen,
              color: 'var(--text-muted)',
            }
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  background: alreadyLinked ? 'var(--bg-deep)' : 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  opacity: alreadyLinked ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 32,
                    borderRadius: 4,
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--border)',
                    flexShrink: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.has_thumbnail ? (
                    <img
                      src={mediaUrl(
                        `/${item.resource_type === 'book' ? 'books' : item.resource_type + 's'}/${item.resource_id}/thumbnail`
                      )}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Icon size={12} color={color} />
                  )}
                </div>
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
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.subtitle}</div>
                  )}
                </div>
                <button
                  onClick={() => !alreadyLinked && handleAdd(item)}
                  disabled={alreadyLinked}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: alreadyLinked ? 'default' : 'pointer',
                    background: alreadyLinked ? 'var(--bg-deep)' : 'var(--gold)',
                    color: alreadyLinked ? 'var(--text-muted)' : '#1a1209',
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {alreadyLinked ? t('resources.linked') : t('resources.addResource')}
                </button>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default function ResourcesPanel({ campaign, isOwner }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const ui = useUISettings()
  const isGmCampaign = campaign.is_gm_campaign

  const TYPE_LABELS = {
    book: t('resources.books'),
    map: t('resources.maps'),
    token: t('resources.tokens'),
    file: t('resources.files'),
  }

  const [resources, setResources] = useState(null)
  const [categories, setCategories] = useState([])
  const [adding, setAdding] = useState(false)
  const [managingCats, setManagingCats] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const dragId = useRef(null)

  const load = () => {
    campaigns
      .listResources(campaign.id)
      .then(setResources)
      .catch(() => setResources([]))
  }
  const loadCategories = () => {
    campaigns
      .listCategories(campaign.id, 'resource')
      .then(setCategories)
      .catch(() => setCategories([]))
  }

  useEffect(() => {
    load()
    loadCategories()
  }, [campaign.id])

  const members = (campaign.members || []).filter((m) => !m.is_owner)

  const remove = async (resource) => {
    if (resource.resource_type === 'file' && !confirm(t('resources.deleteFileConfirm'))) return
    await campaigns.removeResource(campaign.id, resource.id)
    load()
  }

  const setVisibility = async (resourceId, visibility) => {
    await campaigns.updateResource(campaign.id, resourceId, { visibility })
    load()
  }
  const setShares = async (resourceId, ids) => {
    await campaigns.updateResource(campaign.id, resourceId, { shared_user_ids: ids })
    load()
  }
  const setCategory = async (resourceId, categoryId) => {
    await campaigns.updateResource(campaign.id, resourceId, { category_id: categoryId || '' })
    load()
  }

  const uploadDisabled = ui.campaign_uploads_disabled && user?.role !== 'admin'

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      await campaigns.uploadFile(campaign.id, file)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  // --- Drag and drop (owner only) ---
  const onDragStart = (e, resource) => {
    dragId.current = resource.id
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDropToGroup = async (group) => {
    const id = dragId.current
    dragId.current = null
    if (!id) return
    // Dropping onto a custom category sets category_id; onto a type group clears it.
    const target = group.custom ? group.key : ''
    const res = resources.find((r) => r.id === id)
    if (res && (res.category_id || '') !== target) {
      await setCategory(id, target)
    }
  }
  const onDropOnResource = async (e, target) => {
    e.preventDefault()
    e.stopPropagation()
    const id = dragId.current
    dragId.current = null
    if (!id || id === target.id) return
    // Reorder: place dragged before target, and adopt target's category.
    const dragged = resources.find((r) => r.id === id)
    if (dragged && (dragged.category_id || '') !== (target.category_id || '')) {
      await campaigns.updateResource(campaign.id, id, { category_id: target.category_id || '' })
    }
    const ids = resources.map((r) => r.id).filter((x) => x !== id)
    const idx = ids.indexOf(target.id)
    ids.splice(idx, 0, id)
    await campaigns.reorderResources(campaign.id, ids)
    load()
  }

  if (!resources)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spinner size={24} />
      </div>
    )

  const linkedIds = new Set(resources.map((r) => `${r.resource_type}:${r.resource_id}`))
  const catById = new Map(categories.map((c) => [c.id, c]))

  const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order)
  const groups = []
  for (const cat of sortedCats) {
    const items = resources.filter((r) => r.category_id === cat.id)
    groups.push({ key: cat.id, label: cat.name, custom: true, icon: cat.icon, items })
  }
  for (const type of Object.keys(TYPE_ICONS)) {
    const items = resources.filter(
      (r) => r.resource_type === type && (!r.category_id || !catById.has(r.category_id))
    )
    if (items.length) groups.push({ key: type, label: TYPE_LABELS[type], type, items })
  }
  const visibleGroups = groups.filter((g) => g.items.length > 0 || g.custom)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <LuBookOpen size={15} /> {t('resources.title')}
        </h3>
        {isOwner && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setManagingCats(true)} style={panelHeaderBtn}>
              <LuFolderCog size={14} /> {t('resources.manageCategories')}
            </button>
            {!uploadDisabled && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={panelHeaderBtn}
              >
                <LuUpload size={14} />{' '}
                {uploading ? t('resources.uploading') : t('resources.uploadFile')}
              </button>
            )}
            <button onClick={() => setAdding(!adding)} style={panelHeaderBtn}>
              <LuPlus size={14} /> {t('resources.linkResource')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {adding && isOwner && (
        <ResourcePicker
          campaignId={campaign.id}
          linkedIds={linkedIds}
          onAdd={() => load()}
          onClose={() => setAdding(false)}
        />
      )}

      {resources.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <LuBookOpen size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
          <div style={{ fontSize: 14 }}>{t('resources.noResources')}</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {visibleGroups.map((g) => {
            const TypeIcon = g.type ? TYPE_ICONS[g.type].Icon : LuFolder
            return (
              <section
                key={g.key}
                onDragOver={isOwner ? (e) => e.preventDefault() : undefined}
                onDrop={isOwner ? () => onDropToGroup(g) : undefined}
                style={{ marginBottom: 4 }}
              >
                <h4
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CampaignIcon name={g.icon} fallback={TypeIcon} size={12} /> {g.label} (
                  {g.items.length})
                </h4>
                {g.items.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      padding: '8px 12px',
                      border: '1px dashed var(--border)',
                      borderRadius: 8,
                    }}
                  >
                    {t('resources.emptyCategory')}
                  </div>
                ) : (
                  g.items.map((r) => (
                    <div
                      key={r.id}
                      onDragOver={isOwner ? (e) => e.preventDefault() : undefined}
                      onDrop={isOwner ? (e) => onDropOnResource(e, r) : undefined}
                    >
                      <ResourceRow
                        campaignId={campaign.id}
                        resource={r}
                        isOwner={isOwner}
                        isGmCampaign={isGmCampaign}
                        members={members}
                        categories={categories}
                        onRemove={remove}
                        onSetVisibility={setVisibility}
                        onSetShares={setShares}
                        onSetCategory={setCategory}
                        onDragStart={onDragStart}
                      />
                    </div>
                  ))
                )}
              </section>
            )
          })}
        </div>
      )}

      {managingCats && (
        <CategoryManager
          campaignId={campaign.id}
          kind="resource"
          onClose={() => setManagingCats(false)}
          onChanged={() => {
            loadCategories()
            load()
          }}
        />
      )}
    </div>
  )
}

const selectStyle = {
  appearance: 'auto',
  fontSize: 12,
  padding: '3px 6px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-dim)',
  cursor: 'pointer',
}
const panelHeaderBtn = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 12px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  fontSize: 13,
}
