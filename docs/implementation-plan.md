# Implementation Plan

> See SPEC.md §11 for the canonical phase table. This file adds notes for each session.

## Phase 1 — Scaffold (Session 1) ✅
- Monorepo: pnpm workspace, apps/web, apps/server, packages/shared
- Shared types (Node, Edge, Page, Project, User) + Zod schemas + constants
- Prisma schema: User, Project, Page, Node, Edge (SQLite)
- Express server skeleton with route stubs
- Vite React app with three-panel canvas shell (LeftBar / CanvasArea / RightBar)
- English UI labels in view switcher
- Docs: this file, api-contract.md, realtime-events.md

## Phase 2 — Single-user canvas
- Wire React Flow into CanvasArea
- Add/move/connect nodes and edges on canvas
- Per-view positions stored separately per node
- View switcher filters node types as per SPEC
- Zustand store for canvas state
- REST calls to POST/PATCH nodes and edges

## Phase 3 — Persistence
- Project/page CRUD fully wired (create, list, get, update, delete)
- Page duplication endpoint
- JSON export and import for a page
- Left bar interactions: page list, add page, switch page
- Home page project list

## Phase 4 — Realtime
- Socket.io page rooms
- Presence: cursor positions, active user avatars
- Node lock: first selector locks, released on deselect/disconnect/30s timeout
- Broadcast canvas mutations (node/edge create/update/delete)

## Phase 5 — Auth
- JWT + bcrypt login flow
- Allowlist check middleware
- View-only enforcement for non-allowlist users
- `pnpm seed:user` script fully wired

## Phase 6 — Right bar
- Node property editing: name, size slider, labels combobox
- Edge property editing: weight slider, relation combobox
- Page-level label pool management

## Phase 7 — Polish
- Detail view (in-place on select, connected nodes highlighted)
- cmd+Z local undo stack
- Left bar node/proposition click → select on canvas
- English UI language pass

## Phase 8 — Review
- Bug pass, usability pass, cleanup
