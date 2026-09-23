# Architecture and data model

`src/core.js` is shared by two adapters: (1) local Node HTTP API → JSON demo store, and (2) GitHub Pages browser app → localStorage. Core functions are isolated from transport and persistence. `Actor` carries tenant, business unit and role. Knowledge and tasks carry tenant and unit. Every lookup filters tenant before inheritance or role checks. A store inherits only parent items marked `shared`; private HQ items stay private. HQ can inspect its store's items. `Audit` records who, when, action and target. The JSON adapter uses atomic rename for demo persistence; the browser adapter is not a security boundary because code and synthetic data download to the client. Production needs a transactional database, tenant-scoped SQL policies, real authentication and immutable audit retention.

## RBAC matrix

| Action | HQ admin | Store editor | Reviewer |
|---|---|---|---|
| Read own knowledge | Yes | Yes | Yes |
| Read parent shared knowledge | Yes | Yes | Yes |
| Read parent private knowledge | Own unit only | No | Own unit only |
| Create private knowledge | Yes | Yes | No |
| Create shared knowledge | Yes | No | No |
| Submit draft | No | Own unit | No |
| Approve review | No | No | Yes |
| Reject review | No | No | Yes |
| Publish approved | Yes | No | No |

## State machine

`draft → review → approved → published`; reviewer may also choose `review → rejected`, after which the store can revise with `rejected → draft`. The API has no real publishing side effect. All content is synthetic. Cross-tenant transitions are denied.
