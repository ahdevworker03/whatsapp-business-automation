# Deployment

## 1. Overview

Single small VPS, manually provisioned and managed. No containers, no orchestration, no managed platform services. Reason: DevOps learning goal, and the project scale (~150 messages/day, single user) does not need more.

## 2. Provider

**Contabo** — cheapest small VPS tier that meets the requirements below.

Note: Contabo's entry-level plans can have less predictable disk I/O and network performance than DigitalOcean/Hetzner at the same price point. Run a basic disk write sanity check (`dd` or `fio`) after provisioning, before relying on it for production. If performance is a problem in practice, the fix is switching provider — not adding infrastructure.

## 3. Server Topology

```
Internet
  → Nginx (80/443, HTTPS via Let's Encrypt)
      → /api/v1/*  → Express (systemd service, localhost only)
      → /webhook   → Express (same service)
      → /          → static frontend files (served directly by Nginx)
  → Express → PostgreSQL (localhost only, not exposed externally)
```

- Nginx is the only process exposed to the internet (ports 80/443).
- Express listens on localhost only (e.g. 127.0.0.1:PORT), never bound to a public interface.
- PostgreSQL listens on localhost only.
- node-cron scheduler runs inside the same Express process — no separate service.

## 4. Frontend Serving

**Decision: Nginx serves the built static frontend files directly.** Express is not involved in serving the frontend.

Reasoning: simpler than adding static-file middleware/routes to Express, better raw performance for static assets, and keeps Express scoped to API/webhook/scheduler logic only — consistent with existing architecture principles (03-backend-architecture.md §1).

Build output (`frontend/dist` or equivalent) is copied to a directory on the VPS (e.g. `/var/www/whatsapp-dashboard/`) and Nginx serves it with a fallback to `index.html` for client-side routing.

## 5. Process Management — systemd

The Express backend runs as a systemd service (no PM2, no Docker).

Minimum requirements for the unit file:

- Runs as a **non-root** dedicated user (not root, not the SSH login user)
- `Restart=on-failure` (auto-restart on crash)
- `WantedBy=multi-user.target` (starts on boot)
- Working directory set to the backend deploy path
- Environment loaded from an `.env` file outside version control (see §7)
- stdout/stderr captured by journald (`journalctl -u <service-name>`)

## 6. Nginx Configuration

- Terminates HTTPS (Let's Encrypt via Certbot, auto-renewal via certbot's systemd timer)
- Reverse-proxies `/api/v1/*` and `/webhook` to the Express service on localhost
- Serves static frontend files for all other paths, with SPA fallback to `index.html`
- `/webhook` must NOT be behind the login-based auth layer — that check happens inside Express per 05-api-design.md §11, Nginx just passes the request through
- Standard security headers (recommended, not previously specified): `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

## 7. Environment Variables and Secrets

Per 03-backend-architecture.md §7, updated 2026-09-19 for the login-based auth scheme in 05-api-design.md §11 (replaces the single-user static token with a login screen backed by the same single shared credential — see the scope note there):

- `PORT`
- `DATABASE_URL`
- `META_ACCESS_TOKEN`
- `META_PHONE_NUMBER_ID`
- `META_WEBHOOK_VERIFY_TOKEN`
- `NODE_ENV=production`
- ~~`API_ACCESS_TOKEN`~~ — removed. Replaced by:
  - `SESSION_SECRET` — signs the server-side session-ID cookie (decided: server-side sessions, not JWT, per 05-api-design.md §11.4)
  - `ADMIN_EMAIL` — the single shared login email
  - `ADMIN_PASSWORD_HASH` — bcrypt hash of the single shared login password, checked at login time (05-api-design.md §11)

Rules:

- `.env` lives on the VPS only, outside the git repo, readable only by the service user (`chmod 600`)
- Never committed, never logged, never included in deployment scripts in plaintext
- `META_ACCESS_TOKEN` in particular is a long-lived credential — treat it like a production secret, not a dev convenience
- `SESSION_SECRET` and `ADMIN_PASSWORD_HASH` follow the same rules — never committed, never logged, `chmod 600`. `SESSION_SECRET` should be a high-entropy generated value, not a memorable password

## 8. Database

- PostgreSQL installed directly on the VPS (no managed DB service — unnecessary cost/complexity at this scale)
- Localhost-only, no external port exposure
- Dedicated non-superuser role for the application, scoped to its own database
- Prisma migrations (`prisma migrate deploy`) run as part of each deployment, not `migrate dev`

## 9. Backups

- Daily `pg_dump` of the database, retained for a short rolling window (e.g. 7 days) — exact retention not yet decided, default to 7 days unless told otherwise
- Stored outside the VPS's primary disk if feasible (e.g. pulled off-box or to object storage) — deferred detail, acceptable to start with local-disk backups and revisit if the client asks for stronger guarantees
- No automated restore testing required for MVP scope; a manual restore should be verified once during M8 as a sanity check, not repeated per deploy

## 10. Firewall

- UFW enabled
- Allow: 22 (SSH, ideally key-only, consider non-default port or fail2ban), 80, 443
- Deny everything else by default, including direct access to Postgres and the Express port

## 11. Deployment Process (Manual)

No CI/CD pipeline for MVP — manual deploy is acceptable at this scale and fits the DevOps learning goal. Rough flow:

1. `git pull` on the VPS
2. Backend: `npm install`, `npx prisma migrate deploy`, `npm run build` (if applicable), restart systemd service
3. Frontend: build locally or on the VPS, copy `dist/` output to the Nginx static directory
4. Verify: hit a health endpoint, tail logs, confirm webhook still reachable

A deployment script (bash) is reasonable to reduce manual error — not a CI system.

## 12. DNS

- A domain (or subdomain) must point to the VPS IP before HTTPS/Certbot and Meta webhook registration can be finalized
- Domain choice/cost is the client's responsibility per the contract (domain costs excluded from the $90 MVP price, per Project Guide "Explicit exclusions")

## 13. What This Is Not

- No Docker, no Kubernetes, no orchestration
- No CI/CD pipeline
- No managed database service
- No CDN
- No load balancer / no horizontal scaling
- No staging environment separate from production (not in scope for this MVP's budget/size)

## 14. Open Items

- Backup retention window: defaulted to 7 days above, confirm or change
- Whether backups should leave the VPS (off-box) — deferred, acceptable to start local-only
