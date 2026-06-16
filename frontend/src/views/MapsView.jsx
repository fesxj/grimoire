import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSessionState from '../hooks/useSessionState'
import { useTranslation } from 'react-i18next'
import { LuMap, LuX, LuListChecks, LuSearch, LuHeart } from 'react-icons/lu'
import api from '../api'
import Spinner from '../components/Spinner'
import MapFolderGroup from '../components/maps/MapCreatorGroup'
import DownloadArchiveModal from '../components/DownloadArchiveModal'
import BulkActionBar from '../components/BulkActionBar'
import AddToCampaignModal from '../components/AddToCampaignModal'
import BulkEditModal from '../components/BulkEditModal'
import useBulkSelection from '../hooks/useBulkSelection'
import { getUserPrefs } from '../hooks/useUserPrefs'
import useViewMode from '../hooks/useViewMode'
import ViewModeToggle from '../components/ViewModeToggle'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'

const getFolderPath = (m) => {
  const parts = (m.relative_path || '').replace(/\\/g, '/').split('/')
  return parts.slice(1, -1).join('/')
}

const getTopFolder = (m) => {
  const parts = (m.relative_path || '').replace(/\\/g, '/').split('/')
  return parts.length > 2 ? parts[1] : '(Root)'
}

const getSubPath = (m) => {
  const parts = (m.relative_path || '').replace(/\\/g, '/').split('/')
  return parts.slice(2, -1).join('/')
}

export default function MapsView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isFavorite } = useFavorites()
  const isPlayer = user?.role === 'player'
  const [maps, setMaps] = useState(null)
  const [folderTags, setFolderTags] = useState({})
  const [filter, setFilter] = useState('')
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [favOnly, setFavOnly] = useState(false)
  const [viewMode, cycleViewMode] = useViewMode('map')
  const [collapsed, setCollapsed] = useSessionState('grimoire:maps:collapsed', new Set())
  const [editingFolder, setEditingFolder] = useState(null)
  const [showAllTags, setShowAllTags] = useState(false)
  const [downloadModal, setDownloadModal] = useState(null)

  // Bulk multiselect
  const bulk = useBulkSelection()
  const { bulkMode, selectedIds: selectedMapIds, selectedFolderPaths, count: totalSelected } = bulk
  const [bulkApplying, setBulkApplying] = useState(false)
  const [showAddToCampaign, setShowAddToCampaign] = useState(false)
  const [showBulkEdit, setShowBulkEdit] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/maps'), api.get('/map-folders')]).then(([mapsData, foldersData]) => {
      setMaps(mapsData)
      const ft = {}
      for (const f of foldersData.folders) ft[f.path] = f.tags
      setFolderTags(ft)
      // Only set default collapsed state (all collapsed) when no saved state exists.
      const hasSaved = sessionStorage.getItem('grimoire:maps:collapsed') !== null
      if (!hasSaved) {
        const keys = new Set()
        mapsData.maps.forEach((m) => {
          const folder = getTopFolder(m)
          const subPath = getSubPath(m)
          keys.add(folder)
          if (subPath) keys.add(`${folder}::${subPath}`)
        })
        setCollapsed(keys)
      }
    })
  }, [])

  const toggle = (key) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const saveFolderTags = async (path, tags) => {
    await api.patch('/map-folders', { path, tags })
    setFolderTags((prev) => ({ ...prev, [path]: tags }))
  }

  const applyBulkTags = async (newTags) => {
    if (!newTags.length || totalSelected === 0 || bulkApplying) return
    setBulkApplying(true)
    const promises = []

    for (const id of selectedMapIds) {
      const map = maps.maps.find((m) => m.id === id)
      if (!map) continue
      const merged = [...new Set([...(map.tags || []), ...newTags])]
      promises.push(api.patch(`/maps/${id}`, { tags: merged }))
    }

    for (const path of selectedFolderPaths) {
      const existing = folderTags[path] || []
      const merged = [...new Set([...existing, ...newTags])]
      promises.push(
        api
          .patch('/map-folders', { path, tags: merged })
          .then(() => setFolderTags((prev) => ({ ...prev, [path]: merged })))
      )
    }

    await Promise.all(promises)

    setMaps((prev) => ({
      ...prev,
      maps: prev.maps.map((m) => {
        if (!selectedMapIds.has(m.id)) return m
        return { ...m, tags: [...new Set([...(m.tags || []), ...newTags])] }
      }),
    }))

    bulk.clear()
    setBulkApplying(false)
  }

  // Objects (not just ids) for the selected maps, for the bulk-edit modal.
  const selectedMapObjects = () => maps.maps.filter((m) => selectedMapIds.has(m.id))

  // Apply edited fields from the bulk-edit modal back into local state.
  const applyMapEdits = (edited) =>
    setMaps((prev) => ({
      ...prev,
      maps: prev.maps.map((m) => (edited[m.id] ? { ...m, ...edited[m.id] } : m)),
    }))

  if (!maps)
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spinner size={32} />
      </div>
    )

  const allTags = [
    ...new Set(
      maps.maps.flatMap((m) =>
        [...(m.tags || []), ...(folderTags[getFolderPath(m)] || [])].map((t) => t.toLowerCase())
      )
    ),
  ].sort()

  const toggleTag = (tag) =>
    setSelectedTags((prev) => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })

  const filtered = maps.maps.filter((m) => {
    const q = filter.toLowerCase()
    const textMatch =
      !filter ||
      m.filename.toLowerCase().includes(q) ||
      getTopFolder(m).toLowerCase().includes(q) ||
      getSubPath(m).toLowerCase().includes(q) ||
      (m.tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
      (folderTags[getFolderPath(m)] || []).some((tag) => tag.toLowerCase().includes(q))
    const tagMatch =
      selectedTags.size === 0 ||
      (() => {
        const mapTagSet = new Set((m.tags || []).map((t) => t.toLowerCase()))
        const folderTagSet = new Set(
          (folderTags[getFolderPath(m)] || []).map((t) => t.toLowerCase())
        )
        return [...selectedTags].some((tag) => mapTagSet.has(tag) || folderTagSet.has(tag))
      })()
    const favMatch = !favOnly || isFavorite('map', m.id)
    return textMatch && tagMatch && favMatch
  })

  const byFolder = {}
  filtered.forEach((m) => {
    const folder = getTopFolder(m)
    const subPath = getSubPath(m)
    if (!byFolder[folder]) byFolder[folder] = {}
    if (!byFolder[folder][subPath]) byFolder[folder][subPath] = []
    byFolder[folder][subPath].push(m)
  })

  const prefs = getUserPrefs()
  const list = viewMode === 'list'
  const cardSize = viewMode === 'compact' ? 'compact' : 'comfortable'
  const sort = prefs.librarySort || 'az'
  const folderEntries = Object.entries(byFolder).sort(([a], [b]) =>
    sort === 'za' ? b.localeCompare(a) : a.localeCompare(b)
  )
  // Flat ordered list of visible map ids, for shift-range selection.
  const orderedIds = folderEntries.flatMap(([, subfolders]) =>
    Object.values(subfolders).flatMap((ms) => ms.map((m) => m.id))
  )
  const toggleMapSelect = (id, mods = {}) => bulk.toggleItem(id, { ...mods, orderedIds })

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
    >
      <div
        style={{
          padding: '32px 40px',
          maxWidth: 1400,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          flex: 1,
        }}
      >
        <div
          style={{
            marginBottom: 32,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 8 }}>{t('maps.title')}</h2>
            <p
              style={{
                color: 'var(--text-dim)',
                fontSize: 17,
                fontFamily: 'Alegreya, serif',
                fontStyle: 'italic',
              }}
            >
              {t('maps.subtitle', { count: maps.total })}
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 8,
              minWidth: 0,
            }}
          >
            {!bulkMode && (
              <div style={{ position: 'relative' }}>
                <LuSearch
                  size={13}
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
                  id="maps-filter"
                  type="text"
                  placeholder={t('maps.filterPlaceholder')}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  aria-label={t('maps.filterAriaLabel')}
                  style={{
                    width: '100%',
                    fontSize: 13,
                    padding: '6px 28px 6px 30px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    boxSizing: 'border-box',
                  }}
                />
                {filter && (
                  <button
                    onClick={() => setFilter('')}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      padding: 0,
                    }}
                  >
                    <LuX size={12} />
                  </button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {(() => {
                const allKeys = new Set()
                folderEntries.forEach(([folder, subfolders]) => {
                  allKeys.add(folder)
                  Object.keys(subfolders)
                    .filter((s) => s)
                    .forEach((s) => allKeys.add(`${folder}::${s}`))
                })
                const allCollapsed =
                  folderEntries.length > 0 && [...allKeys].every((k) => collapsed.has(k))
                const allExpanded = collapsed.size === 0
                const noFolders = folderEntries.length === 0
                return (
                  <>
                    <button
                      onClick={() => setCollapsed(allKeys)}
                      disabled={noFolders || bulkMode || allCollapsed}
                      style={{
                        ...toolBtnStyle,
                        opacity: noFolders || bulkMode || allCollapsed ? 0.4 : 1,
                      }}
                    >
                      {t('common.collapseAll')}
                    </button>
                    <button
                      onClick={() => setCollapsed(new Set())}
                      disabled={noFolders || bulkMode || allExpanded}
                      style={{
                        ...toolBtnStyle,
                        opacity: noFolders || bulkMode || allExpanded ? 0.4 : 1,
                      }}
                    >
                      {t('common.expandAll')}
                    </button>
                  </>
                )
              })()}
              {!isPlayer && (
                <button
                  onClick={bulkMode ? bulk.exit : bulk.enter}
                  style={{
                    ...toolBtnStyle,
                    color: bulkMode ? 'var(--gold)' : 'var(--text-dim)',
                    outline: bulkMode ? '1px solid var(--gold-dim)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <LuListChecks size={13} />
                  {bulkMode ? t('maps.cancelBulk') : t('common.select')}
                </button>
              )}
              <ViewModeToggle mode={viewMode} onCycle={cycleViewMode} style={toolBtnStyle} />
              <button
                onClick={() => setFavOnly((v) => !v)}
                aria-pressed={favOnly}
                title={t('favorites.onlyFavorites')}
                style={{
                  ...toolBtnStyle,
                  color: favOnly ? 'var(--gold)' : 'var(--text-muted)',
                  background: favOnly ? 'rgba(180,120,60,0.15)' : 'var(--bg-card)',
                  outline: favOnly ? '1px solid var(--gold-dim)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <LuHeart size={13} fill={favOnly ? 'var(--gold)' : 'none'} />
                {t('favorites.onlyFavorites')}
              </button>
            </div>
          </div>
        </div>

        {!bulkMode && allTags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 24,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>
              {t('common.tags')}
            </span>
            {(showAllTags ? allTags : allTags.slice(0, 15)).map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  fontSize: 13,
                  padding: '3px 10px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: 'none',
                  background: selectedTags.has(tag) ? 'rgba(201,168,76,0.2)' : 'var(--tag-bg)',
                  color: selectedTags.has(tag) ? 'var(--gold)' : 'var(--text-dim)',
                  outline: selectedTags.has(tag)
                    ? '1px solid var(--gold-dim)'
                    : '1px solid var(--tag-border)',
                }}
              >
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </button>
            ))}
            {allTags.length > 15 && (
              <button
                onClick={() => setShowAllTags((v) => !v)}
                style={{
                  fontSize: 12,
                  padding: '3px 8px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: 'none',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                {showAllTags
                  ? t('common.showLess')
                  : t('common.showMore', { count: allTags.length - 15 })}
              </button>
            )}
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                style={{
                  fontSize: 12,
                  padding: '3px 8px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <LuX size={11} /> {t('common.clear')}
              </button>
            )}
          </div>
        )}

        {bulkMode && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('bulk.hint')}
          </p>
        )}

        {folderEntries.map(([folder, subfolders]) => (
          <MapFolderGroup
            key={folder}
            folder={folder}
            subfolders={subfolders}
            cardSize={cardSize}
            list={list}
            collapsed={collapsed}
            onToggle={toggle}
            folderTags={folderTags}
            editingFolder={isPlayer ? null : editingFolder}
            onSetEditingFolder={isPlayer ? () => {} : setEditingFolder}
            onSaveFolderTags={isPlayer ? () => {} : saveFolderTags}
            canTag={!isPlayer}
            onSelectMap={(id) => navigate(`/maps/${id}`)}
            bulkMode={bulkMode}
            selectedMapIds={selectedMapIds}
            selectedFolderPaths={selectedFolderPaths}
            onToggleMap={toggleMapSelect}
            onToggleFolder={bulk.toggleFolder}
            onDownload={setDownloadModal}
          />
        ))}

        {folderEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <LuMap size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p>
              {favOnly
                ? t('favorites.noFavoritesInView')
                : filter
                  ? t('maps.noMapsFilter')
                  : t('maps.noMaps')}
            </p>
          </div>
        )}
      </div>

      {downloadModal && (
        <DownloadArchiveModal
          title={downloadModal.title}
          params={downloadModal.params}
          onClose={() => setDownloadModal(null)}
        />
      )}

      {bulkMode && (
        <BulkActionBar
          count={totalSelected}
          applying={bulkApplying}
          onApplyTags={applyBulkTags}
          onAddToCampaign={() => setShowAddToCampaign(true)}
          onBulkEdit={() => setShowBulkEdit(true)}
          onDone={bulk.exit}
        />
      )}

      {showAddToCampaign && (
        <AddToCampaignModal
          items={selectedMapObjects().map((m) => ({ resource_type: 'map', resource_id: m.id }))}
          onClose={() => setShowAddToCampaign(false)}
          onAdded={() => {
            setShowAddToCampaign(false)
            bulk.exit()
          }}
        />
      )}

      {showBulkEdit && (
        <BulkEditModal
          type="map"
          items={selectedMapObjects()}
          onClose={() => setShowBulkEdit(false)}
          onSaved={(edited) => {
            applyMapEdits(edited)
            setShowBulkEdit(false)
            bulk.exit()
          }}
        />
      )}
    </div>
  )
}

const toolBtnStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  fontSize: 13,
  background: 'var(--bg-card)',
  color: 'var(--text-dim)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
}
