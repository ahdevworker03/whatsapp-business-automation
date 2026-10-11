---
name: github-actions
description: Use when creating or changing GitHub Actions workflows under `.github/workflows/`, including CI, build, test, deployment, caching, and workflow security for this repository.
---

# GitHub Actions

Use this skill only for requested changes to GitHub Actions workflows.

## Workflow

1. Inspect the existing workflow files, package scripts, and repository structure before proposing changes.
2. Match the actual project setup. Do not assume a monorepo, pnpm, Turborepo, Nx, Vercel, or a deployment target unless the repository config confirms it.
3. Give workflow jobs the least permissions needed. Pin or update actions consistently with existing repository policy.
4. Use secrets for credentials. Never print, commit, or place secret values in workflow files.
5. Keep caching keyed to the package manager and lockfiles actually used here.
6. Do not add CI jobs or deployment behavior outside the user's requested scope.
