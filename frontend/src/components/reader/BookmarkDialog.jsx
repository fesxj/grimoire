/**
 * Modal dialog for naming and saving a new bookmark (page or text selection).
 *
 * @param {object}   props.pendingBookmark - { page, selectedText? }
 * @param {string}   props.pendingLabel
 * @param {string}   props.pendingNotes
 * @param {Function} props.onLabelChange   - called with new label string
 * @param {Function} props.onNotesChange   - called with new notes string
 * @param {Function} props.onSave
 * @param {Function} props.onClose
 */
export default function BookmarkDialog({ pendingBookmark, pendingLabel, pendingNotes, onLabelChange, onNotesChange, onSave, onClose }) {
  return (
    <div
      data-bookmark-ui="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookmark-dialog-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 24, width: 360, maxWidth: '90vw',
      }}>
        <div id="bookmark-dialog-title" style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>
          {pendingBookmark.selectedText ? 'Bookmark Selection' : `Bookmark Page ${pendingBookmark.page}`}
        </div>

        {pendingBookmark.selectedText && (
          <div style={{
            fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px',
            marginBottom: 12, fontStyle: 'italic', lineHeight: 1.5,
            maxHeight: 80, overflow: 'hidden',
          }}>
            "{pendingBookmark.selectedText}"
          </div>
        )}

        <label htmlFor="bookmark-label" style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          Label
        </label>
        <input
          id="bookmark-label"
          type="text"
          autoFocus
          value={pendingLabel}
          onChange={e => onLabelChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose()
          }}
          placeholder={
            pendingBookmark.selectedText
              ? pendingBookmark.selectedText.slice(0, 40)
              : `Page ${pendingBookmark.page}`
          }
          style={{ width: '100%', fontSize: 14, padding: '8px 12px', marginBottom: 10, boxSizing: 'border-box' }}
        />

        <label htmlFor="bookmark-notes" style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          Notes (optional)
        </label>
        <textarea
          id="bookmark-notes"
          value={pendingNotes}
          onChange={e => onNotesChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose()
          }}
          placeholder="Notes (optional)"
          rows={3}
          style={{ width: '100%', fontSize: 13, padding: '8px 12px', marginBottom: 16, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 16px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{ padding: '7px 16px', borderRadius: 6, background: 'var(--gold-dim)', border: 'none', color: 'var(--bg-deep)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
