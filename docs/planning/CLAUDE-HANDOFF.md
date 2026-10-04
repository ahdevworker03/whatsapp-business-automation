# CLAUDE-HANDOFF.md — WhatsApp Outreach Dashboard

Purpose: carry over the knowledge from the Claude Project (memory, conversations, instructions) that is **not** fully captured in the repository. The repo and its docs remain the source of truth for architecture, API, data model, milestones, and deployment. Read this file together with them, not instead of them.

Export date: 2026-10-04. Latest dated project decision found: 2026-09-23 (`docs/development-milestones/08-vps-deployment.md` §11.3).

> **Recovery gap — read first.** Claude could only recover project memory, project instructions, and the docs attached to the project. Full conversation transcripts were not available. Nothing dated between 2026-09-23 and 2026-10-04 was recovered. Ask the developer which of the §11.3 "Next Steps" were completed in that window before acting on Section 1.

---

## 1. Immediate continuation state

**Project status:** M1–M7 DONE. M8.5 (login screen, added scope) DONE. **M8 (VPS Deployment) IN PROGRESS.** M9 NOT STARTED.

**Workstream we were on:** finishing M8 by setting up the real WhatsApp integration in production under the **developer-owned** Meta setup (decision of 2026-09-23 — see Section 2, D1). This is the 7-step sequence in `08-vps-deployment.md` §11.3 "Next Steps".

**Last meaningful thing completed (as far as recovered):**
- The decision itself: stop trying to move the Meta app to the client, keep it permanently under the developer's Meta Business Portfolio, register the client's real number under the developer's WABA.
- Before that: systemd crash/reboot tests passed (2026-09-20); webhook verification handshake confirmed in production; NODE_ENV fixed; M8.5 login verified in production via curl and real browser.

**Infrastructure already proven in production:** HTTPS at the production domain, Nginx → Express routing, `/webhook` GET verification by Meta, systemd auto-restart (crash + reboot), session login through Nginx.

**Not yet proven in production (M8 acceptance still open):**
- Real outbound template send from production to a real phone.
- Real inbound reply from an arbitrary (non-tester) phone via webhook.
- Status callbacks (sent/delivered/read/failed) persisted in production.
- Scheduled follow-ups firing correctly against the production DB clock/timezone.
- Firewall check from outside (only 22/80/443 reachable; Postgres and Express port not).
- One manual backup + one manual restore.
- `certbot renew --dry-run` (listed in manual verification; not recorded as done).

**Waiting on the client / third parties:**
- Client must be present to receive the OTP when registering their real number under the developer's WABA (§11.3 step 2).
- Client's payment card must be added to the developer's Business Settings for Meta billing (step 4).
- A real, client-approved WhatsApp template must be written, submitted, and approved by Meta (step 6). The client must agree on the wording.
- Meta Business Verification (step 3) — should be started, but it does **not** block go-live.
- Amount of the recurring account-management fee — still TBD with client.

**When work resumes, do this first:**
1. Ask the developer which §11.3 steps are already done (WhatsApp product added? test WABA? number registered? System User token? template submitted?).
2. Continue from the first incomplete step. Order in §11.3 is deliberate: prove test WABA send/receive first, then register the real number.
3. Once a real number is Connected and a template is approved: close the remaining M8 production checks above, then move to M9.

**Do NOT work on yet:**
- M9 full end-to-end run with real leads — needs a Connected real number and an approved template first.
- Any client-ownership migration of the Meta app/WABA — abandoned (see Section 10).
- Any new features. Scope is closed except fixes needed to pass M8/M9.

---

## 2. Recent decisions and changes

**D1 — Meta app + WABA permanently owned by the developer** — ACTIVE (2026-09-23)
- Why: the client's personal Meta profile has a permanent identity/integrity restriction that blocks app creation and portfolio linking; all fix paths failed (Section 10). WABAs can't be moved between portfolios without a Tech-Provider Multi-Partner-Solution relationship, which the developer doesn't have.
- Replaced: the original rule "everything must be under the client's name" and the contract line "developer should not own the client's Meta Business Account". Also replaced the plan of App Review under the client's verified portfolio.
- Note: this is the standing setup, not temporary, unless renegotiated.
- Note: the contract file (`docs/contract/...`) and the Project Guide still say the client owns the Meta account. That text was not updated. The decision is recorded in `08-vps-deployment.md` §11.3 and `01-mvp-plan.md` M9.

**D2 — Recurring account-management fee** — ACTIVE, amount UNRESOLVED
- Why: covers ongoing liability/admin of owning the Meta account permanently.
- Separate from the $90 fixed price and from Meta's own usage fees (client pays Meta directly by card).
- Billing starts when the first real campaign is created and running.

**D3 — Handover = operational handover only** — ACTIVE
- Client gets full functional use. Meta account/app/WABA ownership stays with the developer.

**D4 — Login screen replaces static API token (M8.5)** — ACTIVE (2026-09-19)
- Why: the client is non-technical and shouldn't paste a raw token.
- Still single-user: one shared email+password used by both developer and client. No users table. Password hash in env var. Server-side sessions stored in Postgres (not JWT, no Redis).
- This was **added after the contract**. Treated as added scope, delivered.
- Replaced: `API_ACCESS_TOKEN`. Some docs still mention it (see Section 6, doc drift).

**D5 — Meta tier: stay on Tier 1 (250 unique customers / 24h)** — ACTIVE
- Client explicitly said this is enough. So Business Verification is nice-to-have, not a blocker.
- Separate from the app's own **daily sending limit of 150/day**, which stays at 150 per the contract even though the code allows changing it per campaign.

**D6 — Use a System User permanent token for production**, not a personal user token — ACTIVE (part of §11.3 step 5).

**D7 — Client ad-account appeal / client portfolio verification path** — SUPERSEDED by D1. Business Verification is still useful later for higher tier limits.

**D8 — Import default country = GB** — ACTIVE, client-specific
- Phone numbers without `+` are parsed as UK numbers. Documented in `04-database-design.md` §5 and in `leadRowValidator.ts`. See Section 11 for a location inconsistency.

**D9 — Frontend served by Nginx as static files, not by Express** — ACTIVE (documented in `06-deployment.md` §4). No extra context.

**D10 — Backup retention defaults to 7 days, local-disk only to start** — TEMPORARY default, not confirmed by the developer.

---

## 3. Client-specific knowledge

Confirmed:
- Client is a friend of the developer. Contract says client is in Jordan. Developer is in Lebanon.
- Price: $90 total. First $45 received. Second $45 due before final handover.
- Client is non-technical (reason for adding the login screen).
- Client's Meta situation: personal profile permanently restricted; their Business Portfolio is unverified; its ad account was restricted for an ad-policy violation (which also blocked adding the developer as Admin). Appeal was filed, then the path was abandoned.
- WhatsApp number: the client registers a **UK phone number**. Memory says it belongs to a friend of the client; §11.3 calls it "the client's real business phone number". The client must be present for OTP.
- Client pays Meta usage directly via their own card added to the developer's Business Settings.
- Client asked for a 250 unique-customers/24h Meta cap (Tier 1) — enough for their volume.
- Client agreed to a recurring account-management fee (amount TBD).
- Client accepted operational-only handover.
- Developer gave the client an estimate of ~1–1.5 weeks of remaining active dev work, excluding Meta approval time. (Given mid-September; likely needs refreshing with the client.)
- Third-party BSPs (Twilio, WATI, etc.) were ruled out — official Meta Cloud API only.

Client must still provide/do:
- Be present for real-number OTP registration.
- Add payment card in Business Settings.
- Agree template wording.
- Business registration documents if/when Business Verification is pursued.
- Confirm the account-management fee amount.
- Real lead file(s) for M9.

Our assumptions (not confirmed by client):
- Leads are UK numbers (basis for GB default).
- 7-day backup retention is acceptable.

Compliance (from contract, still applies): client is responsible for lead source, opt-in/consent, legality, policy compliance. Google Maps numbers are not automatically opted-in. Note: because the developer now owns the Meta account, a policy violation by the client's outreach would hit the **developer's** portfolio. This is part of why the fee exists; worth keeping in mind when advising on campaign behavior.

---

## 4. Meta / WhatsApp / Facebook operational knowledge

**Ownership now:**
- Meta app `message-outreach-dashboard` (App ID is in `08-vps-deployment.md` §11.3) lives in the **developer's** Business Portfolio. It always did; the plan to move it to the client was cancelled.
- The WABA will be the developer's. The client's real UK number is to be registered under it.

**Client side (dead end):**
- Personal profile: permanent identity/integrity restriction. Blocks app creation and portfolio linking.
- Portfolio "UK Digital Assets": unverified. Ad account restricted → Meta blocks adding Admin-level people (Employee-level still allowed).
- No alternate admin on the client's Business Manager.

**Proven so far:**
- M1: real send, webhook receive, and status events proven with the developer's own test app/number, using Meta's dashboard "Test" tool for webhook payloads (unpublished/Standard-access apps don't get real production webhook traffic from arbitrary numbers).
- M4–M6: real Meta sends (initial template, follow-ups, inbox reply incl. a real Meta-failure branch) proven in dev.
- Production: Meta's GET verification handshake reached `/webhook` and got 200.

**Still pending:**
- WhatsApp product + test WABA under the current app, end-to-end test (§11.3 step 1) — status unknown after 2026-09-23.
- Real number registered and showing Connected.
- System User permanent token in production `.env`.
- Webhook subscribed to `messages` and `message_status` fields.
- Approved real template.
- Real inbound from an arbitrary phone in production.

**Access level note:** earlier, `whatsapp_business_messaging` was at Standard Access (testers/admins only), which blocks receiving from real customers. Under the old plan this needed App Review on a verified portfolio. Under D1, re-check in the Meta dashboard what access level the app actually needs/has once the WABA is set up — do not assume the old App-Review requirement still holds or is gone; verify.

**Do not retry unless conditions change:** see Section 10.

**Lesson from M1:** a misconfigured Meta app structure (e.g. WhatsApp product nested under Facebook Login) can silently break the integration. Check app structure early when adding the WhatsApp product.

---

## 5. Production / VPS operational knowledge

Most of this is in `06-deployment.md` and `08-vps-deployment.md`. Extra context:

- Provider: Contabo. Production domain: `osama.cyou` (webhook at `/webhook`).
- Service name used in commands: `whatsapp-backend` (systemd). Nginx in front.
- NODE_ENV was wrongly `development` on the VPS; fixed to `production`. Only used for a log line (`src/index.ts`), so the change was safe.
- **Session cookies behind Nginx:** secure cookies only worked once Nginx forwarded `X-Forwarded-Proto` and Express trusted the proxy. If login "succeeds" but the session doesn't stick, check this first.
- `/webhook` must stay outside session auth. It's guarded only by `META_WEBHOOK_VERIFY_TOKEN`.
- Webhook must always return 200 quickly, also through Nginx.
- Webhook debugging patterns that already bit us (dev/ngrok era): port mismatch, missing `/webhook` path in the Callback URL, backend not running when Meta tries to verify.
- Production `.env` must have its own values (not dev copies), `chmod 600`, owned by the service user. Env vars now: PORT, DATABASE_URL, META_ACCESS_TOKEN, META_PHONE_NUMBER_ID, META_WEBHOOK_VERIFY_TOKEN, NODE_ENV, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH. No API_ACCESS_TOKEN.
- When the real number is registered, `META_PHONE_NUMBER_ID` and `META_ACCESS_TOKEN` will change (System User token). Settings table also holds `whatsapp_phone_number_id` — make sure the two don't disagree.
- Postgres runs natively (no Docker), dev and prod.

---

## 6. Known issues and accepted limitations

| Item | Type | Impact | Decision | Revisit |
|---|---|---|---|---|
| Follow-up crash-window double send (crash after Meta send succeeds, before status write) | Accepted limitation | Rare duplicate follow-up to a lead | Not fixing for MVP | Reconfirm and disclose to client at M9 handover |
| Auto-reply detection is rule/pattern based | Limitation | Some auto-replies may count as human replies or vice versa | By design; never promise 100% | Only if client reports real misses |
| Real inbound from arbitrary numbers not yet proven in production | External blocker → now depends on §11.3 steps | Core workflow unproven in prod | Must be closed in M8 | Now |
| Account-management fee amount TBD | Commercial open item | Billing can't start cleanly | Must agree with client | Before first real campaign |
| Backup retention (7 days default) and off-box storage | Deferred decision | Data-loss risk if VPS disk fails | Start local-only | Before handover, or if client asks |
| Manual backup+restore, firewall external check, certbot dry-run not recorded as done | Open M8 checks | — | Must do | During M8 |
| **Doc drift:** `03-backend-architecture.md` §7/§8 and `08-vps-deployment.md` §2/§6 still mention `API_ACCESS_TOKEN` | Docs bug | Could mislead a coding agent into re-adding the token | Should be updated to session auth | Next doc touch |
| **Doc drift:** `08-vps-deployment.md` §7 still shows the inbound-reply item as BLOCKED with the old root cause (unverified client portfolio); §11.1 still cites the "client's name" rule | Docs bug | Stale reasoning | §11.3 supersedes; update §7 when the item closes | During M8 |
| **Doc drift:** `01-mvp-plan.md` M8 note says ownership was "transferred to developer's portfolio" — app was always there; the decision was to *keep* it | Wording | Minor confusion | Fix wording if touched | Low priority |
| **Doc drift:** contract file + Project Guide still say client owns Meta account | Docs vs decision | Contract text no longer matches reality | Decision recorded elsewhere; consider a short addendum | Before handover |
| `05-product-backlog.md` exists but is empty; `01-mvp-plan.md` is titled "Product Backlog" | Docs inconsistency | Unclear which file is the backlog | Unknown intent | Ask developer |
| Contract support excludes "Meta/WhatsApp problems", but developer now owns the Meta account | Commercial gap | Unclear who handles Meta issues post-handover | Presumably covered by the account fee — not confirmed | With fee discussion |

---

## 7. Scope history

**Original MVP:** see the contract (`docs/contract/WhatsApp Outreach Dashboard.md`) — no additional Claude-only context.

**Added scope:**
- M8.5 Authentication (login screen, single shared credential, server-side sessions). Added 2026-09-19, delivered. Labeled as post-contract scope in the plan.
- Permanent Meta account ownership/management by the developer + recurring account-management fee (commercial, not code).
- Not scope additions, but gaps found and built inside existing scope during M7: `GET /dashboard/stats` and settings endpoints (documented but never implemented earlier), and `sendInitialTemplate` failure handling (failed Meta send now leaves a FAILED trace, matching reply/follow-up paths).
- `withinCustomerServiceWindow` field on inbox detail (so the frontend doesn't reimplement the 24h rule).

**Explicitly rejected / deferred:**
- Third-party BSPs (Twilio, WATI, etc.).
- Redis/queues/workers, Docker, Kubernetes, CI/CD, staging env, managed DB, CDN.
- JWT (chose server-side sessions).
- Multi-user / per-person accounts (login is still one shared credential).
- AI auto-reply classification.
- Client-portfolio ownership migration / Tech-Provider MPS onboarding (not pursued).
- Everything in the contract's "Explicit exclusions" list.

**Potential future work (only what was discussed):**
- Meta Business Verification → higher messaging tiers if volume grows.
- Off-box backups if the client wants stronger guarantees.
- Credential rotation via UI (would need a single seeded user row) — mentioned as not needed for MVP.
- Renegotiating ownership later (would require Tech-Provider MPS) — only if the client situation changes.

---

## 8. Working preferences for this project

Beyond what's already in the project instructions (inspect first, reproduce, root cause, smallest fix, no unrelated refactors, no invented requirements, bug vs enhancement vs feature, preserve contracts, server-side rules, real workflow testing, risk-first order, simple infra):

- **Plain, simple English.** Don't mention details just to mention them. If detail is needed, say it briefly.
- Be a partner who challenges ideas; no automatic agreement, no generic praise.
- Clearly separate known / assumed / needs verification.
- Ask one focused question only when the answer really changes the outcome; otherwise assume and say so.
- Prefer **substantial** steps, not tiny fragments — but don't bundle unrelated work.
- Explicit approval before major changes.
- Docs: concise, practical; files over ~600 lines count as over-documented. Update docs only when behavior/decisions change. One source of truth per concern; flag doc/code disagreements instead of silently fixing one side.
- No commit messages/titles/plans unless asked.
- No code unless asked or doing implementation work.
- Client-facing messages: simple Lebanese/Levantine Arabic mixed with English technical terms.
- Scope additions must be named as additional work **before** doing them (M8.5 is the model: labeled as added scope in the plan).
- Known limitations get **disclosed, not hidden** (e.g. M1 synthetic-test limitation, M5 double-send window). Don't paper over gaps to mark something DONE.
- "DONE" means: acceptance criteria met, original scenario verified with real data/real Meta where relevant, edge/failure branches checked, docs updated with a Result section. Agent reports and passing tests alone don't count.
- Developer is a college student, working solo, using this project to learn real VPS/DevOps — prefer explaining ops steps so he can do them by hand, not hiding them in automation.

---

## 9. Coding-agent workflow

The loop that worked:
1. **Plan in the "senior" conversation** (architecture/review model): decide what the milestone or fix is, check scope against the contract, write/update the milestone doc in `docs/development-milestones/`.
2. **Milestone doc template:** Status, Must Read, Objective, Scope, Acceptance Criteria, Verification, Result, plus a checklist. The agent reads this file directly.
3. **Implementation prompt** includes: objective; files/docs to read first (the milestone doc, the relevant `docs/architecture/*` files, `docs/rules/*`, relevant `src/` paths and tests); scope + explicit exclusions; contracts to preserve (API shapes, webhook always-200, `/webhook` outside session auth, status lifecycle, one ACTIVE campaign); acceptance criteria; required automated tests, manual verification, and real/production verification.
4. **Agent works through the milestone steps and reports a full summary.** For normal milestones it can run all steps autonomously. For high-risk work (follow-up automation, security/auth, deployment, anything touching Meta logic) review **per step**.
5. **Review against the doc, not the report:** did it meet each criterion, was the real scenario run (real DB, real Meta send where relevant), were failure branches tested, did it stay in scope, did it add unrequested things.
6. If gaps: write a narrow fix prompt, repeat.
7. Update milestone Result + plan status table only after real verification.

Investigate manually (in conversation) before prompting when: behavior is unclear, a bug isn't reproduced yet, or the work touches Meta account/dashboard state (agents can't see that).

Model choice: cheap/fast model for routine, well-scoped work (CRUD, schema tweaks, UI once patterns exist). Stronger model for: debugging that fails after 1–2 attempts, cross-system ambiguity, auth/security, migrations, deployment, and anything touching the WhatsApp/Meta integration logic.

Repo has a `CLAUDE.md` router file and `.claude/skills/`; Context7 MCP was configured for docs lookup. Another agent may need its own equivalent entry file pointing to `docs/rules/project.md`.

---

## 10. Things already investigated — do not repeat blindly

**Getting the client's Meta setup usable**
- Tried: adding developer as Admin on client portfolio → blocked because of the restricted ad account. Ad-account appeal submitted → no SLA, path abandoned.
- Tried: client identity verification on web → loops forever at 2FA. Same on Facebook mobile app. No alternate admin exists.
- Result: client profile permanently restricted. Decision D1.
- Don't repeat unless: the client's profile restriction is lifted by Meta, **and** a Tech-Provider MPS relationship is available, **and** the client wants to renegotiate.

**Moving the WABA/app to the client later**
- Checked Meta's docs: WABA can't move between portfolios outside Tech-Provider MPS.
- Don't reopen without that relationship.

**Production inbound from real numbers (old root-cause chain)**
- Unverified client portfolio → no Advanced Access → Standard Access only → no real inbound. That chain belonged to the old client-ownership plan. Under D1 the path is §11.3; re-check access levels in the actual dashboard instead of re-deriving the old chain.

**Webhook reachability in production**
- Already proven (Meta GET handshake 200 in Nginx log; direct curl from VPS returns the challenge). If inbound events don't arrive later, suspect subscriptions/fields/token/access level, not Nginx routing.

**systemd resilience**
- Crash (kill -9) and full reboot tests passed. Don't redo unless the unit file changes.

**NODE_ENV**
- Already fixed and checked to be cosmetic only.

**Session cookie through Nginx**
- Solved via X-Forwarded-Proto + proxy trust. Re-check only if Nginx config changes.

**Dev webhook issues (ngrok era)**
- Port mismatch, missing `/webhook` in Callback URL, backend not running during verification — all known causes; check these first if webhook verification fails again.

---

## 11. Unresolved questions

1. **Which §11.3 steps were done after 2026-09-23?** — Determines where to resume. Developer. **Blocks** resuming correctly.
2. **Account-management fee amount** (and billing mechanics). — Needed before first real campaign. Developer + client. Blocks billing, not dev.
3. **Template wording** for initial + 2 follow-ups, and language. — Needed for Meta approval. Client. **Blocks** real campaign/M9.
4. **Client location vs lead country:** contract says Jordan; DB doc says "only client is UK-based"; number is UK; portfolio is "UK Digital Assets". Is the target market UK leads (so GB default is right)? — Wrong default would mis-normalize imports. Developer/client. Doesn't block M8; matters before M9 import.
5. **Does the app need Advanced Access / App Review for the developer-owned WABA to message and receive from real customers?** — Must be verified in the Meta dashboard, not assumed. Developer. May block real inbound.
6. **Backup retention and off-box storage** — confirm 7 days / local-only. Developer. Non-blocking.
7. **Who handles Meta/WhatsApp issues post-handover** given the contract excludes them but the developer owns the account — is it covered by the fee? Developer + client. Non-blocking for code.
8. **Role of `05-product-backlog.md`** (empty). Developer. Non-blocking.

---

## 12. Next-actions snapshot

1. **NEXT** — Confirm which §11.3 steps are done, then continue from the first incomplete one: test WABA send/receive → register client's real number (client present for OTP) → add client's card → System User permanent token + webhook fields → submit real template(s).
2. **AFTER THAT** — Close remaining M8 production checks: real outbound send, real inbound from an arbitrary phone, status callbacks persisted, follow-up timing on prod clock, external firewall check, `certbot renew --dry-run`, one backup + restore. Update `08-vps-deployment.md` §7 (replace the stale BLOCKED item) and fix the `API_ACCESS_TOKEN` doc drift.
3. **BEFORE HANDOVER** — M9: real lead file import → full workflow in production; disclose the double-send limitation and best-effort auto-reply detection; agree the account-management fee; confirm template approval; consider a short contract addendum for D1; collect second $45 payment; operational handover only.
4. **DO NOT START YET** — M9 real campaign (needs Connected number + approved template); any ownership migration; any new feature beyond the contract + M8.5.

---

## 13. Conversation-only knowledge

- M2 surfaced two concurrency bugs and one status-semantics bug in webhook persistence; all fixed. Webhook/status code is an area where subtle ordering bugs have appeared before — review carefully.
- M1 was intentionally closed with a synthetic-test proof and a clearly documented limitation rather than claiming full production proof. That honesty pattern is expected going forward.
- The developer flagged M5 and security-sensitive parts of M8 for tighter per-step review because of high ambiguity and blast radius. Apply the same to the remaining Meta/production steps.
- Daily limit: 150/day is the contract number; keep it unless the client asks. Meta's 250/24h tier is a separate, external cap.
- The real client-approved template was always a separate, external-approval task, not dev work — don't let it hide inside a milestone.
- An earlier memory note said "client's Meta Business Account must remain under the client's ownership; developer has partner access only — non-negotiable." **This is superseded** by D1. Don't treat it as current.
- Docs live under `docs/contract/`, `docs/architecture/`, `docs/planning/`, `docs/rules/`, `docs/development-milestones/`, `docs/testing/`.
