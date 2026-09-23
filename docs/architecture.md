# Architecture and data model

Browser UI → Node HTTP API → policy functions → JSON demo store. Core functions are isolated from transport and persistence. `Actor` carries tenant, business unit and role. Knowledge and tasks carry tenant and unit. Every lookup filters tenant before any inheritance or role check. A store inherits only parent items marked `shared`; private HQ items stay private. `Audit` records state changes and creations. The JSON store uses atomic rename for demo persistence; production needs a transactional database, tenant scoped SQL policies, real authentication and immutable audit retention.

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
| Publish approved | Yes | No | No |

## State machine

`draft → review → approved → published`; reviewer may return `review → draft`. The API has no real publishing side effect. All content is synthetic. Cross tenant transitions are denied.
