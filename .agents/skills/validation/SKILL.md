---
name: validation
description: Use for validating backend request bodies, query parameters, route parameters, uploaded files, phone numbers, and imported contact data. Inspect the current validation libraries and patterns before choosing a schema approach; do not assume Zod is installed.
---

# Validation

Validate untrusted input at system boundaries, then pass normalized, validated values into application logic.

## Workflow

1. Inspect the current route, data model, API contract, and validation dependencies.
2. Reuse the validation approach already installed in the relevant package. Do not add Zod or another dependency unless the user asked for it or it is necessary and approved.
3. Validate required fields, types, lengths, ranges, formats, and cross-field rules. Treat body, query, path, uploaded-file, webhook, and imported data as separate input sources.
4. Normalize values only when the contract allows it. Keep raw input handling separate from validation so errors remain understandable.
5. Return the repository's established client error format. Do not echo sensitive values or provider credentials in errors or logs.
6. Use database constraints as a final integrity boundary; request validation does not replace them.

## Dashboard-specific inputs

For phone numbers, contact imports, and message templates, follow the approved product contract and existing backend behavior. Do not invent acceptance rules for country codes, consent, message content, or import columns.
