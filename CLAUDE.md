@AGENTS.md

# SEFT Abacus — project guide

Multi-institute mental-math / abacus practice platform. SEFT Institute is the
first (white-labelled) client. Production product.

## Non-negotiable build rules

1. **Phases.** Build only the current phase. We are in **Phase 1 (MVP)**. Do not
   add future-phase features unless explicitly asked.
2. **Multi-institute from day one.** Every record carries an `instituteId`. In
   Phase 1 only one institute (SEFT) is active.
3. **Server is the source of truth.** All timing, scoring, and level-up logic
   runs and is verified server-side. Never trust the browser for timer/score —
   students may try to cheat.
4. **Clean, modular, TypeScript-typed, well-commented.** Single solo maintainer;
   readability beats cleverness.
5. **One task at a time.** After each task report (a) files changed, (b) how to
   run, (c) what to test — then STOP and wait for confirmation.

## Tech stack (do not substitute)

- Next.js (App Router) + TypeScript — **v16**, which has breaking changes vs.
  older Next.js. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- PostgreSQL + Prisma (`schema.prisma` is the single source of truth; use
  `prisma migrate`).
- better-auth — session must carry `role` + `instituteId`.
- Tailwind CSS (v4).
- Recharts (later phase only).

## Roles

`ADMIN` (Phase 1 collapses Super Admin + Institute Admin), `TEACHER`, `STUDENT`.
Every user has `role` and `instituteId`, both available in the session for route
protection and data scoping.

## Layout

Code lives at the project **root** (no `src/` directory). The `@/*` import alias
maps to the project root, so `@/lib/foo` → `./lib/foo`.

- `app/` — App Router routes.
- `lib/` — shared, framework-agnostic helpers and constants.
- `components/` — React UI components (added as needed).
- `server/` — server-only trusted logic (timing/scoring/level-up). Never import
  these into client components.
