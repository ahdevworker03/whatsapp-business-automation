---
name: data-fetching
description: Use for frontend requests to the dashboard backend, including loading, error, refresh, and mutation states. Inspect the existing frontend request patterns and installed dependencies before choosing an approach; do not assume TanStack Query or a generated API client is installed.
---

# Data Fetching

Use this skill for dashboard frontend code that reads or changes backend data.

## Workflow

1. Inspect the existing frontend request code and backend route contract before changing either side.
2. Reuse the project's current request, state, and error handling patterns. Do not add a data-fetching library unless the user asked for it or the change requires it.
3. Keep loading, empty, success, and error states clear. Prevent duplicate submissions and stale responses where relevant.
4. Handle cancellation or component unmounts using the existing approach. Keep authentication and session behavior consistent with the backend.
5. Preserve response shapes and API semantics. If the UI needs a different shape, make the contract change explicit and update both sides only when in scope.
6. Do not log contact details, message content, credentials, or provider tokens.

## Boundaries

- Styling-only work belongs to `react` or `impeccable`.
- Express endpoints belong to `express` and `api-design`.
- Database reads and writes belong to `prisma`.
- Check current dependencies before using examples that mention TanStack Query, Axios, generated clients, or cache libraries.
