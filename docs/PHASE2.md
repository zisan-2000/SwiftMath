# Phase 2 — Multi-tenant SaaS

Phase 2 turns the Phase 1 MVP into a **multi-institute platform**: Super Admin,
white-label branding, email password reset, analytics, admin tooling, and launch
polish.

> **Status:** Phase 2 feature-complete (June 2026). Email verification and
> production Resend keys remain optional follow-ups before a public launch.

---

## What shipped

| Block | Deliverable |
| ----- | ----------- |
| **2.0** | Deployment guide, CI (`lint` + `build` + tests), Vitest for pure logic |
| **2.1** | `SUPER_ADMIN` role, `/super` routes, institute list + create/edit/disable |
| **2.2** | New institutes get admin + 5→9 starter levels; tenant isolation |
| **2.3** | Per-institute name, tagline, logo, browser titles |
| **2.4** | Forgot / reset password (dev: reset link in terminal; production: Resend) |
| **2.5** | Recharts dashboards — admin, teacher, student, super |
| **2.6** | Admin onboarding checklist; Super Admin institute drill-in + admin password reset |
| **2.7** | Full ×/÷ curriculum, level prerequisites, review mode, ranking filters, anomaly logging |
| **2.8** | Marketing landing, pagination, privacy/terms, this documentation |

---

## Architecture decisions

### Multi-tenancy from day one

Every domain record carries `instituteId`. Server functions scope by the signed-in
user's institute (or cross-tenant only for `SUPER_ADMIN` in `server/super.ts` /
`server/analytics.ts` platform queries). The browser never chooses a tenant.

### Roles

| Role | Home | Scope |
| ---- | ---- | ----- |
| `SUPER_ADMIN` | `/super` | All institutes (platform ops) |
| `ADMIN` | `/admin` | Own institute |
| `TEACHER` | `/teacher` | Own groups + institute levels |
| `STUDENT` | `/student` | Own practice + ranking |

Session carries `role` + `instituteId` (better-auth). Route guards: `proxy.ts`
(cookie presence) + `lib/session.ts` (real DB lookup).

### Server is the source of truth

Practice timing, scoring, level-up, and prerequisites run in `server/practice.ts`
and `server/level-access.ts`. Client telemetry (tab blur counts) is logged only —
it does not affect grades.

### Practice modes

- **STANDARD** — timed; can level up; counts toward analytics and ranking.
- **REVIEW** — untimed drill; no level-up; excluded from analytics pass-rate stats.

### Starter curriculum

Shared definition: `lib/default-levels.ts` (used by seed and `createInstitute()`).
Admins extend via `/admin/levels`.

### White-label titles

Authenticated areas use `lib/institute-metadata.ts` → `"Page · {Institute Name}"`.
Platform brand remains `SEFT Abacus` on public pages (`/`, `/login`, `/super`).

---

## Deferred / Phase 3+

| Item | Notes |
| ---- | ----- |
| Email verification | Schema ready; needs Resend env + better-auth plugin |
| Challenge practice mode | Roadmap optional item |
| Billing (Stripe) | Commercial phase |
| Per-institute custom domains | Infra complexity |
| Audit log table | Anomaly flags on sessions today; structured audit later |

---

## Multi-institute QA checklist

Run after major releases or before production launch (~15 minutes).

### Setup

```bash
npm run dev
npm run db:seed   # if needed
```

All seed passwords: `Password123!`

### 1. Super Admin — tenant lifecycle

- [ ] Sign in `super@seft.test` → `/super`
- [ ] Create institute **Acme** (admin + branding)
- [ ] Open **Acme** drill-in → stats, edit, disable/enable
- [ ] Reset Acme admin password from drill-in → sign in as Acme admin

### 2. Isolation

- [ ] Acme admin → sees only Acme teachers/students/levels (not SEFT counts)
- [ ] SEFT admin → cannot open Acme data (404 / empty scoped lists)
- [ ] Acme student practice → sessions only under Acme `instituteId`

### 3. White-label

- [ ] Acme admin login → sidebar logo + tab title uses **Acme** name
- [ ] SEFT admin → **SEFT Institute** branding unchanged

### 4. Practice loop (Acme)

- [ ] Acme admin → add teacher → teacher → group → student → assign level 1
- [ ] Student practice → timed pass → level-up to level 2
- [ ] Level prerequisite: cannot skip to level 3 without passing level 2
- [ ] Review mode → no timer, no level-up badge on results

### 5. Disable institute

- [ ] Super Admin disables Acme → Acme users cannot sign in
- [ ] Re-enable → access restored

### 6. Analytics & ranking

- [ ] Admin dashboard chart shows Acme-only data when logged in as Acme admin
- [ ] Student ranking filters: group / period / level stats
- [ ] Super dashboard shows platform-wide totals

### 7. Public & ops

- [ ] `/` landing, `/privacy`, `/terms` load without auth
- [ ] Forgot password flow (dev: link in terminal)
- [ ] `npm test` and `npm run build` green

---

## Related docs

- [DEPLOYMENT.md](./DEPLOYMENT.md) — staging/production deploy
- [SUPER_ADMIN_RUNBOOK.md](./SUPER_ADMIN_RUNBOOK.md) — platform operator guide
