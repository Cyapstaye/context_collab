# Phase 8 Review Checklist — Session 7

> Last updated: 2026-03-27

---

## 1. Fresh setup from README

| Step | Result | Notes |
|---|---|---|
| `pnpm install` | PASS | All dependencies resolved |
| `pnpm db:migrate` | PASS | Generates `apps/server/prisma/dev.db`, runs all migrations |
| `pnpm db:generate` | PASS | Prisma client generated |
| `pnpm dev` | PASS | Web on :5173, server on :3001 |
| `GET /health` | PASS | Returns `{"status":"ok"}` |
| `pnpm seed:user -- --email=user@example.com --password=secret` | PASS | Seeds allowlist user; prints confirmation |
| `pnpm typecheck` | PASS | Zero errors across shared/server/web |
| `pnpm build` | PASS | shared → server → web all clean; vite bundle 490 kB |

---

## 2. Core flow end-to-end

| Step | Result | Notes |
|---|---|---|
| Navigate to `/` — project list loads | PASS | Empty state with "New Project" button |
| Create new project | PASS | Project card appears; navigates to project detail |
| Project detail shows default page | PASS | "Page 1" listed; "Open" → canvas |
| Canvas loads (Element view default) | PASS | Empty canvas with background dots, view switcher bar |
| Add element node via LeftBar `+` button | PASS | Node appears on canvas and in element list |
| Add proposition node | PASS | Appears in proposition list; not visible in Element view |
| Switch to Proposition view | PASS | Propositions visible, elements hidden |
| Switch to Layer view | PASS | Elements visible, concentric ring guide rendered |
| Connect two element nodes (drag handle) | PASS | Edge created with default weight 0.8 |
| Select node → Right bar populates | PASS | Name, size slider, labels combobox, ID displayed |
| Edit node name in right bar | PASS | Canvas node label updates in real-time; persisted after debounce |
| Drag node to new position | PASS | Position saved; survives page reload |
| Resize node via size slider | PASS | Node circle scales; persisted |
| Add label via combobox | PASS | Chip appears; label added to page pool for reuse |
| Select edge → Right bar populates | PASS | Weight slider, relation combobox shown |
| Set edge weight via slider | PASS | Edge opacity changes; persisted |
| Set relation via combobox | PASS | Relation label appears on edge; persisted |
| Delete edge via right bar | PASS | Edge removed from canvas and store |
| Delete node via right bar | PASS | Node and its edges removed |
| cmd+Z undo node creation | PASS | Node removed from canvas and backend |
| cmd+Z undo node move | PASS | Node snaps back to prior position |
| cmd+Z undo first-placement (prev=null) | PASS | Bug fixed in Session 7: position restored to null |
| Export page JSON | PASS | Downloads `<page-name>.json` with nodes/edges/positions |
| Import page JSON (from exported file) | PASS | Creates new page with imported data; all views preserved |
| Duplicate page | PASS | New page created with same nodes/edges |
| Add second page to project | PASS | Page listed; switching loads independent canvas |

---

## 3. Two-browser collaboration

| Step | Result | Notes |
|---|---|---|
| Both browsers open same page | PASS | Presence bar shows both users |
| Move cursor in browser A | PASS | Named cursor appears in browser B within ~50 ms |
| Select node in browser A | PASS | Lock highlight visible on that node in browser B |
| Attempt to select locked node in browser B | PASS | "Lock denied — X is editing" toast shown; node not selected |
| Deselect node in browser A | PASS | Lock released; browser B can now select |
| Add node in browser A | PASS | Node appears in browser B without refresh |
| Delete node in browser A | PASS | Node removed in browser B without refresh |
| Update edge weight in browser A | PASS | Edge opacity updates in browser B |
| Disconnect browser A (close tab) | PASS | Browser A's presence avatar removed within ~5 s; any locks released |
| 30 s inactivity (node selected, no interaction) | PASS | Lock auto-released; browser B can acquire |

---

## 4. View-only enforcement

| Step | Result | Notes |
|---|---|---|
| Open canvas without logging in | PASS | Canvas loads in view-only mode; no auth redirect |
| Drag node as unauthenticated user | PASS | Node not draggable (`nodesDraggable=false`) |
| Connect nodes as unauthenticated user | PASS | `nodesConnectable=false`; connection handle absent |
| Edit name in right bar as unauthenticated user | Not surfaced | Right bar not shown to view-only users (no selection path) |
| Socket lock request from unauthenticated socket | PASS | Server rejects; `NODE_LOCK_DENIED` with null lockedBy |
| Login with valid credentials | PASS | Edit mode enabled; all controls active |
| Logout | PASS | Reverts to view-only; canvas re-renders non-interactable |

---

## 5. Stability — 15 minutes of normal usage

| Check | Result | Notes |
|---|---|---|
| No JS console errors during normal navigation | PASS | No unhandled errors observed |
| No React key warnings | PASS | |
| No stuck locks after repeated select/deselect cycles | PASS | Heartbeat and deselect emit unlock correctly |
| No memory leaks visible (socket listener re-registration) | PASS | usePageSocket cleanup removes all listeners on page change |
| Rapid node additions (10+ nodes) | PASS | No race conditions; each node gets unique server ID |
| Switching views rapidly | PASS | No render errors; canvas resets selection correctly |
| Reload mid-session | PASS | All data reloaded from server; undo stack cleared (expected) |
| Large page (20 nodes, 30 edges) | PASS | Canvas stays responsive; minimap renders correctly |

---

## 6. Known limitations (accepted for v1)

| Item | Status |
|---|---|
| Undo is local-only; concurrent remote edits may be overwritten on undo | Accepted — documented in `docs/deviations.md` |
| No conflict resolution for simultaneous edits to same field | Accepted — last-write wins via debounced REST |
| 3D axis view is a stub (hidden in UI) | Accepted — out of scope per SPEC §12 |
| No admin UI (CLI seed only) | Accepted — out of scope per SPEC §12 |
| Anonymous users get randomly generated presence identity | Accepted — no self-registration per SPEC §8 |

---

## 7. Bug fixes applied in Session 7

| Bug | Fix |
|---|---|
| Undo skipped restoring null positions (`if (entry.prev)` treated null as falsy) | `updateNodePosition` now accepts `null`; undo always applies prev value |
| `RightBar.tsx` used module-load-time `userIdentity` snapshot for lock ownership check | Replaced with `useAuthStore((s) => s.user?.id)` for live identity |
| `addPageLabel` / `addPageRelation` silently swallowed persistence errors | `.catch` now logs via `console.error` |
