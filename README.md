# SEFT Abacus

Multi-institute timed mental-math / abacus practice platform. SEFT Institute is
the first (white-labelled) client.

> **Status:** Phase 1 (MVP) — under active development.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma**
- **better-auth** (role + institute carried in session)
- **Tailwind CSS v4**

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy the template and fill in real values (at minimum a Postgres
   `DATABASE_URL`):

   ```bash
   cp .env.example .env
   ```

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Project layout

Code lives at the project **root** (no `src/` directory). The `@/*` import alias
maps to the project root (`@/lib/foo` → `./lib/foo`).

| Path           | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `app/`         | App Router routes (pages, layouts, route handlers).      |
| `lib/`         | Shared, framework-agnostic helpers and constants.        |
| `components/`  | React UI components.                                     |
| `server/`      | Server-only trusted logic (timing / scoring / level-up). |

## Roles

`ADMIN`, `TEACHER`, `STUDENT`. Every user belongs to an institute (`instituteId`).
The platform is multi-institute from day one, but only SEFT is active in Phase 1.
