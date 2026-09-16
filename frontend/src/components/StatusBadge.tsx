import './StatusBadge.css'

export type Status =
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOWUP_SENT'
  | 'FOLLOWUP_1_SENT'
  | 'FOLLOWUP_2_SENT'
  | 'REPLIED'
  | 'COMPLETED'
  | 'FAILED'
  | 'ACTIVE'
  | 'CLOSED'
  | 'DRAFT'
  | 'PAUSED'
  | 'ARCHIVED'

const STATUS_LABEL: Partial<Record<Status, string>> = {
  FOLLOWUP_SENT: 'FOLLOWUP SENT',
  FOLLOWUP_1_SENT: 'FOLLOWUP 1 SENT',
  FOLLOWUP_2_SENT: 'FOLLOWUP 2 SENT',
  COMPLETED: '✓ COMPLETED',
}

// FOLLOWUP_1_SENT/FOLLOWUP_2_SENT and DRAFT/ARCHIVED exist in the API
// (see LeadStatus/CampaignStatus in api.ts) but aren't covered by the
// approved design reference (docs/ui-reference), which only shows
// FOLLOWUP_SENT and ACTIVE/PAUSED. Reusing the closest existing tone here
// rather than inventing new colors outside the design system.
const STATUS_CLASS: Partial<Record<Status, string>> = {
  FOLLOWUP_1_SENT: 'status-pill-followup_sent',
  FOLLOWUP_2_SENT: 'status-pill-followup_sent',
  PAUSED: 'status-pill-followup_sent',
  DRAFT: 'status-pill-closed',
  ARCHIVED: 'status-pill-closed',
}

interface StatusBadgeProps {
  status: Status
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABEL[status] ?? status
  const toneClass = STATUS_CLASS[status] ?? `status-pill-${status.toLowerCase()}`
  return (
    <span className={`status-pill ${toneClass}`}>
      {label}
    </span>
  )
}
