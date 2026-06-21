# SEFT Abacus

Multi-institute timed mental-math / abacus practice platform. SEFT Institute is
the first (white-labelled) client.

> **Status:** Phase 1 (MVP) — feature complete. Phase 2 in progress (deployment).

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma 7**
- **better-auth** (role + institute carried in session)
- **Tailwind CSS v4**

## Local development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` — at minimum set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and
   `BETTER_AUTH_URL`.

3. **Database**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   Demo sign-in: `admin@seft.test` / `Password123!` (see seed output for all accounts).

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Production deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for:

- Vercel + Neon (recommended)
- Environment variables and security
- `db:migrate:deploy` for staging/production
- Smoke test checklist

Quick production build check:

```bash
npm run build
npm run start
```

## npm scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply migrations (local dev; may create new migrations) |
| `npm run db:migrate:deploy` | Apply migrations (staging/production) |
| `npm run db:seed` | Seed demo data (local/staging only) |
| `npm run db:studio` | Prisma Studio (local) |

## Project layout

Code lives at the project **root** (no `src/` directory). The `@/*` import alias
maps to the project root (`@/lib/foo` → `./lib/foo`).

| Path           | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `app/`         | App Router routes (pages, layouts, route handlers).      |
| `lib/`         | Shared, framework-agnostic helpers and constants.        |
| `components/`  | React UI components.                                     |
| `server/`      | Server-only trusted logic (timing / scoring / level-up). |
| `docs/`        | Deployment and phase documentation.                      |

## Roles

`ADMIN`, `TEACHER`, `STUDENT`. Every user belongs to an institute (`instituteId`).
The platform is multi-institute from day one; Phase 1 runs a single active institute (SEFT).
