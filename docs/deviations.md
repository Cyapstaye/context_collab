# Deviations from SPEC build order

This file records intentional deviations from the phase order defined in `SPEC.md § 11`.

---

## Right bar property editing (Phase 6 work in Session 2)

**SPEC phase:** Phase 6 — Right bar
**Implemented in:** Session 2 (Phase 2 — Single-user canvas)

### What was built early

`RightBar.tsx` already implements the full Phase 6 feature set:

- **Node selected:** editable name field, size slider (0.5–3.0), read-only ID
- **Edge selected:** weight slider (0.0–1.0), relation text input, delete button
- Both node and edge delete actions wired through the Zustand store

### Why

The right bar is tightly coupled to the canvas interaction model (selection state, immediate feedback on drag/edit). Building a placeholder that showed selection without editing would have required a near-identical second pass. Doing it once in Session 2 avoids churn.

### Scope of the early work

Only the client-side editing path is implemented. Phase 6 items still outstanding:

- Labels combobox (type new or pick from page-level label pool)
- Relation combobox (type new or pick from page-level relation pool)
- Persistence of edits to the backend (blocked on Phase 3)

### Impact on later phases

Phase 6 in the build order should be treated as **partially complete**. The remaining work is the combobox UI and backend write-through, not the slider/input editing already present.

---

## v1 permission model narrowing (Session 5 / 5.5)

**SPEC says (§ 8):** "Non-allowlist users: view-only, cannot interact"
**Implemented as:** "Unauthenticated users: view-only, cannot interact"

### What was narrowed

SPEC describes a two-tier authenticated model: allowlist users get edit access, non-allowlist authenticated users get view-only. v1 collapses this to a single authenticated tier:

- **Seeded/authenticated users** (any user who can log in) → full edit access
- **Unauthenticated users** (not logged in) → view-only

There is no concept of an "authenticated viewer" in v1. The allowlist is the login list — all seeded users have edit access.

### Why this is an approved narrowing

The SPEC's non-allowlist viewer role requires a second user class (logged-in but read-only). Since all users are admin-seeded via CLI (§ 8), and self-registration is out of scope, there is no mechanism to produce authenticated non-editors in v1. The narrowing is logically sound for the current scope.

### Where this is enforced

- `apps/web/src/store/authStore.ts` — `isViewOnly()` returns `user === null`
- `apps/server/src/socketManager.ts` — unauthenticated sockets cannot acquire node locks

### Impact on later phases

If a viewer role is ever needed, introduce a `role` field (already on the DB User model) and extend `isViewOnly()` accordingly. No structural rework required.

---

## Local-only undo — not conflict-aware in collaborative sessions (Session 7)

**SPEC says (§ 6 canvas / § 7):** "cmd+Z → undo (local session stack only, not persisted, own actions only)"
**Implemented as:** Client-local undo; no awareness of concurrent remote edits.

### Accepted limitation

Undo is intentionally local-only: each client maintains its own undo stack and never rebroadcasts undo as a collaborative event. This means:

- A remote edit to the same node that occurs **between** a local action and its subsequent undo will be silently overwritten when the undo fires.
- Example: User A moves node → User B also moves the same node → User A undoes → the node snaps back to User A's pre-move position, discarding User B's move.

This is **accepted behaviour for v1**. The SPEC explicitly scopes undo to the local session stack only. A conflict-aware undo (e.g. operational transform or CRDT-based undo) is out of scope for v1.

### Where this is implemented

- `apps/web/src/store/canvasStore.ts` — `undoStack`, `_isUndoing`, `undo()`
- The `_isUndoing` flag suppresses new undo-stack entries during replay, but does not prevent overwriting concurrent remote state.

### If conflict-aware undo is needed in future

Introduce a server-side operation log and implement OT/CRDT undo at that layer. The client undo stack would be replaced with server-round-tripped undo operations.
