import { useEffect, useState } from 'react'
import { api, ApiError, DashboardStats } from '../api'
import { PeopleIcon, ChatIcon, CheckIcon, ClockIcon, DoneIcon, AlertIcon } from '../components/icons'

type StatTone = 'blue' | 'green' | 'amber' | 'gray' | 'red'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch((err: ApiError | Error) => {
        const message = err instanceof ApiError
          ? `${err.message} (${err.status})`
          : err.message
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-max-dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="page-subtitle">Overview of your outreach performance</div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : stats ? (
        <div className="stats-grid">
          <StatCard label="Total Leads" value={stats.total_leads} icon={<PeopleIcon />} tone="blue" />
          <StatCard label="Contacted" value={stats.contacted} icon={<ChatIcon />} tone="blue" />
          <StatCard label="Replied" value={stats.replied} icon={<CheckIcon />} tone="green" />
          <StatCard label="Waiting for Follow-up" value={stats.waiting_for_followup} icon={<ClockIcon />} tone="amber" />
          <StatCard label="Completed" value={stats.completed} icon={<DoneIcon />} tone="gray" />
          <StatCard
            label="Failed"
            value={stats.failed}
            icon={<AlertIcon />}
            tone="red"
            warn={stats.failed > 0}
          />
        </div>
      ) : null}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  tone,
  warn = false,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: StatTone
  warn?: boolean
}) {
  const effectiveTone = warn ? 'red' : tone
  return (
    <div className={`stat-card ${warn ? 'stat-card-warn' : ''}`}>
      <div className="stat-card-top">
        <div className={`stat-card-icon stat-card-icon-${effectiveTone}`}>{icon}</div>
        {warn && <div className="stat-attention-tag">ATTENTION</div>}
      </div>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${warn ? 'stat-value-warn' : ''}`}>{value}</div>
    </div>
  )
}
