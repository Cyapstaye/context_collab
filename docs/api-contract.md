# API Contract

Base URL: `http://localhost:3001/api/v1`

All responses follow `{ data: T }` on success and `{ error, message, statusCode }` on error.

---

## Health

```
GET /health
→ { status: "ok", timestamp: "..." }
```

---

## Projects

```
GET    /projects                     → { data: Project[] }
POST   /projects                     body: CreateProjectSchema → { data: Project }
GET    /projects/:id                 → { data: Project }
PATCH  /projects/:id                 body: UpdateProjectSchema → { data: Project }
DELETE /projects/:id                 → 204
```

---

## Pages

```
GET    /projects/:projectId/pages               → { data: Page[] }
POST   /projects/:projectId/pages               body: CreatePageSchema → { data: Page }
GET    /projects/:projectId/pages/:id           → { data: Page }
PATCH  /projects/:projectId/pages/:id           body: UpdatePageSchema → { data: Page }
DELETE /projects/:projectId/pages/:id           → 204
POST   /projects/:projectId/pages/:id/duplicate → { data: Page }  (new page)
```

---

## Nodes

```
GET    /pages/:pageId/nodes        → { data: Node[] }
POST   /pages/:pageId/nodes        body: CreateNodeSchema → { data: Node }
PATCH  /pages/:pageId/nodes/:id    body: UpdateNodeSchema → { data: Node }
DELETE /pages/:pageId/nodes/:id    → 204
```

---

## Edges

```
GET    /pages/:pageId/edges        → { data: Edge[] }
POST   /pages/:pageId/edges        body: CreateEdgeSchema → { data: Edge }
PATCH  /pages/:pageId/edges/:id    body: UpdateEdgeSchema → { data: Edge }
DELETE /pages/:pageId/edges/:id    → 204
```

---

## Auth (Phase 5)

```
POST /auth/login    body: { email, password } → { data: { token: string, user: User } }
POST /auth/logout   → 204
GET  /auth/me       → { data: User }
```

---

## Export / Import (Phase 3)

```
GET  /pages/:pageId/export  → PageExportSchema JSON file download
POST /projects/:projectId/pages/import  body: PageExportSchema → { data: Page }
```

---

## Schema references

See `packages/shared/src/schemas.ts` for all Zod schemas used in request bodies.

---

## Implementation status

| Route group | Status |
|---|---|
| /health | ✅ Implemented |
| /projects | Stub (501) |
| /pages | Stub (501) |
| /nodes | Stub (501) |
| /edges | Stub (501) |
| /auth | Not yet (Phase 5) |
| export/import | Not yet (Phase 3) |
