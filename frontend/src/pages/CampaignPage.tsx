import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, Campaign, CampaignFormInput, Lead, Message } from '../api'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import { WarnIcon } from '../components/icons'

const EMPTY_FORM: CampaignFormInput = {
  name: '',
  initialTemplateId: '',
  followup1TemplateId: '',
  followup1DelayHours: 24,
  followup2TemplateId: '',
  followup2DelayHours: 48,
  dailyLimit: 150
}

type FormMode = 'create' | 'edit'

export default function CampaignPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  // GET /api/v1/campaign always prioritizes the ACTIVE campaign over any
  // DRAFT (campaigns.service.ts's getCurrentCampaign), so a just-created
  // DRAFT while another campaign is ACTIVE is never "current" — this tracks
  // whether `campaign` reflects that real current lookup, so a freshly
  // created draft can still be shown (and its Activate guard exercised)
  // without pretending it's the current campaign.
  const [isCurrent, setIsCurrent] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [editing, setEditing] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [form, setForm] = useState<CampaignFormInput>(EMPTY_FORM)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const [statusActionError, setStatusActionError] = useState('')
  const [statusActionPending, setStatusActionPending] = useState(false)

  const [eligibleLeads, setEligibleLeads] = useState<Lead[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [sendError, setSendError] = useState('')
  const [sendResult, setSendResult] = useState<Message | null>(null)
  const [sending, setSending] = useState(false)

  const loadCampaign = useCallback(() => {
    setLoading(true)
    setLoadError('')
    api.getCampaign()
      .then((result) => {
        setCampaign(result)
        setIsCurrent(true)
        setEditing(result === null)
        setFormMode('create')
      })
      .catch((err: ApiError | Error) => {
        setLoadError(err instanceof ApiError ? `${err.message} (${err.status})` : err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  const loadEligibleLeads = useCallback(() => {
    // No dedicated "eligible leads" endpoint exists (backend/src/repositories
    // /leads.repository.ts's findEligibleLeads is unused, unwired to any
    // route). Under the current invariant a lead's campaignId is only ever
    // set together with its status leaving NEW (leads.repository.ts's
    // markLeadContacted), so status=NEW is equivalent to "eligible" — using
    // the existing GET /api/v1/leads?status=NEW instead of adding new
    // backend surface for this page.
    api.getLeads('NEW', 1, 100)
      .then((result) => setEligibleLeads(result.leads))
      .catch(() => setEligibleLeads([]))
  }, [])

  useEffect(() => {
    loadCampaign()
    loadEligibleLeads()
  }, [loadCampaign, loadEligibleLeads])

  function startEdit() {
    if (!campaign) return
    setForm({
      name: campaign.name,
      initialTemplateId: campaign.initialTemplateId,
      followup1TemplateId: campaign.followup1TemplateId,
      followup1DelayHours: campaign.followup1DelayHours,
      followup2TemplateId: campaign.followup2TemplateId,
      followup2DelayHours: campaign.followup2DelayHours,
      dailyLimit: campaign.dailyLimit
    })
    setFormMode('edit')
    setSaveError('')
    setEditing(true)
  }

  function startCreate() {
    // Allowed at any time, including while another campaign is ACTIVE —
    // campaigns.service.ts's createCampaign has no active-campaign guard
    // ("preparing a next campaign while the current one is still running"
    // is an explicitly supported workflow).
    setForm(EMPTY_FORM)
    setFormMode('create')
    setSaveError('')
    setEditing(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      const saved = formMode === 'edit' && campaign
        ? await api.updateCampaign(campaign.id, form)
        : await api.createCampaign(form)
      setCampaign(saved)
      setIsCurrent(formMode === 'edit')
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof ApiError ? `${err.message} (${err.status})` : (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(status: 'ACTIVE' | 'PAUSED') {
    if (!campaign) return
    setStatusActionPending(true)
    setStatusActionError('')
    try {
      const updated = await api.updateCampaignStatus(campaign.id, status)
      setCampaign(updated)
      setIsCurrent(true)
    } catch (err) {
      setStatusActionError(err instanceof ApiError ? err.message : (err as Error).message)
    } finally {
      setStatusActionPending(false)
    }
  }

  async function handleSend() {
    if (!selectedLeadId) return
    setSending(true)
    setSendError('')
    setSendResult(null)
    try {
      const message = await api.sendMessage(selectedLeadId)
      setSendResult(message)
      loadEligibleLeads()
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : (err as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="page-max-campaign">
        <div className="page-header">
          <h1>Campaign</h1>
          <div className="page-subtitle">Configure your outreach sequence</div>
        </div>
        <p>Loading...</p>
      </div>
    )
  }

  const campaignIsActive = campaign?.status === 'ACTIVE'

  return (
    <div className="page-max-campaign">
      <div className="page-header">
        <h1>Campaign</h1>
        <div className="page-subtitle">Configure your outreach sequence</div>
      </div>

      {loadError && <div className="alert alert-error">{loadError}</div>}

      {editing ? (
        <CampaignForm
          form={form}
          setForm={setForm}
          onSubmit={handleSave}
          onCancel={campaign ? () => setEditing(false) : undefined}
          saving={saving}
          saveError={saveError}
          isNew={formMode === 'create'}
        />
      ) : (
        <>
          <section className="panel campaign-card">
            {!campaign && <p className="hint-text-standalone">No campaign configured yet.</p>}

            {campaign && (
              <>
                {!isCurrent && (
                  <div className="alert alert-warning">
                    This is a new draft, not the current campaign yet — it only becomes current once activated.{' '}
                    <button className="link-button" onClick={loadCampaign}>View Current Campaign</button>
                  </div>
                )}

                <div className="campaign-summary-header">
                  <h2>{campaign.name}</h2>
                  <StatusBadge status={campaign.status} />
                </div>

                <dl className="campaign-details">
                  <div className="campaign-detail-item">
                    <dt>Initial Template</dt>
                    <dd className="mono-value">{campaign.initialTemplateId}</dd>
                  </div>
                  <div className="campaign-detail-item">
                    <dt>Follow-up 1 Template</dt>
                    <dd className="mono-value">{campaign.followup1TemplateId} (after {campaign.followup1DelayHours}h)</dd>
                  </div>
                  <div className="campaign-detail-item">
                    <dt>Follow-up 2 Template</dt>
                    <dd className="mono-value">{campaign.followup2TemplateId} (after {campaign.followup2DelayHours}h)</dd>
                  </div>
                  <div className="campaign-detail-item">
                    <dt>Daily Limit</dt>
                    <dd>{campaign.dailyLimit} messages/day</dd>
                  </div>
                </dl>

                <div className="campaign-actions" title={campaignIsActive ? 'Pause campaign before editing' : ''}>
                  <Button
                    variant="secondary"
                    disabled={campaignIsActive}
                    onClick={startEdit}
                  >
                    Edit
                  </Button>
                  {campaignIsActive ? (
                    <Button
                      variant="warning"
                      disabled={statusActionPending}
                      onClick={() => handleStatusChange('PAUSED')}
                    >
                      {statusActionPending ? 'Pausing...' : 'Pause'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      disabled={statusActionPending}
                      onClick={() => handleStatusChange('ACTIVE')}
                    >
                      {statusActionPending ? 'Activating...' : 'Activate'}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={startCreate}>
                    Start New Campaign
                  </Button>
                </div>

                {campaignIsActive && (
                  <p className="hint-text">Pause this campaign before editing its configuration.</p>
                )}

                {statusActionError && <div className="alert alert-error">{statusActionError}</div>}
              </>
            )}

            {!campaign && (
              <Button variant="primary" onClick={startCreate}>Create Campaign</Button>
            )}
          </section>

          <section className="send-card">
            <div className="send-card-title">Trigger a Single Send</div>
            <div className="send-card-subtitle">Send the initial template to one eligible lead (status: NEW).</div>

            <div className="form-group send-lead-picker">
              <label htmlFor="lead-picker">Eligible lead</label>
              <select
                id="lead-picker"
                className="token-input"
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
              >
                <option value="">Select a lead...</option>
                {eligibleLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.phone}{lead.name ? ` — ${lead.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {eligibleLeads.length === 0 && <p className="hint-text">No eligible leads (all leads have already been contacted).</p>}

            <Button variant="primary" disabled={!selectedLeadId || sending} onClick={handleSend}>
              {sending ? 'Sending...' : 'Send'}
            </Button>

            {sendError && <div className="alert alert-error">{sendError}</div>}
            {sendResult && (
              <div className="alert alert-success">
                Sent successfully. Message status: {sendResult.status}
              </div>
            )}

            {!campaignIsActive && (
              <div className="alert alert-warning inline-warning">
                <span className="inline-warning-icon"><WarnIcon /></span>
                <span>No campaign is currently ACTIVE. Activate a campaign before sending.</span>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

interface CampaignFormProps {
  form: CampaignFormInput
  setForm: React.Dispatch<React.SetStateAction<CampaignFormInput>>
  onSubmit: (e: React.FormEvent) => void
  onCancel?: () => void
  saving: boolean
  saveError: string
  isNew: boolean
}

function CampaignForm({ form, setForm, onSubmit, onCancel, saving, saveError, isNew }: CampaignFormProps) {
  return (
    <form onSubmit={onSubmit} className="panel campaign-form">
      <div className="campaign-form-title">{isNew ? 'Create Campaign' : 'Edit Campaign'}</div>

      <div className="form-group">
        <label htmlFor="name" className="token-label">Name</label>
        <input
          id="name"
          type="text"
          required
          className="token-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="campaign-form-step">
        <div className="campaign-form-eyebrow">Step 1 · Initial Message</div>
        <label htmlFor="initial-template" className="token-label">Initial Template ID</label>
        <input
          id="initial-template"
          type="text"
          required
          className="token-input"
          value={form.initialTemplateId}
          onChange={(e) => setForm({ ...form, initialTemplateId: e.target.value })}
        />
      </div>

      <div className="campaign-form-step campaign-form-step-grid">
        <div className="campaign-form-eyebrow campaign-form-eyebrow-full">Step 2 · Follow-up 1</div>
        <div>
          <label htmlFor="followup1-template" className="token-label">Follow-up 1 Template ID</label>
          <input
            id="followup1-template"
            type="text"
            required
            className="token-input"
            value={form.followup1TemplateId}
            onChange={(e) => setForm({ ...form, followup1TemplateId: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="followup1-delay" className="token-label">Delay (hours)</label>
          <input
            id="followup1-delay"
            type="number"
            min="1"
            required
            className="token-input"
            value={form.followup1DelayHours}
            onChange={(e) => setForm({ ...form, followup1DelayHours: Number(e.target.value) })}
          />
          <div className="input-helper">hours after previous message</div>
        </div>
      </div>

      <div className="campaign-form-step campaign-form-step-grid">
        <div className="campaign-form-eyebrow campaign-form-eyebrow-full">Step 3 · Follow-up 2</div>
        <div>
          <label htmlFor="followup2-template" className="token-label">Follow-up 2 Template ID</label>
          <input
            id="followup2-template"
            type="text"
            required
            className="token-input"
            value={form.followup2TemplateId}
            onChange={(e) => setForm({ ...form, followup2TemplateId: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="followup2-delay" className="token-label">Delay (hours)</label>
          <input
            id="followup2-delay"
            type="number"
            min="1"
            required
            className="token-input"
            value={form.followup2DelayHours}
            onChange={(e) => setForm({ ...form, followup2DelayHours: Number(e.target.value) })}
          />
          <div className="input-helper">hours after previous message</div>
        </div>
      </div>

      <div className="campaign-form-step">
        <label htmlFor="daily-limit" className="token-label">Daily Limit</label>
        <input
          id="daily-limit"
          type="number"
          min="1"
          className="token-input"
          value={form.dailyLimit ?? ''}
          onChange={(e) => setForm({ ...form, dailyLimit: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      {saveError && <div className="alert alert-error">{saveError}</div>}

      <div className="campaign-actions">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
