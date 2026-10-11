# Repository instructions

Codex skills are stored in `.agents/skills/<skill-name>/SKILL.md`. At the start of a task, select and read only the skill or skills that match the task; read their referenced materials when needed. Skill frontmatter descriptions are the discovery metadata Codex uses to choose relevant skills.

Codex project MCP servers are configured in `.codex/config.toml`. Do not treat the root `.mcp.json` as Codex's project configuration.

## Skill Routing

- API contract or endpoint design: `api-design`; Express routes and middleware: `express`; request input: `validation`; errors: `error-handling`.
- Prisma models or queries: `prisma`; relational schema: `database-schema-design`; SQL tuning: `postgresql`; migration work: `migrations`.
- React UI: `react`; visual design, audit, or polish: `impeccable`; styling with Tailwind when the project uses it: `tailwind`; browser/server data requests: `data-fetching`.
- TypeScript: `typescript`; tests or test infrastructure: `testing`; diagnosis: `debugging`; review: `code-review`.
- Environment or MCP setup: `environment-config`; Git operations: `git`; CI workflow changes: `github-actions`; frontend diagnostics when specifically relevant: `react-doctor`.
- For component/file structure decisions, use `folder-architecture` alongside the more specific skill.

Do not load every skill by default. If a skill assumes a library, script, or repository path, check that it exists here before following that part of its guidance.

Read `docs/rules/project.md` first, then only the rule files relevant to the task. Task routing:

- Bug fix: project, development-workflow, coding-standards, testing.
- New feature: project, development-workflow, coding-standards, backend (if backend), database (if schema), testing.
- Backend work: project, backend, coding-standards, api-contracts (if endpoints change), testing.
- Database/schema: project, database, api-contracts (if API affected), testing.
- API contract: project, api-contracts, backend.
- Documentation: project, development-workflow.
- Testing: project, testing.

Explicit user instructions take priority, followed by `docs/rules/project.md`, architecture docs, relevant rules, existing patterns, and assumptions. Never let assumptions override `docs/contract/WhatsApp Outreach Dashboard.md`. Do not commit without explicit instruction.

If documentation and code disagree, report it; do not silently change working code to match stale docs. Load only relevant rules and skills. Before implementing or changing integrations that use Express, Prisma, PostgreSQL, node-cron, or Meta WhatsApp Cloud API, use the configured Context7 MCP to retrieve current documentation without waiting for the user to request it. If Context7 is unavailable, say so and use the package's official documentation. The Context7 key must come from the `CONTEXT7_API_KEY` environment variable; never copy it into project files.
