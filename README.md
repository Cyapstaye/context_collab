# Context Collab

Real-time collaborative knowledge-graph canvas for research and design teams.

Korean-first UI. Built with React + Vite, Express, Prisma/SQLite, Socket.io (Phase 4).

---

## Prerequisites

- Node.js 20+
- pnpm 9+

---

## Local setup

```bash
# 1. Install all dependencies
pnpm install

# 2. Set up the database
cp apps/server/.env apps/server/.env   # already exists with defaults
pnpm db:migrate                        # creates dev.db and runs migrations
pnpm db:generate                       # generates Prisma client

# 3. Start dev servers (web + server in parallel)
pnpm dev
```

- Web: http://localhost:5173
- Server: http://localhost:3001
- Health: http://localhost:3001/health

---

## Individual package scripts

```bash
# Typecheck all packages
pnpm typecheck

# Build all packages
pnpm build

# Server only
pnpm --filter server dev

# Web only
pnpm --filter web dev

# Prisma Studio (DB browser)
pnpm db:studio

# Seed an allowlist user (Phase 5)
pnpm seed:user -- --email=user@example.com --password=secret
```

---

## Project structure

```
context_collab/
├── apps/
│   ├── server/          # Express API + Prisma
│   │   ├── prisma/      # schema.prisma + migrations
│   │   └── src/
│   │       ├── routes/  # REST route handlers
│   │       └── scripts/ # CLI scripts (seed-user)
│   └── web/             # React + Vite frontend
│       └── src/
│           ├── components/layout/  # LeftBar, CanvasArea, RightBar
│           ├── pages/              # HomePage, ProjectPage, CanvasPage
│           └── store/              # Zustand stores (Phase 2)
├── packages/
│   └── shared/          # Shared TS types, Zod schemas, constants
├── docs/
│   ├── implementation-plan.md
│   ├── api-contract.md
│   └── realtime-events.md
├── SPEC.md
└── README.md
```

---

## Build phases

See `docs/implementation-plan.md` and `SPEC.md §11` for the full phase roadmap.

| Phase | Status |
|---|---|
| 1. Scaffold | ✅ Done |
| 2. Single-user canvas | Planned |
| 3. Persistence | Planned |
| 4. Realtime | Planned |
| 5. Auth | Planned |
| 6. Right bar | Planned |
| 7. Polish | Planned |
| 8. Review | Planned |
