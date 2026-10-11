---
name: testing
description: Use when the task involves tests or test infrastructure. This repository currently defines Vitest in the backend; inspect existing tests and installed dependencies before choosing a test method, and do not assume React Testing Library, Supertest, or Playwright is installed.
---

# Testing

Use tests to verify behavior when the task or user request calls for them. Follow the test setup that already exists in the affected package.

## Workflow

1. Inspect nearby tests, package scripts, and test configuration before selecting commands or libraries.
2. Prefer a focused test for the changed behavior. Do not add a test framework or test dependency without a concrete need.
3. Cover meaningful success, invalid-input, and failure cases, including session or external-provider boundaries where relevant.
4. Keep tests isolated from live Meta services, real contacts, production databases, and external side effects. Mock provider calls or use an explicitly configured test environment.
5. Report exactly which checks ran and their results. Do not claim browser or integration coverage that was not performed.

## Current repository signals

The backend package declares Vitest. Check the frontend package and existing tests before assuming it has a test runner. Do not assume React Testing Library, Supertest, Playwright, or Cypress is installed.
