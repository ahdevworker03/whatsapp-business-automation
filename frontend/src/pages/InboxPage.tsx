import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, ConversationDetail, ConversationListItem, ConversationStatus } from '../api'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import { EmptyChatIcon, WarnIcon } from '../components/icons'

const PAGE_SIZE = 20

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | ''>('')
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadList = useCallback(() => {
    setListLoading(true)
    setListError('')
    api.getInbox(statusFilter || undefined, page, PAGE_SIZE)
      .then((result) => {
        setConversations(result.conversations)
        setTotal(result.total)
      })
      .catch((err: ApiError | Error) => {
        setListError(err instanceof ApiError ? `${err.message} (${err.status})` : err.message)
      })
      .finally(() => setListLoading(false))
  }, [statusFilter, page])

  useEffect(() => {
    loadList()
  }, [loadList])

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value as ConversationStatus | '')
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="inbox-page">
      <div className="inbox-page-header">
        <h1>Inbox</h1>
        <div className="page-subtitle">Conversations with leads</div>
      </div>

      <div className="inbox-layout">
        <div className="inbox-list-pane panel">
          <div className="inbox-filter-bar">
            <select
              id="conv-status-filter"
              className="filter-select inbox-filter-select"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div className="conversation-list-scroll">
            {listError && <div className="alert alert-error inline-alert">{listError}</div>}

            {listLoading ? (
              <p className="inbox-list-message">Loading...</p>
            ) : conversations.length === 0 ? (
              <div className="panel-empty-state">
                <div className="panel-empty-icon"><EmptyChatIcon /></div>
                <div className="panel-empty-title">No conversations found</div>
                <div className="panel-empty-subtitle">Conversations appear here once a lead has messaged in or been contacted.</div>
              </div>
            ) : (
              <ul className="conversation-list">
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      className={`conversation-list-item ${selectedId === conv.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(conv.id)}
                    >
                      <div className="conversation-list-item-header">
                        <span className={`conversation-list-item-name ${conv.status === 'ACTIVE' ? '' : 'conversation-list-item-name-muted'}`}>
                          {conv.lead.name || conv.lead.phone}
                        </span>
                        <StatusBadge status={conv.status} />
                      </div>
                      <div className="conversation-list-item-sub">
                        {conv.lead.phone}
                        {conv.lastMessageAt && ` · ${new Date(conv.lastMessageAt).toLocaleString()}`}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="inbox-pagination">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="pagination-label">Page {page} of {totalPages} ({total} total)</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>

        <div className="inbox-detail-pane panel">
          {selectedId ? (
            <ConversationDetailView
              conversationId={selectedId}
              onStatusChanged={loadList}
            />
          ) : (
            <div className="panel-empty-state inbox-detail-empty">
              <div className="panel-empty-icon"><EmptyChatIcon /></div>
              <div className="panel-empty-title">No conversation selected</div>
              <div className="panel-empty-subtitle">Select a conversation to view its history.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConversationDetailView({
  conversationId,
  onStatusChanged
}: {
  conversationId: string
  onStatusChanged: () => void
}) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')
  const [sending, setSending] = useState(false)

  const [closeError, setCloseError] = useState('')
  const [closing, setClosing] = useState(false)

  const loadConversation = useCallback(() => {
    setLoading(true)
    setLoadError('')
    api.getConversation(conversationId)
      .then(setConversation)
      .catch((err: ApiError | Error) => {
        setLoadError(err instanceof ApiError ? `${err.message} (${err.status})` : err.message)
      })
      .finally(() => setLoading(false))
  }, [conversationId])

  useEffect(() => {
    setReplyText('')
    setReplyError('')
    setCloseError('')
    loadConversation()
  }, [loadConversation])

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return
    setSending(true)
    setReplyError('')
    try {
      await api.replyToConversation(conversationId, replyText)
      setReplyText('')
    } catch (err) {
      setReplyError(err instanceof ApiError ? err.message : (err as Error).message)
    } finally {
      setSending(false)
      // A failed send still persists a FAILED message row (inbox.service.ts
      // creates it before re-throwing) — reload either way so the history
      // reflects the new SENT or FAILED row immediately.
      loadConversation()
    }
  }

  async function handleClose() {
    setClosing(true)
    setCloseError('')
    try {
      const updated = await api.closeConversation(conversationId)
      setConversation((prev) => (prev ? { ...prev, status: updated.status } : prev))
      onStatusChanged()
    } catch (err) {
      setCloseError(err instanceof ApiError ? err.message : (err as Error).message)
    } finally {
      setClosing(false)
    }
  }

  if (loading) return <div className="inbox-detail-empty"><p>Loading...</p></div>
  if (loadError) return <div className="inbox-detail-empty"><div className="alert alert-error">{loadError}</div></div>
  if (!conversation) return null

  const messages = conversation.lead.messages
  const withinWindow = conversation.withinCustomerServiceWindow

  return (
    <div className="conversation-detail">
      <div className="conversation-detail-header">
        <div className="conversation-detail-heading">
          <div>
            <h2>{conversation.lead.name || conversation.lead.phone}</h2>
            <p className="conversation-detail-phone">{conversation.lead.phone}</p>
          </div>
          <StatusBadge status={conversation.status} />
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={conversation.status === 'CLOSED' || closing}
          onClick={handleClose}
        >
          {conversation.status === 'CLOSED' ? 'Closed' : closing ? 'Closing...' : 'Mark Closed'}
        </Button>
      </div>

      {closeError && <div className="alert alert-error inline-alert">{closeError}</div>}

      <div className="message-history">
        {messages.length === 0 ? (
          <p className="inbox-list-message">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message-row message-${msg.direction.toLowerCase()}`}>
              <div className={`message-bubble ${msg.status === 'FAILED' ? 'message-bubble-failed' : ''}`}>
                <div className="message-content">{msg.content}</div>
                <div className="message-meta">
                  {msg.direction === 'INBOUND' ? 'Received' : 'Sent'} · {new Date(msg.createdAt).toLocaleString()}
                  {msg.status === 'FAILED' && <span className="message-failed-label"> · Failed to send</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="reply-footer">
        {!withinWindow && (
          <div className="alert alert-warning inline-warning">
            <span className="inline-warning-icon"><WarnIcon /></span>
            <span>Reply window closed — you can only reply within 24 hours of the lead's last message.</span>
          </div>
        )}
        <form onSubmit={handleReply} className="reply-box">
          <textarea
            id="reply-text"
            aria-label="Reply"
            rows={1}
            placeholder="Type a reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={sending || !withinWindow}
            className="reply-textarea"
          />
          <Button type="submit" variant="primary" disabled={sending || !withinWindow || !replyText.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </form>
        {replyError && <div className="alert alert-error inline-alert">Failed to send: {replyError}</div>}
      </div>
    </div>
  )
}
