# TenantFlow — case study

## Problem
An HQ team needs to share approved knowledge with stores without exposing HQ-private material or letting a store publish unreviewed content.

## Context
This is an independent clean-room portfolio demo with fictional organizations and records, not a deployed customer system.

## Constraints
Public GitHub Pages cannot provide trusted authentication or a private database. The demo therefore exposes only synthetic data and treats role passwords as UI selectors.

## My Role
I implemented the policy core, browser workbench, local API adapter, fixtures, tests and documentation in this repository.

## Architecture
`src/core.js` owns visibility and state-transition rules. Both `src/server.ts` and `web/app.js` call that same module; their storage adapters differ. HQ/store/reviewer roles interact with knowledge, tasks and an audit trail.

## Key Decisions
Keep private-versus-shared inheritance explicit, deny store access to HQ-private material, require reviewer action before HQ publication, and expose Reset Demo Data for repeatable walkthroughs.

## Hardest Problem
Preventing the browser version from drifting away from the local API policy while still keeping the demo static and easy to open. Shared core functions and policy tests reduce that drift.

## Failure/Tradeoff
The browser downloads the synthetic seed and uses localStorage. UI role filtering illustrates policy, but cannot protect real confidential data. A successful demo is not a security certification.

## Testing
`npm test` passes 10 policy tests (baseline 7), including HQ/store visibility, reject/re-draft and audit isolation. Browser scenarios exercised private/shared knowledge, task submission, approval/publication and reset.

## Eval
No model is connected. The eval scope is deterministic workflow mechanics; model quality is `NOT_RUN`. See `evals/PROJECT_EVAL_SPEC.md`.

## Current Evidence
[Live synthetic demo](https://zhouey314-cloud.github.io/multi-tenant-ai-workflow-saas/) · [README](../README.md) · [policy source](../src/core.js) · [tests](../tests/).

## Limitations
No production authentication, row-level security, transactional database, provider-backed generation or durable audit.

## What I Would Do in Production
Add authenticated sessions, server-enforced tenant scope, transaction-scoped queries, row-level security, immutable audit and verified provider evaluations before admitting real tenant data.

## What I Learned
A shared policy module and explicit denial cases are more valuable than a visually convincing role switch when demonstrating multi-tenant boundaries.
