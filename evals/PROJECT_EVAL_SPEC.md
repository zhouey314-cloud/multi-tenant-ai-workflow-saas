# Synthetic policy evaluation contract

Goal: a visitor can reproduce HQ/private vs shared inheritance, store task submission, reviewer approve/reject, HQ publish and role-scoped audit with fictional records. The same policy code must run in the browser and the local API.

Critical failures: a store sees HQ private knowledge; cross-tenant records leak; a task cites inaccessible knowledge; a reviewer authors/publishes; a store publishes directly. These are deterministic business-rule regressions, not LLM evaluation.

Baseline before V3: `npm test` on the previous `core.ts` implementation, 7/7 passing. V3: `npm test` exercises 10/10 tests on shared `core.js`, including HQ/store visibility, explicit reject and audit isolation. The two original example domains are synthetic; no real-world authorization audit or security certification is claimed. The browser workflow is also manually exercised role-by-role and reset.

Release gate for this demo: all deterministic tests pass; no critical isolation regression; browser can complete the three documented scenarios and restore seed. Any unavailable live check is `BLOCKED`, not `PASS`.
