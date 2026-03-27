# Collab Mapping Tool — SPEC.md
> Single source of truth. Read this at the start of every coding session.
> All decisions are locked unless explicitly noted as TBD.

---

## 1. What this is

A real-time collaborative canvas where 3+ users jointly build a knowledge graph of a system's elements and propositions. The canvas itself is the primary output. Built for research/design teams mapping complex systems (e.g. urban infrastructure, platform economies).

---

## 2. Tech stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript + Vite | |
| UI | Tailwind + component primitives | |
| Canvas | React Flow | sufficient for MVP; replace later if needed |
| State | Zustand | client-side |
| Backend | Node.js + Express | |
| DB | SQLite + Prisma | migrate to Postgres at deploy time (one config line) |
| Realtime | Socket.io | |
| Auth | JWT + bcrypt | |
| Deployment | Local prototype first | Docker Compose later when deploying |

---

## 3. App structure

```
Home → Project → Page → Views
```

- **Home** — project list
- **Project** — contains multiple pages
- **Page** — core independent unit. Has its own element pool, views, and collab state. Pages can be duplicated.
- **Views** — each page contains all views; users switch via switcher bar

---

## 4. Data model

### Node types

| Type | Korean | Description | Examples |
|---|---|---|---|
| `element` | 요소 | Actor or factor in the system | rider, consumer, platform, regulation |
| `proposition` | 명제 | Observed phenomenon or value judgment | "riders are forced to speed up" |

### Node schema

```json
{
  "id": "n1",
  "type": "element",
  "name": "rider",
  "labels": ["#actor", "#gig-economy"],
  "size": 1.0,
  "positions": {
    "proposition": null,
    "element": { "x": 200, "y": 300 },
    "layer": { "x": 340, "y": 340 },
    "axis3d": null
  }
}
```

- `labels` — user-defined tags. Combobox: type new or pick from existing. Stored as page-level list.
- `size` — scales both circle graphic and font. Default 1.0.
- `positions` — stored per view independently. Same node placed differently in each view.

### Edge schema

```json
{
  "id": "e1",
  "source": "n1",
  "target": "n2",
  "weight": 0.85,
  "relation": "influences"
}
```

- `weight` — float 0.0–1.0. Set manually via slider. Rendered as edge opacity.
- `relation` — string. Blank by default. Combobox: type new or pick from previously used relations on this page.

### Page schema

```json
{
  "id": "page_1",
  "name": "Version A",
  "nodes": [],
  "edges": [],
  "labels": ["#actor", "#phenomenon", "#infrastructure"],
  "views": {
    "active": "element"
  }
}
```

---

## 5. Views

Each page has 3 main views + 1 optional, toggled via switcher bar at top of canvas.

### 5a. Proposition view — macro
- Propositions only visible, elements hidden
- Nodes grouped/clustered by theme

### 5b. Element view — macro
- Elements only visible, propositions hidden
- Edge opacity = weight value

### 5c. Layer view — macro
- Elements only visible
- One node designated as center
- Other nodes arranged in concentric depth rings

### 5d. 3D axis view — stub only for v1
- Hidden/disabled in UI
- Implement last

### 5e. Detail view — triggered on node select
- Not a separate tab — activates in-place on canvas
- Current macro view preserved; connected nodes highlighted
- Shows selected node + all directly connected nodes (elements AND propositions mixed)
- Only context where elements and propositions coexist

---

## 6. UI layout

```
[ Left bar ] [ Canvas ] [ Right bar ]
```

### Left bar
- Project name (top)
- Pages list — + add, duplicate actions
- Element list (all elements in current page)
- Proposition list (all propositions in current page)
- Clicking any item → selects it on canvas
- + button to add new node (choose type on create)

### Canvas
- View switcher bar at top (Proposition · Element · Layer)
- Multi-cursor: each user has a visible named cursor
- Presence indicators: avatars/names of active users
- Node interactions:
  - Drag → reposition (updates position in current view only)
  - Corner-drag → resize (updates `size`)
  - Click → select (triggers detail view + populates right bar)
- cmd+Z → undo (local session stack only, not persisted, own actions only)

### Right bar
- **Node selected:** name (editable) · size slider · labels combobox
- **Edge selected:** weight slider (0.0–1.0) · relation combobox

---

## 7. Real-time collaboration

- Socket.io rooms scoped per page
- Shared ownership, no per-node attribution
- **Presence**: cursor positions + active user list synced live
- **Node lock**:
  - First user to select a node locks it
  - Lock state broadcast to all (highlighted border)
  - Other users cannot move or edit locked node
  - Lock releases on: deselect · disconnect · 30s inactivity timeout
- **Undo**: client-local only, own actions only

---

## 8. Access control

- **Allowlist users** (admin-seeded): email + password, full edit access
- **Non-allowlist**: view-only, cannot interact
- No self-registration
- **Admin seeding**: CLI script only for v1
  ```bash
  npm run seed:user -- --email=x@example.com --password=secret
  ```

---

## 9. Export / Import

- **Export**: page JSON per page (nodes + edges + positions per view)
- **Import**: page JSON → creates new page from file

---

## 10. UI language

- English for all labels and UI text

---

## 11. Build order — DO NOT skip steps

| Phase | Scope |
|---|---|
| 1. Scaffold | Repo structure · shared types · base UI shell · DB schema · Prisma models |
| 2. Single-user canvas | Add nodes · move · connect edges · per-view positions · view switcher |
| 3. Persistence | Project/page CRUD · save/load · page duplication · JSON export/import |
| 4. Realtime | Socket.io page rooms · presence · cursor sync · node lock |
| 5. Auth | Login · allowlist check · view-only enforcement |
| 6. Right bar | Node/edge property editing · labels combobox · relation combobox |
| 7. Polish | Detail view · cmd+Z · left bar interactions · UI language pass |
| 8. Review | Bug pass · usability pass · cleanup |

---

## 12. Out of scope for v1

- AI-assisted connection suggestions
- Rich node content (images, embeds) — text only
- Persistent version history — session undo only
- Graph query / traversal
- 3D axis view (stub only)
- Admin UI (CLI only)
- Deployment config (local first)