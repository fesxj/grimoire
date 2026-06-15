import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LuX,
  LuSearch,
  LuBookOpen,
  LuMap,
  LuUser,
  LuPlus,
  LuTrash2,
  LuChevronLeft,
  LuImagePlus,
} from 'react-icons/lu'
import api, { campaigns } from '../../api'
import ScheduleEditor from './ScheduleEditor'
import Spinner from '../Spinner'
import { utcTimeToLocal, USER_TZ } from './_scheduleShared'

const TYPE_ICON = { book: LuBookOpen, map: LuMap, token: LuUser }

function resourceKey(r) {
  return `${r.resource_type}:${r.resource_id}`
}

function ResourcePickerStep({ systemId, selected, setSelected }) {
  const { t } = useTranslation()
  const [suggested, setSuggested] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  // Load suggested resources for the chosen system and pre-select core books (shared).
  useEffect(() => {
    if (!systemId) {
      setSuggested([])
      return
    }
    campaigns
      .suggestedResources(systemId)
      .then((data) => {
        setSuggested(data || [])
        setSelected((prev) => {
          // Only seed defaults the first time (when nothing is selected yet).
          if (prev.length > 0) return prev
          return (data || [])
            .filter((r) => r.suggested)
            .map((r) => ({
              resource_type: r.resource_type,
              resource_id: r.resource_id,
              name: r.name,
              visibility: 'public',
            }))
        })
      })
      .catch(() => setSuggested([]))
  }, [systemId, setSelected])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    clearTimeout(debounceRef.current)
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      campaigns
        .searchResources(query.trim())
        .then((data) => setResults(data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const selectedKeys = new Set(selected.map(resourceKey))

  const add = (r) => {
    if (selectedKeys.has(resourceKey(r))) return
    setSelected((prev) => [
      ...prev,
      {
        resource_type: r.resource_type,
        resource_id: r.resource_id,
        name: r.name,
        visibility: 'public',
      },
    ])
  }

  const remove = (r) => {
    setSelected((prev) => prev.filter((s) => resourceKey(s) !== resourceKey(r)))
  }

  const setVisibility = (r, visibility) => {
    setSelected((prev) =>
      prev.map((s) => (resourceKey(s) === resourceKey(r) ? { ...s, visibility } : s))
    )
  }

  const suggestedUnselected = suggested.filter((r) => !selectedKeys.has(resourceKey(r)))

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 16 }}>
        {t('campaignEditor.resources.intro')}
      </p>

      {/* Selected resources */}
      <div style={{ marginBottom: 18 }}>
        <div style={sectionLabel}>{t('campaignEditor.resources.selected')}</div>
        {selected.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 0' }}>
            {t('campaignEditor.resources.none')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selected.map((r) => {
              const Icon = TYPE_ICON[r.resource_type] || LuBookOpen
              return (
                <div key={resourceKey(r)} style={selectedRow}>
                  <Icon size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.name}
                  </span>
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
                    onClick={() => remove(r)}
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

      {/* Search to add more */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
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
        {query.trim() && (
          <div style={resultsBox}>
            {searching ? (
              <div style={resultEmpty}>{t('common.loading')}</div>
            ) : results.length === 0 ? (
              <div style={resultEmpty}>{t('common.noResults')}</div>
            ) : (
              results.map((r) => {
                const Icon = TYPE_ICON[r.resource_type] || LuBookOpen
                const already = selectedKeys.has(resourceKey(r))
                return (
                  <button
                    type="button"
                    key={resourceKey(r)}
                    onClick={() => add(r)}
                    disabled={already}
                    style={resultRow(already)}
                  >
                    <Icon size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                    <span
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.name}
                    </span>
                    {!already && <LuPlus size={14} style={{ color: 'var(--gold)' }} />}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Suggested (system books) not yet selected */}
      {suggestedUnselected.length > 0 && (
        <div>
          <div style={sectionLabel}>{t('campaignEditor.resources.suggested')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestedUnselected.map((r) => (
              <button
                type="button"
                key={resourceKey(r)}
                onClick={() => add(r)}
                style={suggestedChip}
              >
                <LuPlus size={12} /> {r.name}
              </button>
            ))}
          </div>
        </div>
      )}
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
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={CUSTOM_SYSTEM}>{t('campaignEditor.systemCustom')}</option>
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
const resultsBox = {
  marginTop: 6,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg-deep)',
  maxHeight: 220,
  overflowY: 'auto',
}
const resultEmpty = {
  fontSize: 13,
  color: 'var(--text-muted)',
  padding: '10px 12px',
}
const resultRow = (disabled) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 12px',
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  color: disabled ? 'var(--text-muted)' : 'var(--text)',
  cursor: disabled ? 'default' : 'pointer',
  fontSize: 13,
})
const suggestedChip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 10px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  fontSize: 12,
}
