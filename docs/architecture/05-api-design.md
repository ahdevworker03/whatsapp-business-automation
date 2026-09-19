# API Design

## 1. Overview

The backend exposes a REST API consumed by the React frontend. It also exposes a webhook endpoint for Meta to deliver incoming messages and message status updates.

## 2. General Conventions

- Base URL: /api/v1
- All request and response bodies are JSON
- Timestamps are ISO 8601 strings
- Phone numbers are E.164 format
- Errors return: `{ error: string, code?: string }`
- HTTP status codes follow standard conventions (200, 201, 400, 404, 409, 500)

## 3. Leads Endpoints

**POST /api/v1/leads/import**
- Import leads from an uploaded Excel or CSV file
- Request: multipart/form-data with file field
- Response 201: `{ imported: number, duplicates: number, failed: number }`

**GET /api/v1/leads**
- List all leads with their current status
- Query params: status (optional filter), page, limit
- Response 200: `{ leads: Lead[], total: number }`

**GET /api/v1/leads/:id**
- Get a single lead with its message history
- Response 200: Lead object with messages array

**DELETE /api/v1/leads/:id**
- Remove a lead. Not allowed if lead has been contacted.
- Response 200 or 409 if already contacted

## 4. Campaign Endpoints

**GET /api/v1/campaign**
- Get the current active or draft campaign configuration
- Response 200: Campaign object

**POST /api/v1/campaign**
- Create a new campaign (only one ACTIVE campaign allowed)
- Request body: name, initial_template_id, followup1_template_id, followup1_delay_hours, followup2_template_id, followup2_delay_hours, daily_limit
- Response 201: Campaign object

**PATCH /api/v1/campaign/:id**
- Update campaign configuration. Not allowed if campaign is ACTIVE.
- Response 200 or 409 if active

**PATCH /api/v1/campaign/:id/status**
- Change campaign status (DRAFT → ACTIVE, ACTIVE → PAUSED, etc.)
- Request body: `{ status: CampaignStatus }`
- Response 200: Campaign object

## 5. Messaging Endpoints

**POST /api/v1/messages/send**
- Manually trigger sending the initial template to one lead
- Request body: `{ lead_id: string }`
- Response 200: Message object

**POST /api/v1/inbox/:conversation_id/reply**
- Send a manual free-text reply from the Inbox
- Request body: `{ message: string }`
- Response 200: Message object

## 6. Inbox Endpoints

**GET /api/v1/inbox**
- List all conversations ordered by last message time
- Query params: status (optional), page, limit
- Response 200: `{ conversations: Conversation[], total: number }`

**GET /api/v1/inbox/:conversation_id**
- Get a conversation with full message history
- Response 200: Conversation object with messages array, plus `withinCustomerServiceWindow: boolean` — computed by `inbox.service.ts` from the lead's most recent INBOUND message, using the same 24-hour-window logic `POST .../reply` enforces. Lets the frontend show the reply-window warning without reimplementing the rule client-side.

**PATCH /api/v1/inbox/:conversation_id/status**
- Mark conversation as CLOSED
- Request body: `{ status: ConversationStatus }`
- Response 200: Conversation object

## 7. Dashboard Endpoints

**GET /api/v1/dashboard/stats**
- Get summary statistics for the dashboard page
- Response 200:
```
{
  total_leads: number,
  contacted: number,
  replied: number,
  waiting_for_followup: number,
  completed: number,
  failed: number
}
```

## 8. Settings Endpoints

**GET /api/v1/settings**
- Get current settings
- Response 200: Settings object

**PATCH /api/v1/settings**
- Update settings (WhatsApp number, auto-reply patterns)
- Request body: Partial settings fields
- Response 200: Settings object

## 9. WhatsApp Webhook

**GET /webhook**
- Meta webhook verification endpoint. Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge. The backend verifies the token and returns hub.challenge.
- This is required before Meta will send any events.

**POST /webhook**
- Receives all incoming events from Meta. Two event types:
  - Incoming message: a lead has replied. Run auto-reply detection. If human reply, set automation_stopped, update lead status to REPLIED, update conversation. If auto-reply, log and continue sequence.
  - Status update: a message status has changed (sent, delivered, read, failed). Update the corresponding message record in the database.
- Response: always 200 immediately. Do not return non-200 to Meta or it will retry.

Note: The webhook endpoint is at /webhook, not under /api/v1, because Meta requires a clean URL configured in the Meta app dashboard.

## 10. WhatsApp Outbound Templates

Templates must be pre-approved by Meta before use. The backend sends templates using the Meta Cloud API POST /messages endpoint. The template name and language code are stored in the campaign configuration. Variable substitution (e.g. lead name) is passed in the components parameter if the template requires it. Free-text messages (manual inbox replies) can only be sent within a 24-hour customer service window after the lead has replied.

## 11. API Access Control

> **Scope note:** This section reflects a decision made 2026-09-19 to replace the static bearer token with a real login screen, because the client (non-technical) shouldn't have to handle a raw API token pasted into the frontend. This is **not** a multi-user system change: there is still exactly one set of credentials, shared by Abdallah and the client interchangeably. There is no per-person identity, no user table with multiple rows. The system remains single-user/single-role in every sense (project.md §1/§6, 01-system-architecture.md §2/§7 all still apply unchanged) — the only change is the mechanism for proving you're allowed in.

- All `/api/v1/*` routes require the caller to be authenticated via a login session. The static shared bearer token (`API_ACCESS_TOKEN`) described in earlier revisions of this doc is removed.
- There is exactly **one** fixed credential pair (a single email + password), not a lookup across multiple accounts. Whoever is logging in — Abdallah or the client — submits the same shared credentials.
- Storage choice: the password is stored **hashed in an environment variable** (`ADMIN_PASSWORD_HASH`, bcrypt or equivalent), checked at login time. This is simpler than a seeded single-row users table for a credential pair that never needs to be looked up by anything other than "does this match the one hash we have" — no table, no migration, no query needed. (If credential rotation via a UI is ever wanted, a single seeded row would be the alternative — not needed for MVP.)

### 11.1 Login Endpoint

**POST /api/v1/auth/login**
- Request body: `{ email: string, password: string }`
- Verifies the submitted email+password against the single stored credential pair (`ADMIN_EMAIL` env var or hardcoded constant, plus `ADMIN_PASSWORD_HASH` — see §11.4).
- Response 200: sets an `HttpOnly` session cookie and returns `{ ok: true }`.
- Response 401 on invalid credentials.

**POST /api/v1/auth/logout**
- Destroys the current session.
- Response 200.

There is no signup endpoint and no account provisioning step — the one credential pair is configured once via environment variable, not created through the API.

### 11.2 Middleware Change

- The existing `/api/v1/*` Express middleware that checked `API_ACCESS_TOKEN` is replaced with session middleware that verifies the session cookie issued by `POST /api/v1/auth/login` against the server-side session store.
- Requests to `/api/v1/*` without a valid, unexpired session return 401, same as before.
- There is nothing to resolve the session to besides "valid" or not — no user record, no role, no per-caller data — since both real people share the one session-worthy identity.

### 11.3 Webhook Unaffected

- `/webhook` (§9) is unchanged and stays outside this auth layer, exactly as before. It continues to be secured separately via Meta's own `hub.verify_token`, matched against `META_WEBHOOK_VERIFY_TOKEN`.

### 11.4 Decided — Server-Side Session (not JWT)

Decided by Abdallah: **server-side sessions**, not JWT.

- Session data (session ID → validity/expiry) is kept server-side, in Postgres (no Redis, per 01-system-architecture.md §2's no-Redis constraint) — a single VPS with no horizontal scaling and no third-party API consumers gets no benefit from JWT's statelessness, while sessions make logout/revocation trivial, which a signed JWT would need a denylist to match.
- The session-ID cookie is `HttpOnly`, signed using `SESSION_SECRET` (see 06-deployment.md §7).
- (Rationale for rejecting JWT, for reference: JWT avoids server-side session storage but makes revoking access before natural token expiry — e.g. on logout or a credential change — harder without adding a denylist; that tradeoff isn't worth it here.)
