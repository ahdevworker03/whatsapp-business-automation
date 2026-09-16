import { useEffect, useState } from 'react'
import { api, ApiError, SettingsFormInput } from '../api'
import Button from '../components/Button'
import { InfoIcon } from '../components/icons'

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsFormInput | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [newPattern, setNewPattern] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getSettings()
      .then((settings) => {
        setForm({
          whatsappPhoneNumber: settings.whatsappPhoneNumber,
          whatsappPhoneNumberId: settings.whatsappPhoneNumberId,
          autoReplyPatterns: settings.autoReplyPatterns
        })
      })
      .catch((err: ApiError | Error) => {
        setLoadError(err instanceof ApiError ? `${err.message} (${err.status})` : err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  function addPattern() {
    const trimmed = newPattern.trim()
    if (!trimmed || !form) return
    setForm({ ...form, autoReplyPatterns: [...form.autoReplyPatterns, trimmed] })
    setNewPattern('')
  }

  function removePattern(index: number) {
    if (!form) return
    setForm({ ...form, autoReplyPatterns: form.autoReplyPatterns.filter((_, i) => i !== index) })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      const updated = await api.updateSettings(form)
      setForm({
        whatsappPhoneNumber: updated.whatsappPhoneNumber,
        whatsappPhoneNumberId: updated.whatsappPhoneNumberId,
        autoReplyPatterns: updated.autoReplyPatterns
      })
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? `${err.message} (${err.status})` : (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-max-settings">
        <div className="page-header">
          <h1>Settings</h1>
          <div className="page-subtitle">Integration &amp; automation configuration</div>
        </div>
        <p>Loading...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page-max-settings">
        <div className="page-header">
          <h1>Settings</h1>
          <div className="page-subtitle">Integration &amp; automation configuration</div>
        </div>
        <div className="alert alert-error">{loadError}</div>
      </div>
    )
  }

  if (!form) return null

  const isUnconfigured = !form.whatsappPhoneNumber?.trim() && !form.whatsappPhoneNumberId?.trim()

  return (
    <div className="page-max-settings">
      <div className="page-header">
        <h1>Settings</h1>
        <div className="page-subtitle">Integration &amp; automation configuration</div>
      </div>

      {isUnconfigured && (
        <div className="alert alert-info">
          <span className="inline-warning-icon"><InfoIcon /></span>
          {' '}WhatsApp connection not configured. Add your phone number and phone number ID to get started.
        </div>
      )}

      <form onSubmit={handleSave}>
        <section className="panel settings-card">
          <div className="settings-card-title">WhatsApp Connection</div>

          <div className="alert alert-neutral">
            <span className="inline-warning-icon"><InfoIcon /></span>
            {' '}Changes here affect the live WhatsApp integration. Double-check values before saving.
          </div>

          <div className="form-group">
            <label htmlFor="whatsapp-phone-number" className="token-label">WhatsApp Phone Number</label>
            <input
              id="whatsapp-phone-number"
              type="text"
              placeholder="+962791234567"
              className="token-input"
              value={form.whatsappPhoneNumber ?? ''}
              onChange={(e) => setForm({ ...form, whatsappPhoneNumber: e.target.value || null })}
            />
            <div className="input-helper">Your registered WhatsApp Business number in E.164 format (e.g. +962791234567)</div>
          </div>

          <div className="form-group">
            <label htmlFor="whatsapp-phone-number-id" className="token-label">WhatsApp Phone Number ID</label>
            <input
              id="whatsapp-phone-number-id"
              type="text"
              placeholder="e.g. 109876543210987"
              className="token-input"
              value={form.whatsappPhoneNumberId ?? ''}
              onChange={(e) => setForm({ ...form, whatsappPhoneNumberId: e.target.value || null })}
            />
            <div className="input-helper">The numeric ID from your Meta app dashboard — not the phone number itself</div>
          </div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-title">Auto-Reply Detection</div>
          <p className="settings-card-subtitle">
            Messages containing any of these patterns (case-insensitive) are treated as automated replies and will not stop the follow-up sequence.
          </p>

          {form.autoReplyPatterns.length === 0 ? (
            <p className="hint-text-standalone">No patterns configured.</p>
          ) : (
            <div className="pattern-list">
              {form.autoReplyPatterns.map((pattern, index) => (
                <div key={index} className="pattern-chip">
                  <span>{pattern}</span>
                  <button type="button" className="pattern-chip-remove" onClick={() => removePattern(index)} aria-label={`Remove pattern ${pattern}`}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pattern-add-row">
            <input
              type="text"
              placeholder="e.g. out of office"
              className="token-input"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPattern()
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addPattern} disabled={!newPattern.trim()}>
              Add Pattern
            </Button>
          </div>
        </section>

        {saveError && <div className="alert alert-error">{saveError}</div>}
        {saved && <div className="alert alert-success">Settings saved.</div>}

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </div>
  )
}
