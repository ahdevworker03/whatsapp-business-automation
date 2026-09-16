# End-to-End UX/Workflow Verification — Findings

**Date:** 2026-09-16
**Scope:** Full UX and user-flow verification against the live dev server (frontend on Vite, backend on `localhost:3000`, real dev Postgres DB), following the M7 design-system rollout and the leads-delete bug fix. Findings only — no code, schema, or business-logic changes were made.

**Note on referenced acceptance criteria:** the task brief cites "`05-product-backlog.md` M9 acceptance criteria." No such file exists in `docs/`. `docs/development-milestones/09-e2e-verification-handover.md` (M9) is an empty file, and `docs/planning/01-mvp-plan.md` marks M9 itself as **NOT STARTED**. Per `docs/rules/project.md`'s Repository Truth policy, this is flagged rather than silently resolved. This pass instead used the acceptance criteria from the milestones that *are* done and documented — M3 (Leads), M4 (Campaign/Send), M5 (Follow-up), M6 (Inbox), M7 (Frontend) — all in `docs/planning/01-mvp-plan.md` section 3.

**Note on Meta/WhatsApp delivery:** per instructions, real delivery was not tested. Two of the three leads in dev data use synthetic non-WhatsApp-registered numbers (`+16315551182`, `+16315551181`); the third (`+96171819509`) is a real, previously-verified device. Send/reply attempts in this pass were made only against the synthetic numbers so as to never risk a real delivery; the app's WhatsApp Business number is unpublished and Meta-allow-list-restricted, so those attempts correctly fail at Meta's side (`(#131030) Recipient phone number not in allowed list`, 502). This let the **failure-handling path** be fully verified end-to-end (status transitions, message-row creation, error surfacing) but **not the successful-send happy path**, which would require either a real deliverable number (out of scope) or a mocked Meta client (doesn't exist in this codebase). Flagged as a verification gap, not a failure.

---

## Summary table

| # | Area | Result | Severity |
|---|---|---|---|
| 1 | Leads page load vs. real DB data | PASS | — |
| 2 | Import Leads (counts match DB) | PASS | — |
| 3 | Campaign Activate → DB state change | PASS | — |
| 4 | Campaign Edit blocked while ACTIVE (API-level) | PASS | — |
| 5 | Campaign Pause → DB state change, Edit re-enabled | PASS | — |
| 6 | **Paused campaigns become unreachable via the app** | **FAIL** | **Broken workflow** |
| 7 | Daily sending limit enforced server-side | PASS | — |
| 8 | Only one ACTIVE campaign enforced server-side | PASS | — |
| 9 | Single-send failure path (status→FAILED, message row, 502 surfaced) | PASS | — |
| 10 | Single-send success path (status→CONTACTED) | NOT VERIFIABLE | Environment limitation |
| 11 | Inbox conversation list reflects real data | PASS | — |
| 12 | Reply blocked outside 24h window (API-level, pre-Meta-call) | PASS | — |
| 13 | Reply allowed inside 24h window (API + UI agree) | PASS | — |
| 14 | Reply's real `disabled` DOM attribute outside window | PASS | — |
| 15 | **No guard against replying to a CLOSED-but-in-window conversation** | QUESTION | Low / undocumented |
| 16 | Leads Delete blocked on CONTACTED+/FAILED (API-level, 409 not 500) | PASS | — |
| 17 | Leads Delete blocked on NEW-with-history (API-level, 409 not 500) | PASS | — |
| 18 | Leads Delete succeeds on a genuinely clean NEW lead | PASS | — |
| 19 | Delete-blocked error UI (no reflow, per prior fix) | PASS | — |
| 20 | 404 handling (lead, conversation, malformed UUID) | PASS | — |
| 21 | Leads empty state (zero results) | PASS | — |
| 22 | **Inbox empty state (zero results) is unstyled** | FAIL (code-confirmed) | Cosmetic |
| 23 | Dashboard stats with several zero fields | PASS | — |
| 24 | Cross-page consistency: Leads↔Dashboard after a delete | PASS | — |
| 25 | Cross-page status-badge comparison (Leads vs. Inbox) | QUESTION | Low / premise mismatch |

---

## Detailed findings

### 6. Paused (and archived) campaigns become unreachable through the app — **Broken workflow**

**Severity:** Broken business rule / workflow (not data loss — the row survives in Postgres — but operationally unreachable through any part of the product).

**What was tested:** the full Create → Activate → Pause → (try to resume) cycle, both with pre-existing dev data and freshly through the UI.

**Reproduction (fresh, via UI):**
1. `Campaign` page showed a blank "Create Campaign" form on load — no campaign was visible, even though the dev DB already had a PAUSED campaign (`Placeholder (pre-M4)`, id `a07a1643-...`).
2. Created "QA Verify Campaign" through the form. Confirmed in DB: `status = DRAFT`.
3. Clicked **Activate**. Confirmed in DB: `status = ACTIVE`. UI correctly showed `Edit` disabled; confirmed independently via direct `PATCH /api/v1/campaign/:id` that the backend also rejects the edit (409 `CampaignActiveError`), not just the disabled button.
4. Clicked **Pause**. Confirmed in DB: `status = PAUSED`. UI correctly re-enabled `Edit` and, in the same browser session (React state not yet refetched), still showed the campaign.
5. **Reloaded the page.** The campaign vanished. The page rendered the exact same blank "Create Campaign" form as step 1 — no indication anywhere that a real, fully-configured campaign still exists in the database.

**Root cause:** `GET /api/v1/campaign` (`campaigns.service.ts`'s `getCurrentCampaign`) only returns the ACTIVE campaign, or — if none is ACTIVE — the most recently created DRAFT campaign. PAUSED and ARCHIVED are excluded by design (the code comment cites this as a deliberate reading of `docs/architecture/05-api-design.md` section 4's "Get the current active or draft campaign configuration"). There is no other endpoint or UI view (list, history, archive) that shows non-ACTIVE/non-DRAFT campaigns — the UUID is knowable only via direct DB/API access, never through the product itself.

**Why this matters:** the app's *own* UI copy instructs the user to do exactly the thing that causes this: *"Pause this campaign before editing its configuration."* Following that instruction is a one-way trip in practice — after pausing to edit, the campaign disappears and the only way back is to already know its UUID and hand-craft a `PATCH .../status` call. For a single-active-campaign tool, this makes "pause" functionally indistinguishable from "archive forever" from the product's own perspective, even though the schema and business rules clearly intend PAUSED to be a resumable state (`ACTIVE ⇄ PAUSED` is the exact example given in the API design doc).

**Layer responsible:** backend API contract (`GET /campaign`'s "current campaign" definition is too narrow for the workflow the frontend and API design doc both otherwise support) — the frontend has no compensating view, but frontend is otherwise correctly rendering "nothing" because that's genuinely what the API returns. This is a design/contract gap, not a frontend bug and not a crash — flagging root cause at the API-contract layer per the leads-delete investigation's own discipline (traced past the symptom to where the decision was actually made).

---

### 15. No guard against replying to a CLOSED conversation still inside its 24h window — Question, not a confirmed failure

**What was tested (code review + live, on a synthetic number only):** `inbox.service.ts`'s `replyToConversation` checks *only* `isWithinCustomerServiceWindow(lastInbound.createdAt)` — it never inspects `conversation.status`. The frontend (`InboxPage.tsx`) mirrors this: `replyDisabled = !selected || !selected.withinWindow`, with no `status === 'CLOSED'` check either.

**Live evidence this is reachable, not just theoretical:** Abdallah's conversation (`status: CLOSED`) has its last inbound message at `2026-09-15 13:28:53 UTC`; this test ran at `2026-09-16 05:17 UTC` — under 24 hours later, so `withinCustomerServiceWindow: true` for a CLOSED conversation. Both the API and the UI would currently accept a reply attempt there.

**Why this is a question, not a failure:** I did not execute a live reply against this specific conversation, because it's the one real, previously-verified deliverable WhatsApp number in dev data — actually sending would be testing real delivery, which is explicitly out of scope. I instead confirmed the *code path* has no status check via direct review, and confirmed the 24h-window guard itself works correctly (both blocking outside-window and allowing inside-window) against a synthetic number instead (see items 12–14). Neither `docs/architecture/05-api-design.md` nor the milestone docs say whether CLOSED should block replies independent of the window — this is a genuine open product question, not a documented-and-violated rule.

---

### 22. Inbox's zero-conversations empty state is unstyled — Cosmetic

**What was tested:** compared `LeadsPage.tsx`'s zero-results branch against `InboxPage.tsx`'s.

- Leads (`leads.length === 0`): renders `.panel-empty-state` — icon, "No leads yet" title, subtitle. Confirmed live in this pass by filtering to `FAILED`... (see note) and separately re-confirmed the polished rendering from the prior design pass.
- Inbox (`conversations.length === 0`): renders a single unstyled `<p className="inbox-list-message">No conversations found.</p>` — no icon, no title/subtitle treatment, left over from before the M7 design-system pass evidently didn't reach this specific branch.

**Could not reproduce live in this pass:** current dev data has at least one conversation in both possible filter states (`ACTIVE`: 2, `CLOSED`: 1) — no filter combination in the existing UI (`All statuses` / `ACTIVE` / `CLOSED`) currently produces zero results, so the empty branch couldn't be triggered without deleting real conversation data (out of scope: "do not modify backend, database schema, or business logic," and conversations have no delete endpoint regardless). The finding rests on direct source comparison, which for this class of issue (a plainly different code path, not a runtime data-dependent behavior) doesn't need live reproduction to establish.

**Layer:** frontend display only.

---

### 25. "Same lead, same badge, every page" doesn't fully apply as literally stated — Question

**What was tested:** `+16315551181`'s badge on the Leads page (`REPLIED`, color `oklch(0.5 0.14 150)` / bg `oklch(0.94 0.035 150)`) vs. its badge on the Inbox page (`ACTIVE`).

**Finding:** these are two different fields — Leads shows `LeadStatus`, Inbox shows `ConversationStatus` — that happen to share some label spellings (`ACTIVE` exists in both enums with different meanings). There is no page that shows both for the same lead side-by-side, and Dashboard has no per-lead list at all (see note below), so a literal "compare the same badge across Dashboard/Leads/Inbox" check doesn't have a well-defined target. Where the *same* enum value is used with the *same* shared `<StatusBadge>` component, the color mapping is centralized in one file (`frontend/src/components/StatusBadge.tsx`/`.css`), so it can't diverge page-to-page by construction — confirmed by reading the rendered computed styles directly.

**Related note (not a separate finding, context for the above):** the Dashboard page has no "Recent Leads" list at all, despite one existing in the approved design reference (`docs/ui-reference/dashboard/Dashboard.dc.html`). This was a deliberate, disclosed scope decision made during the M7 frontend build (no backend endpoint exists to back it, and adding one was out of scope for that pass) — recorded here since it's directly relevant to why a same-lead cross-page badge comparison involving Dashboard isn't possible at all right now, not because it's newly discovered.

---

## Verified-working items (detail)

**Import Leads** (item 2): a 3-row CSV (1 valid new lead, 1 duplicate of an existing phone, 1 invalid phone) produced `{"imported":1,"duplicates":1,"failed":1}` via both direct API call and the UI file-picker; re-importing the identical file produced `{"imported":0,"duplicates":2,"failed":1}`. Cross-checked against `SELECT` on the `leads` table both times — exact match.

**Campaign state transitions** (items 3–5, 7–8): Activate/Pause/Edit-blocked were each confirmed against the actual Postgres row, not just UI appearance — including one explicit attempt to `PATCH` the ACTIVE campaign's fields directly via `curl` (bypassing the disabled button entirely), which correctly returned `409 CampaignActiveError`. Daily-limit enforcement was verified by setting a campaign's `dailyLimit` to `0` and confirming the send attempt was rejected with `429` *before* any Meta API call was made (confirmed via the absence of any Meta-related log line for that specific request). The one-ACTIVE-campaign rule was confirmed by attempting to activate a second campaign while another was already ACTIVE (`409 AnotherCampaignActiveError`), with the targeted campaign's DB row confirmed unchanged.

**Single-send failure path** (item 9): with a real (allow-list-rejected) Meta failure, confirmed the lead's status flipped to `FAILED` and a `FAILED` `OUTBOUND`/`TEMPLATE` message row was created with the rendered template content — matches the M7 milestone's own documented fix for this exact path.

**Inbox reply window** (items 12–14): confirmed the 409 block happens *before* any Meta API call for an out-of-window conversation (no Meta-related log line for that request), confirmed the same conversation's Send button and reply textarea have the real HTML `disabled` attribute (not just a visual style) via `isDisabled()`, then reopened the window by posting a synthetic inbound webhook event for the same synthetic-number lead (`POST /webhook`, no signature verification required in this dev setup) and confirmed the reply attempt then passed the window check and proceeded to (correctly) fail only at the Meta-allow-list step — with the resulting `FAILED` message row recorded, matching the established failure-handling pattern.

**Leads delete guard** (items 16–18, re-confirming the prior fix in this fresh pass): direct `DELETE` calls against a `FAILED` lead, a `REPLIED` lead, and a `NEW`-status-but-with-message-history lead all returned `409` with the "already been contacted" message (not `500`); a genuinely clean `NEW` lead with zero history deleted successfully (`200 {"deleted":true}`).

**404 handling** (item 20): non-existent lead (`GET`/`DELETE`), non-existent conversation (`GET`/reply), non-existent lead for send, and a malformed (non-UUID) id all returned clean `404`/`400` JSON errors — no crashes, no `500`s.

**Cross-page consistency after mutation** (item 24): after deleting the one genuinely-clean test lead, `GET /api/v1/dashboard/stats` immediately reflected `total_leads: 3` (down from 4) with `replied`/`failed` counts matching the DB exactly — no stale caching observed.

---

## Test data created/modified during this pass

For transparency — nothing was deleted or altered in violation of scope, but the following mutations happened as the natural, requested consequence of exercising these workflows:

- Imported one throwaway lead (`+12125551234`, "QA Fresh Lead") via CSV, then deleted it (clean NEW lead, no history) to test the delete-success path and cross-page stat refresh.
- Created one campaign (`QA Verify Campaign`) through the UI; it is currently **ACTIVE** with `dailyLimit: 5`. Left in that state — pausing or archiving it would itself reproduce/hide finding #6, so it was left as-is pending your read on that finding.
- `+16315551182` (fake number, pre-existing `NEW` lead): attempted one single-send against it (to test the failure path safely) — its status is now `FAILED`, with one additional `FAILED` message row. Was already blocked from deletion before this pass (pre-existing message/conversation history from before this session).
- `+16315551181` (fake number, pre-existing `NEW` lead): posted one synthetic inbound webhook message to it (to reopen its 24h reply window for testing), then attempted one reply (failed at Meta, recorded as `FAILED`). The synthetic inbound message was treated as a genuine human reply by the existing auto-reply-detection logic, so its status is now `REPLIED` — this is the app's own correct, working behavior in response to the test input, not a mutation I forced directly.

No schema, business logic, or backend/frontend source files were modified in this pass.
