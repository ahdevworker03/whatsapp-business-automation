import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, Lead, LeadStatus, ImportLeadsResult } from '../api'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import { UploadIcon, EmptyInboxIcon } from '../components/icons'

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'FOLLOWUP_1_SENT',
  'FOLLOWUP_2_SENT',
  'REPLIED',
  'COMPLETED',
  'FAILED'
]

const PAGE_SIZE = 20

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [importResult, setImportResult] = useState<ImportLeadsResult | null>(null)
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadLeads = useCallback(() => {
    setLoading(true)
    setError('')
    api.getLeads(statusFilter || undefined, page, PAGE_SIZE)
      .then((result) => {
        setLeads(result.leads)
        setTotal(result.total)
      })
      .catch((err: ApiError | Error) => {
        setError(err instanceof ApiError ? `${err.message} (${err.status})` : err.message)
      })
      .finally(() => setLoading(false))
  }, [statusFilter, page])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value as LeadStatus | '')
    setPage(1)
  }

  async function handleImport(file: File) {
    setImporting(true)
    setImportError('')
    setImportResult(null)
    try {
      const result = await api.importLeads(file)
      setImportResult(result)
      setPage(1)
      loadLeads()
    } catch (err) {
      setImportError(err instanceof ApiError ? `${err.message} (${err.status})` : (err as Error).message)
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleDelete(lead: Lead) {
    setDeleteError(null)
    setDeletingId(lead.id)
    try {
      await api.deleteLead(lead.id)
      loadLeads()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteError({
          id: lead.id,
          message: 'This lead has already been contacted and cannot be deleted.'
        })
      } else {
        setDeleteError({
          id: lead.id,
          message: err instanceof ApiError ? `${err.message} (${err.status})` : (err as Error).message
        })
      }
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="page-max-leads">
      <div className="page-header">
        <h1>Leads</h1>
        <div className="page-subtitle">{total} total leads</div>
      </div>

      <section className="panel import-panel">
        <div className="import-panel-label">Import Leads</div>
        <label htmlFor="lead-file" className={`dropzone ${importing ? 'dropzone-disabled' : ''}`}>
          <input
            ref={fileInputRef}
            id="lead-file"
            type="file"
            accept=".csv,.xlsx"
            disabled={importing}
            className="dropzone-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
            }}
          />
          <span className="dropzone-icon"><UploadIcon /></span>
          <span className="dropzone-text">
            {importing ? 'Importing…' : 'Click to browse for a CSV or Excel file'}
          </span>
        </label>

        {importError && (
          <div className="alert alert-error inline-alert">{importError}</div>
        )}

        {importResult && (
          <div className="alert alert-success inline-alert">
            Imported: {importResult.imported} · Duplicates: {importResult.duplicates} · Failed: {importResult.failed}
          </div>
        )}
      </section>

      <div className="filter-row">
        <select
          id="status-filter"
          className="filter-select"
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        {loading ? (
          <div className="panel-empty-state"><p>Loading...</p></div>
        ) : leads.length === 0 ? (
          <div className="panel-empty-state">
            <div className="panel-empty-icon"><EmptyInboxIcon /></div>
            <div className="panel-empty-title">No leads yet</div>
            <div className="panel-empty-subtitle">Import a CSV or Excel file to get started.</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Name</th>
                  <th>Business Name</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const contacted = lead.status !== 'NEW'
                  return (
                    <tr key={lead.id}>
                      <td className="mono-cell">{lead.phone}</td>
                      <td className={lead.name ? '' : 'muted-cell'}>{lead.name || '—'}</td>
                      <td className={lead.businessName ? '' : 'muted-cell'}>{lead.businessName || '—'}</td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td className="muted-cell">{new Date(lead.createdAt).toLocaleDateString()}</td>
                      <td className="col-actions" title={contacted ? 'Cannot delete a contacted lead' : ''}>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={contacted || deletingId === lead.id}
                          onClick={() => handleDelete(lead)}
                        >
                          {deletingId === lead.id ? 'Deleting...' : 'Delete'}
                        </Button>
                        {deleteError?.id === lead.id && (
                          <div className="alert alert-error inline-alert">{deleteError.message}</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && leads.length > 0 && (
        <div className="pagination">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="pagination-label">Page {page} of {totalPages} ({total} total)</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
