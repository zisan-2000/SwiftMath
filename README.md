# SEFT Abacus

Multi-institute timed mental-math / abacus practice platform. SEFT Institute is
the first (white-labelled) client.

> **Status:** Phase 1 (MVP) complete · **Phase 2 complete** (multi-tenant SaaS).
> See [docs/PHASE2.md](docs/PHASE2.md) for scope, QA checklist, and deferred items.

## Continuous integration

Every push/PR to `main` runs **lint**, **build**, and **tests** via GitHub Actions
(`.github/workflows/ci.yml`). Check the **Actions** tab on GitHub for pass/fail status.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma 7**
- **better-auth** (role + institute carried in session)
- **Tailwind CSS v4**
- **Recharts** (role dashboards)

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
   `BETTER_AUTH_URL`. Optional: `RESEND_API_KEY`, `EMAIL_FROM` for production email.

3. **Database**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   Demo sign-in: `Password123!` for all seed accounts (see seed output).

   | Role | Email |
   | ---- | ----- |
   | Super Admin | `super@seft.test` |
   | Admin | `admin@seft.test` |
   | Teacher | `teacher@seft.test` |
   | Student | `aisha@seft.test` (and others) |

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
npm test
npm run build
npm run start
```

## Documentation

| Doc | Purpose |
| --- | ------- |
| [docs/PHASE2.md](docs/PHASE2.md) | Phase 2 scope, architecture, QA checklist |
| [docs/SUPER_ADMIN_RUNBOOK.md](docs/SUPER_ADMIN_RUNBOOK.md) | Platform operator guide |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Staging/production deploy |

## npm scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
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

`SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`. Every user belongs to an institute
(`instituteId`). Super Admin manages the platform; all other roles are scoped to
one institute.
