import { useState } from 'react'
import { LuCalendar, LuSave, LuTrash2, LuPlus, LuX } from 'react-icons/lu'
import { campaigns } from '../../api'
import {
  DAYS, MONTH_WEEKS, FREQ_OPTIONS,
  utcToLocalInputTime, localInputTimeToUtc,
  inputStyle, submitBtn, dangerBtn, addBtn,
  USER_TZ,
} from './_scheduleShared'

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

function TimePicker({ value, onChange }) {
  const [enabled, setEnabled] = useState(!!value)

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => { setEnabled(e.target.checked); if (!e.target.checked) onChange(null) }}
        />
        Set session time ({USER_TZ})
      </label>
      {enabled && (
        <>
          <input
            type="time"
            list="schedule-time-options"
            value={utcToLocalInputTime(value)}
            onChange={e => onChange(localInputTimeToUtc(e.target.value))}
            style={{ ...inputStyle, colorScheme: 'dark', accentColor: 'var(--gold)' }}
          />
          <datalist id="schedule-time-options">
            {TIME_OPTIONS.map(t => <option key={t} value={t} />)}
          </datalist>
        </>
      )}
    </div>
  )
}

export function SegmentControl({ value, options, onChange }) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg-deep)', borderRadius: 10, padding: 4, gap: 2 }}>
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          style={{
            flex: 1, padding: '7px 4px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500,
            border: 'none',
            background: value === o.key ? 'var(--bg-card)' : 'transparent',
            color: value === o.key ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: value === o.key ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function ScheduleEditor({ campaign, existing, onSaved, onDeleted }) {
  const [frequency, setFrequency] = useState(existing?.frequency ?? 'weekly')
  const [days, setDays] = useState(existing?.days ?? [])
  const [timeUtc, setTimeUtc] = useState(existing?.time_utc ?? null)
  const [biweeklyRef, setBiweeklyRef] = useState(existing?.biweekly_reference ?? '')
  const [monthlyWeek, setMonthlyWeek] = useState(existing?.monthly_week ?? 1)
  const [customDates, setCustomDates] = useState(existing?.custom_dates ?? [])
  const [newCustomDate, setNewCustomDate] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleDay = (d) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  const addCustomDate = () => {
    if (!newCustomDate || customDates.includes(newCustomDate)) return
    setCustomDates(prev => [...prev, newCustomDate].sort())
    setNewCustomDate('')
  }

  const removeCustomDate = (d) => setCustomDates(prev => prev.filter(x => x !== d))

  const save = async () => {
    if (frequency !== 'custom' && days.length === 0) { alert('Select at least one day.'); return }
    if (frequency === 'custom' && customDates.length === 0) { alert('Add at least one date.'); return }
    setSaving(true)
    try {
      const payload = {
        days,
        frequency,
        time_utc: timeUtc,
        biweekly_reference: frequency === 'biweekly' ? (biweeklyRef || new Date().toISOString().slice(0, 10)) : null,
        monthly_week: frequency === 'monthly' ? monthlyWeek : null,
        custom_dates: frequency === 'custom' ? customDates : null,
      }
      const result = await campaigns.setSchedule(campaign.id, payload)
      onSaved(result)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm('Remove the campaign schedule?')) return
    await campaigns.deleteSchedule(campaign.id)
    onDeleted()
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
      <div style={{ marginBottom: 18 }}>
        <SegmentControl value={frequency} options={FREQ_OPTIONS} onChange={setFrequency} />
      </div>

      {frequency !== 'custom' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            {frequency === 'monthly' ? 'Day of week' : 'Session Day(s)'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DAYS.map((d, i) => {
              const selected = frequency === 'monthly' ? days[0] === i : days.includes(i)
              return (
                <button
                  key={i}
                  onClick={() => frequency === 'monthly' ? setDays([i]) : toggleDay(i)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                    background: selected ? 'var(--gold)' : 'var(--bg-deep)',
                    border: selected ? 'none' : '1px solid var(--border)',
                    color: selected ? '#1a1209' : 'var(--text-dim)',
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  {d.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {frequency === 'monthly' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Which occurrence</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MONTH_WEEKS.map(w => (
              <button
                key={w.value}
                onClick={() => setMonthlyWeek(w.value)}
                style={{
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                  background: monthlyWeek === w.value ? 'var(--gold)' : 'var(--bg-deep)',
                  border: monthlyWeek === w.value ? 'none' : '1px solid var(--border)',
                  color: monthlyWeek === w.value ? '#1a1209' : 'var(--text-dim)',
                  fontWeight: monthlyWeek === w.value ? 600 : 400,
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
          {days.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 8 }}>
              {MONTH_WEEKS.find(w => w.value === monthlyWeek)?.label} {DAYS[days[0]]} of each month
            </div>
          )}
        </div>
      )}

      {frequency === 'biweekly' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            Reference date — anchor for which weeks are "on"
          </div>
          <input
            type="date"
            value={biweeklyRef}
            onChange={e => setBiweeklyRef(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      {frequency === 'custom' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Session Dates</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="date"
              value={newCustomDate}
              onChange={e => setNewCustomDate(e.target.value)}
              style={inputStyle}
            />
            <button onClick={addCustomDate} aria-label="Add date" style={addBtn}><LuPlus size={14} aria-hidden="true" /></button>
          </div>
          {customDates.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No dates added yet.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {customDates.map(d => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'var(--bg-deep)', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}>
                <LuCalendar size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ flex: 1 }}>{new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <button onClick={() => removeCustomDate(d)} aria-label={`Remove date ${new Date(d + 'T00:00:00').toLocaleDateString()}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                  <LuX size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <TimePicker value={timeUtc} onChange={setTimeUtc} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} style={submitBtn}>
          <LuSave size={13} /> {saving ? 'Saving...' : 'Save Schedule'}
        </button>
        {existing && (
          <button onClick={remove} style={dangerBtn}><LuTrash2 size={13} /> Remove</button>
        )}
      </div>
    </div>
  )
}
