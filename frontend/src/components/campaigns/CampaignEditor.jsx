import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LuX,
  LuSearch,
  LuBookOpen,
  LuMap,
  LuUser,
  LuTrash2,
  LuChevronLeft,
  LuChevronDown,
  LuChevronRight,
  LuImagePlus,
} from 'react-icons/lu'
import api, { campaigns } from '../../api'
import ScheduleEditor from './ScheduleEditor'
import Spinner from '../Spinner'
import { utcTimeToLocal, USER_TZ } from './_scheduleShared'
import { useFavorites } from '../../context/FavoritesContext'

const TYPE_ICON = { book: LuBookOpen, map: LuMap, token: LuUser }

function resourceKey(r) {
  return `${r.resource_type}:${r.resource_id}`
}

const RESOURCE_TYPES = ['', 'book', 'map', 'token']

// One collapsible folder/category section in the resource browser.
function ResourceGroup({ groupKey, label, Icon, rows, open, onToggle, selectedKeys, toggleRow }) {
  const selectedCount = rows.filter((r) => selectedKeys.has(resourceKey(r))).length
  return (
    <div style={resGroup}>
      <button type="button" onClick={() => onToggle(groupKey)} style={resGroupHeader}>
        {open ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        <Icon size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', ...ellipsis }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
          {selectedCount > 0 ? `${selectedCount}/${rows.length}` : rows.length}
        </span>
      </button>
      {open && (
        <div>
          {rows.map((r) => {
            const checked = selectedKeys.has(resourceKey(r))
            return (
              <label key={resourceKey(r)} style={resRow(checked)}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRow(r)}
                  style={{ width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ flex: 1, minWidth: 0, ...ellipsis }}>{r.name}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ResourcePickerStep({ systemId, selected, setSelected }) {
  const { t } = useTranslation()
  // All available resources (loaded once), grouped client-side by folder/category.
  const [all, setAll] = useState(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [openGroups, setOpenGroups] = useState(() => new Set())

  // Load the campaign system's books plus every map and token, once. Empty query
  // returns the full set per type; we group and filter locally for a snappy,
  // folder-style browser without per-keystroke requests.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      campaigns.searchResources('', 'book', systemId || '', 1000),
      campaigns.searchResources('', 'map', '', 1000),
      campaigns.searchResources('', 'token', '', 1000),
    ])
      .then(([books, maps, tokens]) => {
        if (cancelled) return
        setAll([...(books || []), ...(maps || []), ...(tokens || [])])
      })
      .catch(() => !cancelled && setAll([]))
    return () => {
      cancelled = true
    }
  }, [systemId])

  // Pre-select core books for the campaign's system the first time resources load.
  useEffect(() => {
    if (!all || !systemId) return
    setSelected((prev) => {
      if (prev.length > 0) return prev
      return all
        .filter((r) => r.resource_type === 'book' && r.subtitle === 'core')
        .map((r) => ({
          resource_type: r.resource_type,
          resource_id: r.resource_id,
          name: r.name,
          visibility: 'public',
        }))
    })
  }, [all, systemId, setSelected])

  const selectedKeys = new Set(selected.map(resourceKey))

  const toggleRow = (r) => {
    setSelected((prev) => {
      const key = resourceKey(r)
      if (prev.some((s) => resourceKey(s) === key)) {
        return prev.filter((s) => resourceKey(s) !== key)
      }
      return [
        ...prev,
        {
          resource_type: r.resource_type,
          resource_id: r.resource_id,
          name: r.name,
          visibility: 'public',
        },
      ]
    })
  }

  const setVisibility = (r, visibility) =>
    setSelected((prev) =>
      prev.map((s) => (resourceKey(s) === resourceKey(r) ? { ...s, visibility } : s))
    )

  const q = query.trim().toLowerCase()

  // Filter by type tab + search, then group by resource_type + subtitle (the
  // book category or the map/token folder path).
  const groups = []
  if (all) {
    const byKey = new Map()
    for (const r of all) {
      if (typeFilter && r.resource_type !== typeFilter) continue
      if (q && !r.name.toLowerCase().includes(q) && !(r.subtitle || '').toLowerCase().includes(q))
        continue
      const folder = r.subtitle || t('campaignEditor.resources.ungrouped')
      const groupKey = `${r.resource_type}:::${folder}`
      if (!byKey.has(groupKey)) {
        byKey.set(groupKey, {
          groupKey,
          type: r.resource_type,
          label: folder,
          Icon: TYPE_ICON[r.resource_type] || LuBookOpen,
          rows: [],
        })
      }
      byKey.get(groupKey).rows.push(r)
    }
    // Books first, then maps, then tokens; folders alphabetical within a type.
    const order = { book: 0, map: 1, token: 2 }
    groups.push(
      ...[...byKey.values()].sort(
        (a, b) => order[a.type] - order[b.type] || a.label.localeCompare(b.label)
      )
    )
  }

  // While searching, expand every matching group so hits are visible.
  const isOpen = (key) => (q ? true : openGroups.has(key))
  const toggleGroup = (key) =>
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 12 }}>
        {t('campaignEditor.resources.intro')}
      </p>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {RESOURCE_TYPES.map((type) => (
          <button
            key={type || 'all'}
            type="button"
            onClick={() => setTypeFilter(type)}
            style={typeTab(typeFilter === type)}
          >
            {t(`campaignEditor.resources.type_${type || 'all'}`)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('campaignEditor.resources.searchPlaceholder')}
          style={{ ...inputStyle, paddingLeft: 32 }}
        />
      </div>

      {/* Folder browser */}
      <div style={browserBox}>
        {all === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spinner size={18} />
          </div>
        ) : groups.length === 0 ? (
          <div style={resultEmpty}>{t('common.noResults')}</div>
        ) : (
          groups.map((g) => (
            <ResourceGroup
              key={g.groupKey}
              groupKey={g.groupKey}
              label={g.label}
              Icon={g.Icon}
              rows={g.rows}
              open={isOpen(g.groupKey)}
              onToggle={toggleGroup}
              selectedKeys={selectedKeys}
              toggleRow={toggleRow}
            />
          ))
        )}
      </div>

      {/* Selected summary with inline visibility */}
      <div style={{ marginTop: 14 }}>
        <div style={sectionLabel}>
          {t('campaignEditor.resources.selectedCount', { count: selected.length })}
        </div>
        {selected.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {selected.map((r) => {
              const Icon = TYPE_ICON[r.resource_type] || LuBookOpen
              return (
                <div key={resourceKey(r)} style={selectedRow}>
                  <Icon size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                  <span style={{ flex: 1, fontSize: 13, ...ellipsis }}>{r.name}</span>
                  <select
                    value={r.visibility}
                    onChange={(e) => setVisibility(r, e.target.value)}
                    aria-label={t('campaignEditor.resources.visibilityLabel')}
                    style={visibilitySelect}
                  >
                    <option value="public">{t('resources.vis_public')}</option>
                    <option value="private">{t('resources.vis_private')}</option>
                    <option value="gm">{t('resources.vis_gm')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => toggleRow(r)}
                    aria-label={t('common.remove')}
                    style={iconBtn('var(--danger)')}
                  >
                    <LuTrash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// A small on/off switch styled to match the app's gold accent.
function ToggleSwitch({ checked, onChange, label, id }) {
  return (
    <label
      htmlFor={id}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
    >
      <span style={{ position: 'relative', width: 38, height: 22, flexShrink: 0 }}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 22,
            background: checked ? 'var(--gold)' : 'var(--bg-deep)',
            border: '1px solid var(--border)',
            transition: 'background 0.15s',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: checked ? '#1a1209' : 'var(--text-muted)',
            transition: 'left 0.15s',
          }}
        />
      </span>
      {label}
    </label>
  )
}

// Schedule recurrence setup for the edit modal (no availability chart — that
// stays on the overview). A toggle enables/disables the schedule (disabling
// preserves the definition); when enabled, shows a summary with an Edit button
// or the editor itself.
function ScheduleSetup({ campaign, onChanged }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [editing, setEditing] = useState(false)
  const [togglingEnabled, setTogglingEnabled] = useState(false)

  useEffect(() => {
    campaigns
      .getSchedule(campaign.id)
      .then(setData)
      .catch(() => setData({ definition: null, enabled: false }))
  }, [campaign.id])

  if (!data)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
        <Spinner size={18} />
      </div>
    )

  const def = data.definition
  const enabled = !!data.enabled

  // Flip the enabled flag while keeping the existing definition. With no
  // definition yet there's nothing to persist — just reveal the editor so the
  // GM can fill one in.
  const toggleEnabled = async (next) => {
    if (!def) {
      setData((d) => ({ ...d, enabled: next }))
      return
    }
    setTogglingEnabled(true)
    try {
      const result = await campaigns.setSchedule(campaign.id, { ...def, enabled: next })
      setData(result)
      onChanged?.()
    } catch {
      /* leave the toggle as-is on failure */
    } finally {
      setTogglingEnabled(false)
    }
  }

  const toggle = (
    <ToggleSwitch
      id="schedule-enabled"
      checked={enabled}
      onChange={togglingEnabled ? () => {} : toggleEnabled}
      label={
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          {enabled ? t('campaignEditor.scheduleEnabled') : t('campaignEditor.scheduleDisabled')}
        </span>
      }
    />
  )

  // Disabled: keep the definition, but collapse the editor.
  if (!enabled) {
    return <div style={{ paddingTop: 2 }}>{toggle}</div>
  }

  if (!def || editing) {
    return (
      <div>
        <div style={{ marginBottom: 12 }}>{toggle}</div>
        <ScheduleEditor
          campaign={campaign}
          existing={editing && def ? def : null}
          onSaved={(result) => {
            setData(result)
            setEditing(false)
            onChanged?.()
          }}
          onDeleted={() => {
            setData({ definition: null, enabled: false })
            setEditing(false)
            onChanged?.()
          }}
        />
      </div>
    )
  }

  const FREQ = {
    weekly: t('schedule.frequency.weekly'),
    biweekly: t('schedule.frequency.biweekly'),
    monthly: t('schedule.frequency.monthly'),
    custom: t('schedule.frequency.custom'),
  }
  const DAY_NAMES = [
    t('schedule.days.monday'),
    t('schedule.days.tuesday'),
    t('schedule.days.wednesday'),
    t('schedule.days.thursday'),
    t('schedule.days.friday'),
    t('schedule.days.saturday'),
    t('schedule.days.sunday'),
  ]
  let pattern = ''
  if (def.frequency === 'custom') {
    pattern = t('campaignDetail.overview.customDates', { count: def.custom_dates?.length ?? 0 })
  } else if (def.frequency === 'monthly') {
    const WEEKS = {
      1: t('schedule.weeks.1st'),
      2: t('schedule.weeks.2nd'),
      3: t('schedule.weeks.3rd'),
      4: t('schedule.weeks.4th'),
      '-1': t('schedule.weeks.last'),
    }
    pattern = t('schedule.monthlyPattern', {
      week: WEEKS[String(def.monthly_week)] ?? '',
      day: DAY_NAMES[def.days?.[0]] ?? '',
    })
  } else {
    pattern = (def.days ?? []).map((d) => DAY_NAMES[d]).join(' & ')
  }
  const localTime = utcTimeToLocal(def.time_utc)

  return (
    <div>
      <div style={{ marginBottom: 12 }}>{toggle}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 14px',
          background: 'var(--bg-deep)',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        <div style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>
            {FREQ[def.frequency] ?? def.frequency}
            {pattern ? ` — ${pattern}` : ''}
          </div>
          {localTime && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {localTime} ({USER_TZ})
            </div>
          )}
        </div>
        <button type="button" onClick={() => setEditing(true)} style={cancelBtn}>
          {t('schedule.edit')}
        </button>
      </div>
    </div>
  )
}

const CUSTOM_SYSTEM = '__custom__'

export default function CampaignEditor({
  campaign,
  isGmOrAdmin,
  onClose,
  onSaved,
  onDelete,
  onScheduleChanged,
}) {
  const { t } = useTranslation()
  const { isFavorite } = useFavorites()
  const isEdit = !!campaign

  const [step, setStep] = useState(0) // 0 = details, 1 = resources (create only)
  const [form, setForm] = useState({
    name: campaign?.name ?? '',
    description: campaign?.description ?? '',
    is_gm_campaign: campaign?.is_gm_campaign ?? false,
    gm_title: campaign?.gm_title ?? 'Game Master',
    // CUSTOM_SYSTEM when the campaign uses a free-text system name.
    system_id: campaign?.system_id ?? (campaign?.system_name ? CUSTOM_SYSTEM : ''),
    system_name: campaign?.system_name ?? '',
    parent_campaign_id: campaign?.parent_campaign_id ?? '',
  })
  const [selectedResources, setSelectedResources] = useState([])
  const [bannerFile, setBannerFile] = useState(null)
  const bannerInputRef = useRef(null)
  const [systems, setSystems] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/systems')
      .then((data) => setSystems(data || []))
      .catch(() => {})
  }, [])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  // Split the form's system choice into the two backend fields.
  const systemFields = () => {
    if (form.system_id === CUSTOM_SYSTEM) {
      return { system_id: null, system_name: form.system_name.trim() || null }
    }
    return { system_id: form.system_id || null, system_name: '' }
  }

  const create = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        gm_title: form.gm_title || 'Game Master',
        ...systemFields(),
        parent_campaign_id: form.parent_campaign_id || null,
        is_gm_campaign: form.is_gm_campaign,
        resources: selectedResources.map((r) => ({
          resource_type: r.resource_type,
          resource_id: r.resource_id,
          visibility: r.visibility,
        })),
      }
      const result = await campaigns.create(payload)
      // Upload the optional banner now that the campaign exists.
      if (bannerFile) {
        try {
          await campaigns.uploadBanner(result.id, bannerFile)
          result.has_banner = true
        } catch {
          /* non-fatal — the campaign was created */
        }
      }
      onSaved(result)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        gm_title: form.gm_title || 'Game Master',
        ...systemFields(),
        parent_campaign_id: form.parent_campaign_id || null,
      }
      const result = await campaigns.update(campaign.id, payload)
      onSaved(result)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const next = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t('campaignEditor.nameRequired'))
      return
    }
    setError(null)
    setStep(1)
  }

  const submitDetails = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t('campaignEditor.nameRequired'))
      return
    }
    saveEdit()
  }

  const showGmTitle = form.is_gm_campaign || (isEdit && campaign?.is_gm_campaign)

  // Group systems for the dropdown: favorited first, then the full list.
  const favoriteSystems = systems.filter((s) => isFavorite('system', s.id))

  const detailsStep = (
    <>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="campaign-name" style={labelStyle}>
          {t('campaignEditor.nameLabel')}
        </label>
        <input
          id="campaign-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={t('campaignEditor.namePlaceholder')}
          style={inputStyle}
          autoFocus
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="campaign-description" style={labelStyle}>
          {t('campaignEditor.descriptionLabel')}
        </label>
        <textarea
          id="campaign-description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder={t('campaignEditor.descriptionPlaceholder')}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {t('campaignEditor.descriptionMarkdownHint')}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="campaign-system" style={labelStyle}>
          {t('campaignEditor.systemLabel')}
        </label>
        <select
          id="campaign-system"
          value={form.system_id}
          onChange={(e) => set('system_id', e.target.value)}
          style={{ ...inputStyle, appearance: 'auto' }}
        >
          <option value="">{t('campaignEditor.systemNone')}</option>
          <option value={CUSTOM_SYSTEM}>{t('campaignEditor.systemCustom')}</option>
          {favoriteSystems.length > 0 && (
            <optgroup label={t('campaignEditor.systemGroupFavorites')}>
              {favoriteSystems.map((s) => (
                <option key={`fav-${s.id}`} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={t('campaignEditor.systemGroupAll')}>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </select>
        {form.system_id === CUSTOM_SYSTEM && (
          <input
            value={form.system_name}
            onChange={(e) => set('system_name', e.target.value)}
            placeholder={t('campaignEditor.systemCustomPlaceholder')}
            style={{ ...inputStyle, marginTop: 8 }}
            autoFocus
          />
        )}
      </div>

      {!isEdit && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t('campaignEditor.bannerLabel')}</label>
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              background: 'var(--bg-deep)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            <LuImagePlus size={14} />
            {bannerFile ? bannerFile.name : t('campaignEditor.bannerChoose')}
          </button>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {t('campaignDetail.banner.suggestedSize')}
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {showGmTitle && (
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="campaign-gm-title" style={labelStyle}>
            {t('campaignEditor.gmTitleLabel')}
          </label>
          <input
            id="campaign-gm-title"
            value={form.gm_title}
            onChange={(e) => set('gm_title', e.target.value)}
            placeholder={t('campaignEditor.gmTitlePlaceholder')}
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {t('campaignEditor.gmTitleHint')}
          </div>
        </div>
      )}

      {!isEdit && isGmOrAdmin && (
        <div style={{ marginBottom: 16, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <label
            htmlFor="campaign-is-gm"
            style={{
              ...labelStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              marginTop: 12,
            }}
          >
            <input
              id="campaign-is-gm"
              type="checkbox"
              checked={form.is_gm_campaign}
              onChange={(e) => set('is_gm_campaign', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            {t('campaignEditor.gmCampaignCheckbox')}
          </label>
        </div>
      )}
    </>
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 520,
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          <LuX size={18} />
        </button>

        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          {isEdit
            ? t('campaignEditor.titleEdit')
            : step === 0
              ? t('campaignEditor.titleNew')
              : t('campaignEditor.resources.title')}
        </h3>
        {!isEdit && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('campaignEditor.stepIndicator', { current: step + 1, total: 2 })}
          </div>
        )}
        {isEdit && <div style={{ marginBottom: 16 }} />}

        {/* Edit: single step. Create: stepped. */}
        {isEdit ? (
          <>
            {/* The details form submits on Enter; its own submit handler saves. */}
            <form onSubmit={submitDetails}>
              {detailsStep}
              {/* Hidden submit lets Enter save while the visible action buttons
                  live below the schedule section. */}
              <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
            </form>

            {/* Schedule setup (GM campaigns only) lives here rather than on the
                overview, positioned just above the action buttons. */}
            {campaign?.is_gm_campaign && (
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                <div style={{ ...labelStyle, marginBottom: 10 }}>
                  {t('campaignEditor.scheduleLabel')}
                </div>
                <ScheduleSetup campaign={campaign} onChanged={onScheduleChanged} />
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, margin: '16px 0 12px' }}>
                {error}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                marginTop: 20,
                paddingTop: 18,
                borderTop: '1px solid var(--border)',
              }}
            >
              {onDelete && (
                <button type="button" onClick={onDelete} disabled={saving} style={deleteBtn}>
                  <LuTrash2 size={14} /> {t('campaignEditor.delete')}
                </button>
              )}
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                <button type="button" onClick={onClose} style={cancelBtn}>
                  {t('campaignEditor.cancel')}
                </button>
                <button type="button" onClick={submitDetails} disabled={saving} style={submitBtn}>
                  {saving ? t('campaignEditor.saving') : t('campaignEditor.saveChanges')}
                </button>
              </div>
            </div>
          </>
        ) : step === 0 ? (
          <form onSubmit={next}>
            {detailsStep}
            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={cancelBtn}>
                {t('campaignEditor.cancel')}
              </button>
              <button type="submit" style={submitBtn}>
                {t('campaignEditor.next')}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <ResourcePickerStep
              systemId={form.system_id}
              selected={selectedResources}
              setSelected={setSelectedResources}
            />
            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, margin: '12px 0' }}>{error}</div>
            )}
            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'space-between',
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep(0)
                }}
                style={{ ...cancelBtn, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <LuChevronLeft size={14} /> {t('campaignEditor.back')}
              </button>
              <button type="button" onClick={create} disabled={saving} style={submitBtn}>
                {saving ? t('campaignEditor.saving') : t('campaignEditor.createCampaign')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 13,
  color: 'var(--text-muted)',
  fontWeight: 500,
  display: 'block',
  marginBottom: 6,
}
const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 14,
  boxSizing: 'border-box',
}
const cancelBtn = {
  padding: '9px 18px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  fontSize: 14,
}
const submitBtn = {
  padding: '9px 18px',
  background: 'var(--gold)',
  border: 'none',
  borderRadius: 8,
  color: '#1a1209',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
}
const deleteBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 16px',
  // Match the "Remove missing files" button on Settings → Maintenance.
  background: 'rgba(180,60,60,0.15)',
  border: '1px solid rgba(180,60,60,0.5)',
  borderRadius: 8,
  color: '#e07070',
  cursor: 'pointer',
  fontSize: 14,
}
const sectionLabel = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  fontWeight: 600,
  marginBottom: 8,
}
const selectedRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 8,
}
const visibilitySelect = {
  appearance: 'auto',
  fontSize: 12,
  padding: '3px 6px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  flexShrink: 0,
}
const iconBtn = (color) => ({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color,
  display: 'flex',
  padding: 2,
  flexShrink: 0,
})
const resultEmpty = {
  fontSize: 13,
  color: 'var(--text-muted)',
  padding: '10px 12px',
}
const ellipsis = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
const browserBox = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg-deep)',
  maxHeight: 300,
  overflowY: 'auto',
}
const resGroup = {
  borderBottom: '1px solid var(--border)',
}
const resGroupHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 10px',
  background: 'none',
  border: 'none',
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
}
const resRow = (checked) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px 6px 30px',
  fontSize: 13,
  cursor: 'pointer',
  color: checked ? 'var(--text)' : 'var(--text-dim)',
  background: checked ? 'rgba(201,168,76,0.08)' : 'transparent',
})
const typeTab = (active) => ({
  flex: 1,
  padding: '5px 8px',
  fontSize: 12,
  borderRadius: 6,
  cursor: 'pointer',
  border: active ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
  background: active ? 'rgba(201,168,76,0.15)' : 'var(--bg-deep)',
  color: active ? 'var(--gold)' : 'var(--text-dim)',
})
