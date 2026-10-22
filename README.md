# WhatsApp Outreach Dashboard

A full-stack business outreach dashboard for managing leads, running WhatsApp campaigns, automating scheduled follow-ups, and handling inbound conversations through the **official Meta WhatsApp Cloud API**.

Built as a real client project with a React/TypeScript frontend, Node.js/Express backend, PostgreSQL database, webhook-driven WhatsApp integration, and Linux VPS deployment.

## Overview

The application turns an Excel/CSV lead list into a structured outreach workflow:

```text
Excel / CSV leads
      ↓
Lead import & validation
      ↓
Campaign configuration
      ↓
Initial WhatsApp template
      ↓
Scheduled follow-ups
      ↓
Inbound webhook processing
      ↓
Human reply detected
      ↓
Automation stops
      ↓
Conversation handled in Inbox
```

The system was designed for a focused single-user workflow rather than as a multi-tenant SaaS platform.

## Screenshots

### Dashboard

<p align="center">
  <img src="./docs/screenshots/dashboard.png" alt="WhatsApp Outreach Dashboard overview" width="900">
</p>

### Lead Management

<p align="center">
  <img src="./docs/screenshots/leads.png" alt="Lead import and management interface" width="900">
</p>

### Campaign Automation

<p align="center">
  <img src="./docs/screenshots/campaign.png" alt="WhatsApp campaign and follow-up automation configuration" width="900">
</p>

### Inbox

<p align="center">
  <img src="./docs/screenshots/inbox.png" alt="WhatsApp conversation inbox" width="900">
</p>

## Core Features

### Lead Management

- Import leads from CSV and Excel files
- Normalize phone numbers into E.164 format
- Detect duplicates and invalid rows
- Track lead status throughout the outreach lifecycle
- Store source and campaign relationships in PostgreSQL

### WhatsApp Cloud API Integration

- Uses the official Meta WhatsApp Cloud API
- Sends approved WhatsApp message templates
- Receives inbound messages through Meta webhooks
- Processes message status events
- Stores outbound and inbound message history
- Supports manual replies from the dashboard

### Campaign Management

- Create and configure outreach campaigns
- Configure initial and follow-up templates
- Configure follow-up delays
- Enforce a daily sending limit
- Allow only one active campaign at a time
- Support campaign lifecycle states such as draft, active, paused, and archived

### Follow-up Automation

Follow-ups run through an in-process `node-cron` scheduler.

The workflow supports:

```text
Initial message
      ↓
No human reply
      ↓
Follow-up #1
      ↓
No human reply
      ↓
Follow-up #2
```

When a genuine human reply is received, the conversation is marked accordingly and the remaining automated follow-ups stop.

Automatic-response detection is **rule-based**, not AI-based.

### Inbox

- View conversations generated from inbound WhatsApp messages
- Inspect message history
- Send manual text replies
- Track active and closed conversations
- Respect WhatsApp's customer-service messaging window
- Preserve conversation and message state in PostgreSQL

### Authentication

The dashboard is protected by session-based authentication.

The backend uses:

- shared administrator credentials
- bcrypt password hashing
- server-side sessions
- PostgreSQL-backed session storage
- authenticated `/api/v1/*` routes
- independent webhook verification for Meta callbacks

## Application Areas

The frontend contains six primary routes:

| Route | Purpose |
| --- | --- |
| `/login` | Administrator authentication |
| `/` | Dashboard and outreach statistics |
| `/leads` | Lead import and management |
| `/campaign` | Campaign configuration and status |
| `/inbox` | WhatsApp conversations and replies |
| `/settings` | WhatsApp and automation settings |

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router

### Backend

- Node.js
- TypeScript
- Express
- Prisma ORM
- `node-cron`
- `express-session`
- `connect-pg-simple`
- `bcrypt`
- ExcelJS
- CSV Parse
- libphonenumber-js

### Data

- PostgreSQL
- Prisma migrations
- Relational data model

### Integration

- Meta WhatsApp Cloud API
- Meta webhooks
- WhatsApp approved templates

### Deployment

- Linux VPS
- PostgreSQL on the VPS
- systemd-managed backend service
- HTTPS reverse-proxy deployment
- environment-based secret management

## Architecture

The application intentionally uses a small single-service architecture.

```text
                     ┌───────────────────┐
                     │   React Frontend  │
                     └─────────┬─────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │   Express API     │
                     │                   │
                     │ REST API          │
                     │ Webhook handler   │
                     │ Scheduler         │
                     └──────┬─────┬──────┘
                            │     │
                ┌───────────┘     └─────────────┐
                ▼                               ▼
       ┌─────────────────┐             ┌─────────────────┐
       │   PostgreSQL    │             │ Meta Cloud API  │
       │     Prisma      │             │    WhatsApp     │
       └─────────────────┘             └─────────────────┘
```

The design deliberately avoids unnecessary infrastructure such as microservices, Redis, or an external job queue for the current workload.

## Data Model

The core domain consists of:

### `Lead`

Represents an imported prospect and tracks progression through the outreach lifecycle.

Typical states include:

```text
NEW
→ CONTACTED
→ FOLLOWUP_1_SENT
→ FOLLOWUP_2_SENT
→ COMPLETED
```

A human reply moves the lead to `REPLIED`, while delivery problems can move it to `FAILED`.

### `Campaign`

Stores campaign configuration including:

- templates
- follow-up delays
- daily sending limit
- lifecycle status

### `Message`

Stores inbound and outbound WhatsApp communication, including:

- direction
- message type
- delivery state
- Meta message ID
- sent/delivered/read timestamps
- auto-reply classification

### `Conversation`

Connects a lead with its inbox conversation and records whether outreach automation has been stopped.

### `Settings`

Stores application-level WhatsApp and rule-based auto-reply settings.

## Repository Structure

```text
.
├── backend/
│   ├── prisma/
│   ├── scripts/
│   ├── src/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   └── pages/
│   └── package.json
│
└── docs/
    ├── architecture/
    ├── planning/
    ├── rules/
    └── testing/
```

The repository also contains architecture, database, API, testing, and engineering-decision documentation for deeper inspection.

## Local Development

### Requirements

- Node.js 18+
- PostgreSQL
- npm
- Meta developer credentials if testing live WhatsApp functionality

### 1. Clone the repository

```bash
git clone https://github.com/ahdevworker03/whatsapp-business-automation.git
cd whatsapp-business-automation
```

### 2. Configure the backend

```bash
cd backend
npm install
cp .env.example .env
```

Configure the required values in `.env`:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME

META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=
META_API_VERSION=v21.0
META_WEBHOOK_VERIFY_TOKEN=

ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
SESSION_SECRET=
```

Generate a bcrypt password hash, for example:

```bash
node -e "console.log(require('bcrypt').hashSync('your-password', 10))"
```

Use the resulting value as `ADMIN_PASSWORD_HASH`.

### 3. Prepare the database

Configure `DATABASE_URL`, then apply the Prisma migrations appropriate for your local environment.

### 4. Start the backend

```bash
npm run dev
```

The backend defaults to:

```text
http://localhost:3000
```

### 5. Start the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will display the local frontend URL in the terminal.

## Available Commands

### Backend

```bash
npm run dev
npm run build
npm start
npm test
```

### Frontend

```bash
npm run dev
npm run build
npm run type-check
npm run preview
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Express server port |
| `NODE_ENV` | Runtime environment |
| `DATABASE_URL` | PostgreSQL connection |
| `META_ACCESS_TOKEN` | Meta Cloud API access credential |
| `META_PHONE_NUMBER_ID` | WhatsApp phone-number identifier |
| `META_API_VERSION` | Meta Graph API version |
| `META_WEBHOOK_VERIFY_TOKEN` | Webhook verification secret |
| `ADMIN_EMAIL` | Dashboard login |
| `ADMIN_PASSWORD_HASH` | bcrypt password hash |
| `SESSION_SECRET` | Server-side session signing secret |

Secrets should never be committed to version control.

## Engineering Decisions

Several implementation decisions were deliberately kept simple for the expected workload.

### In-process scheduling

Follow-up jobs use `node-cron` rather than Redis/BullMQ or a distributed worker system.

For the application's scale, an external queue would add infrastructure without providing meaningful benefit.

### PostgreSQL over lightweight local storage

Lead, campaign, message, conversation, authentication-session, and workflow state require relational consistency and persistent history, making PostgreSQL a natural fit.

### Official WhatsApp API only

The system integrates with Meta's official Cloud API rather than browser automation or unofficial WhatsApp libraries.

### Rule-based auto-reply detection

Automated-reply detection is configurable and deterministic. There is currently no AI/ML classifier involved.

### Single-user architecture

This project is intentionally a single-user business tool. Multi-tenancy, user organizations, and role-based account management are outside its scope.

## Security Considerations

The application separates runtime secrets from the codebase and uses environment variables for sensitive configuration.

Relevant measures include:

- bcrypt password hashing
- server-side sessions
- authenticated API routes
- independent Meta webhook verification
- PostgreSQL isolated from direct public access in deployment
- environment files excluded from Git
- no Meta access token committed to the repository

## Documentation

More detailed technical documentation is available under [`docs/`](./docs/), including:

- system architecture
- technology decisions
- backend architecture
- database design
- API design
- deployment architecture
- testing and verification findings
- repository engineering rules

## Scope

This project intentionally does **not** include:

- multi-tenancy
- multiple user roles
- microservices
- Redis or a distributed job queue
- Kubernetes
- AI-generated replies
- AI-based lead classification
- unofficial WhatsApp automation

These are deliberate scope boundaries rather than missing dependencies.

## Background

This system originated as a paid freelance client project.

The work included:

- direct requirements gathering
- defining project scope
- translating a business outreach process into software workflows
- designing the frontend, backend, API, and data model
- integrating with the official Meta WhatsApp platform
- validating real WhatsApp messaging behavior
- deploying the application to a Linux VPS
- iterating based on client feedback

The project is included publicly as an example of practical full-stack development, business-process automation, third-party API integration, and production-oriented software engineering.

## Author

**Abdallah Hassoun**  
Junior Software Developer

- Portfolio: [abdallahhassoun.com](https://www.abdallahhassoun.com/)
- GitHub: [@ahdevworker03](https://github.com/ahdevworker03)
- LinkedIn: [ahdevworker03](https://linkedin.com/in/ahdevworker03/)
