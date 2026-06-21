# Deployment guide

How to run SEFT Abacus in **staging** and **production**. Phase 2 task **2.0.1**.

Recommended stack (documented below):

| Layer | Service |
| ----- | ------- |
| App | [Vercel](https://vercel.com) (Next.js 16) |
| Database | [Neon](https://neon.tech) or [Railway](https://railway.app) PostgreSQL |

You can substitute any Node 20+ host and managed Postgres — the env vars and
commands stay the same.

---

## 1. Prerequisites

- **Node.js 20+** and **npm**
- A **PostgreSQL 15+** database (local, Neon, Railway, etc.)
- Git repository connected to your host (for Vercel: import the repo)

---

## 2. Environment variables

Copy the template and fill in real values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Managed hosts usually need `?sslmode=require` at the end. |
| `BETTER_AUTH_SECRET` | Yes | Random secret for signing sessions. **Must be unique per environment.** Generate with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Yes | Public origin of the app **with no trailing slash**. Must match the URL users open in the browser. |
| `NODE_ENV` | Set by host | `production` on Vercel/Railway automatically. Do not set manually in `.env` for local dev. |

### Local development

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seft_abacus?schema=public"
BETTER_AUTH_SECRET="dev-only-change-me"
BETTER_AUTH_URL="http://localhost:3000"
```

### Staging / production (example)

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
BETTER_AUTH_SECRET="<openssl rand -base64 32>"
BETTER_AUTH_URL="https://app.yourdomain.com"
```

**Common mistakes**

- `BETTER_AUTH_URL` still pointing at `http://localhost:3000` → login cookies fail in production.
- `BETTER_AUTH_URL` with a trailing slash (`https://x.com/`) → auth callbacks can break.
- `BETTER_AUTH_SECRET` reused across staging and production → session forgery risk if one env leaks.
- Missing `sslmode=require` on Neon/Railway → connection errors at runtime.

---

## 3. First-time database setup

Run these from the project root with `DATABASE_URL` pointing at the target database.

### 3.1 Install dependencies

```bash
npm install
```

`postinstall` runs `prisma generate` automatically.

### 3.2 Apply migrations (production-safe)

**Use `migrate deploy` in staging/production** — not `migrate dev`.

```bash
npm run db:migrate:deploy
```

This applies all SQL files under `prisma/migrations/` without prompting for a migration name.

For local development only:

```bash
npm run db:migrate
```

### 3.3 Seed data (staging only — see warning)

```bash
npm run db:seed
```

Creates the SEFT institute, 5 levels, demo admin/teacher/students. Every demo account uses password **`Password123!`** (printed by the seed script).

| Environment | Seed? |
| ----------- | ----- |
| **Local** | Yes — convenient for development |
| **Staging** | Yes — for QA and smoke tests |
| **Production** | **No** (unless you immediately change all passwords and treat it as a one-time bootstrap). Prefer creating real accounts via the admin UI after first deploy. |

---

## 4. Build and run locally (production mode)

Verify the production build before deploying:

```bash
npm run build
npm run start
```

Open `http://localhost:3000`. Uses `.env` for `DATABASE_URL` and auth settings.

---

## 5. Deploy to Vercel + Neon

### 5.1 Create the database (Neon)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (recommended for serverless).
3. Ensure the URL includes `?sslmode=require`.

### 5.2 Create the Vercel project

1. Import the Git repository.
2. Framework preset: **Next.js** (auto-detected).
3. **Environment variables** (Production + Preview + Development as needed):

   | Name | Value |
   | ---- | ----- |
   | `DATABASE_URL` | Neon connection string |
   | `BETTER_AUTH_SECRET` | New random secret per environment |
   | `BETTER_AUTH_URL` | `https://<your-vercel-domain>` |

4. **Build command** (Project Settings → Build & Development):

   ```bash
   npm run db:migrate:deploy && npm run build
   ```

   First deploy applies migrations; subsequent deploys are no-ops if the DB is up to date.

   Alternative: run `npm run db:migrate:deploy` manually once from your machine (with production `DATABASE_URL` in `.env`) before the first Vercel deploy, then use the default build command `npm run build` only.

5. Deploy.

### 5.3 After first production deploy

1. Open `https://<your-domain>/login`.
2. If you seeded staging only, create production users through the admin UI (Phase 1: admin provisions teachers; teachers add students).
3. Run the [smoke test checklist](#7-smoke-test-checklist) below.

### 5.4 Custom domain

1. Add the domain in Vercel → Settings → Domains.
2. Update `BETTER_AUTH_URL` to `https://yourdomain.com`.
3. Redeploy so auth cookies use the correct origin.

---

## 6. Deploy to Railway (alternative)

### App + Postgres on Railway

1. Create a **PostgreSQL** service; copy `DATABASE_URL` from Variables.
2. Create a **Node** service from the same repo.
3. Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (Railway public URL or custom domain).
4. **Build command:** `npm run build`
5. **Start command:** `npm run start`
6. Run migrations once (Railway shell or local with production URL):

   ```bash
   npm run db:migrate:deploy
   ```

---

## 7. Smoke test checklist

Run after every new environment (staging or production).

### Auth and routing

- [ ] `/` loads without error
- [ ] `/login` shows the sign-in form
- [ ] Sign in as admin → lands on `/admin`
- [ ] Sign out → returns to `/login`
- [ ] Student/teacher URLs redirect when not signed in

### Admin (`admin@seft.test` if seeded)

- [ ] `/admin/teachers` — list loads, add-teacher dialog opens
- [ ] `/admin/levels` — level list loads
- [ ] `/admin/students` — roster loads

### Teacher (`teacher@seft.test` if seeded)

- [ ] `/teacher/groups` — groups list
- [ ] Open a group → students visible, assign level works

### Student (`aisha@seft.test` if seeded)

- [ ] `/student/practice` — start session
- [ ] Submit answers → results and level-up logic
- [ ] `/student/ranking` — leaderboard loads

### Production hygiene

- [ ] `BETTER_AUTH_URL` matches the browser URL exactly
- [ ] Demo passwords changed or seed not used on production
- [ ] `npm run build` passes in CI or locally before deploy

---

## 8. Ongoing operations

| Task | Command |
| ---- | ------- |
| New migration (dev) | `npm run db:migrate` |
| Apply migrations (staging/prod) | `npm run db:migrate:deploy` |
| Regenerate Prisma client | `npm run db:generate` |
| Inspect data | `npm run db:studio` (local only; do not expose publicly) |
| Production logs | Vercel → Logs, or Railway → Deploy logs |

After schema changes: commit migration SQL → deploy → `migrate deploy` runs on build (or run manually).

---

## 9. Troubleshooting

### Login works locally but not on Vercel

- Check `BETTER_AUTH_URL` equals the site origin (`https://...`, no trailing slash).
- Redeploy after changing env vars.

### `PrismaClient` / adapter errors at runtime

- Confirm `DATABASE_URL` is set in the Vercel/Railway environment (not only in local `.env`).
- Confirm `postinstall` / `prisma generate` ran (check build logs).

### Database SSL errors

- Append `?sslmode=require` to Neon/Railway URLs.

### Stale Turbopack / weird `ReferenceError` after big changes

```bash
# Stop dev server, then:
Remove-Item -Recurse -Force .next   # PowerShell
# rm -rf .next                      # macOS/Linux
npm run dev
```

### Migrations out of sync

```bash
npx prisma migrate status
npm run db:migrate:deploy
```

Never use `prisma migrate reset` against staging or production — it wipes all data.

---

## 10. Security checklist (production)

- [ ] Strong unique `BETTER_AUTH_SECRET` per environment
- [ ] No demo seed on public production (or passwords rotated immediately)
- [ ] Database not publicly accessible without credentials
- [ ] `.env` never committed (only `.env.example`)
- [ ] HTTPS only (`BETTER_AUTH_URL` uses `https://`)

---

## Next Phase 2 tasks

After this guide is in use:

1. **2.0.2** — CI pipeline (`lint` + `build` on every PR)
2. **2.0.3** — Automated tests for `server/practice.ts` and auth scoping
3. **2.1** — Super Admin + multi-institute UI
