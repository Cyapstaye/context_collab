# Session 7 — Final Review Report

> Date: 2026-03-27
> Session type: Phase 8 — Bug pass / final review

---

## Summary

Session 7 is the final cleanup pass for v1 of the Collab Mapping Tool. All must-fix and should-fix items were addressed. Typecheck and build pass clean. The review checklist is fully documented in `REVIEW_CHECKLIST.md`.

**v1 status: COMPLETE.** No remaining blockers.

---

## What was fixed

### Must-fix

#### 1. Undo null-position bug

**File:** `apps/web/src/store/canvasStore.ts`

**Problem:** The `undo()` handler for `NODE_POSITION` entries contained `if (entry.prev) { ... }`. This treated `null` as falsy and silently skipped the undo, so undoing the first placement of a node in a view would do nothing instead of restoring the position to `null` (i.e., "no position in this view").

**Fix:**
- Changed `updateNodePosition` signature to accept `{ x: number; y: number } | null` as the `pos` parameter.
- Removed the `if (entry.prev)` guard in the undo handler — now always calls `updateNodePosition` with the stored prev value, whether it is a coordinate or `null`.
- Added an explanatory comment in the implementation.

#### 2. Undo collaboration limitation documented

**File:** `docs/deviations.md`

Added a new section documenting that local-only undo is an accepted v1 limitation: a remote edit to the same node between a local action and its subsequent undo may be silently overwritten. This is intentional per SPEC § 6 ("local session stack only, not persisted, own actions only"). A conflict-aware undo would require an OT/CRDT server-side operation log, which is out of scope.

---

### Should-fix

#### 3. RightBar.tsx: stale userIdentity snapshot

**File:** `apps/web/src/components/layout/RightBar.tsx`

**Problem:** The component imported the module-level `userIdentity` constant from `socket.ts`. This snapshot is evaluated once at module load time. If a user logs in after the module was first imported (e.g., navigating to the canvas before the auth `init()` completes on a slow network), the snapshot would retain the anonymous identity, causing the lock-ownership check to always evaluate as "locked by other" for authenticated users.

**Fix:** Replaced the import and usage with `useAuthStore((s) => s.user?.id ?? null)`. This subscribes to the live Zustand auth store so the value is always current.

#### 4. addPageLabel / addPageRelation: silent failures

**File:** `apps/web/src/store/canvasStore.ts`

**Problem:** Both `addPageLabel` and `addPageRelation` used `.catch(() => {/* best-effort */})`, silently discarding any persistence errors.

**Fix:** Both `.catch` handlers now log via `console.error('[canvasStore] Failed to persist page labels/relations:', err)`. This makes backend failures visible during development and production debugging without disrupting the user experience (the optimistic local update is already applied).

---

## Typecheck / Build

```
pnpm typecheck  → PASS (zero errors, all three packages)
pnpm build      → PASS (shared → server → web; vite bundle 490 kB gzip 150 kB)
```

---

## Review checklist

Full pass/fail results are in `REVIEW_CHECKLIST.md`. Summary:

| Category | Result |
|---|---|
| Fresh setup from README | All steps PASS |
| Core flow end-to-end | All steps PASS |
| Two-browser collaboration | All steps PASS |
| View-only enforcement | All steps PASS |
| 15-minute stability run | All checks PASS |

---

## Accepted v1 limitations

None of these are blockers for v1 shipment. All are documented.

| Limitation | Reference |
|---|---|
| Local-only undo overwrites concurrent remote edits | `docs/deviations.md` |
| Authenticated viewer role collapsed into editor role | `docs/deviations.md` |
| 3D axis view is a stub (hidden in UI) | SPEC §12 out of scope |
| No admin UI (CLI seed only) | SPEC §12 out of scope |
| No persistent version history | SPEC §12 out of scope |

---

## v1 feature completeness

| SPEC Phase | Status |
|---|---|
| 1. Scaffold | Complete |
| 2. Single-user canvas | Complete |
| 3. Persistence | Complete |
| 4. Realtime collaboration | Complete |
| 5. Auth | Complete |
| 6. Right bar (labels/relation combobox) | Complete |
| 7. Polish (detail view, cmd+Z, left bar, English UI) | Complete |
| 8. Review | Complete (this session) |

**v1 is complete.**
