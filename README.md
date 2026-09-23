# TenantFlow · multi-tenant AI workflow SaaS

> Independent clean-room portfolio demo. Synthetic organizations, knowledge and content. No company source, UI or customer data.

![Architecture](docs/images/architecture.svg)

## Demo

Node 23+: `npm test`, then `npm start`, open <http://localhost:8788>. Demo logins: `hq@example.com` / `demo-hq-only`, `store@example.com` / `demo-store-only`, `review@example.com` / `demo-review-only`. Passwords are public sample values, not security controls.

## Problem and design

Show how enterprise knowledge can flow from HQ to a store while private items remain isolated and content passes a human review gate. [Architecture, data model, RBAC and state machine](docs/architecture.md) describe each permission. `src/core.ts` owns the policy; `src/server.ts` exposes a tiny demo API; `web/` shows three account views. JSON demo storage is local and excluded from Git.

## Features and verification

Tenant filtering, parent to child shared knowledge, private records, task transitions, audit trail, synthetic seed and seven offline tests. No AI provider is connected; task generation is a workflow placeholder, not a model quality claim. Run `npm test`. See [resume bullets](docs/resume-bullets.md) and [interview notes](docs/interview-notes.md).

## Status and limitations

`IMPLEMENTED_AND_TESTED` for policy and state machine. `MOCK` for login, seed and UI. `NOT_IMPLEMENTED` for real authentication, Postgres, external AI, email and publishing. Do not use this demo for real tenants. Production roadmap: authenticated sessions, transaction scoped tenant filtering, row level security, migration tests, immutable audit and human approved provider evaluations.

## Security and privacy

All identities and content are fabricated. API uses public demo credentials; deploy only as isolated demo without sensitive data. MIT license.
