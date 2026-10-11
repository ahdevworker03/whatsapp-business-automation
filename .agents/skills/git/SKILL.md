---
name: git
description: Use for Git status, branch, diff, conflict, or release workflows. Preserve unrelated worktree changes. Do not commit, push, or rewrite history unless the user explicitly asks.
---

# Git

Use Git commands to inspect and manage repository history while preserving the user's work.

## Rules

- Inspect `git status` and the relevant diff before changing files or staging anything.
- Do not discard, overwrite, or stage unrelated changes.
- Stage only files directly requested or needed for the requested change.
- Do not commit, push, reset, rebase, amend, or rewrite history unless the user explicitly asks.
- Keep changes scoped and make conflict resolution visible.
- Do not assume a branch strategy, release flow, or commit convention that this repository has not documented.
