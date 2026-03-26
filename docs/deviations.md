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
