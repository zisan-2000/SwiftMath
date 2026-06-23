# Super Admin runbook

Platform operators use the **`SUPER_ADMIN`** role to manage every institute on
SEFT Abacus. This guide covers day-one support tasks.

**Sign-in (seed):** `super@seft.test` / `Password123!`  
**Home route:** `/super`

---

## Dashboard (`/super`)

- **Institute / user counts** — headline stats across all tenants
- **Practice (last 7 days)** — platform-wide sessions, pass rate, accuracy chart
- **Manage → Institutes** — link to full institute list

---

## Institutes list (`/super/institutes`)

| Action | How |
| ------ | --- |
| **Create institute** | “New institute” → name, slug, optional tagline/logo, first admin credentials |
| **Edit** | Row → Edit → update name, slug, branding |
| **Disable** | Disable → all institute members lose access (sessions revoked) |
| **Enable** | Re-enable after maintenance |
| **Drill-in** | Click institute **name** → detail page |

New institutes automatically receive the **9-level starter curriculum** (addition
through division) and an admin account.

---

## Institute drill-in (`/super/institutes/[id]`)

Support view for one tenant:

- Branding preview, created date, enable/disable, edit
- Role counts (admins, teachers, students, groups, levels)
- **Institute admins** list with **Reset password** per admin

Use drill-in when an institute admin is locked out or you need counts without
impersonating them.

---

## Common support scenarios

### New client onboarding

1. Create institute + admin (`/super/institutes` → New institute).
2. Send admin their email and temporary password securely.
3. Ask admin to sign in, change password via `/account`, complete onboarding
   checklist on `/admin`.
4. Admin creates teachers; teachers create groups and students.

### Admin forgot password

1. Open institute drill-in → reset admin password.
2. Or direct them to `/forgot-password` (requires Resend in production).

### Institute off-boarding

1. **Disable** the institute (keeps data, blocks login).
2. Do not delete the institute row unless you have a formal data-deletion process.

### Suspected cheating

1. Check server logs for `{"event":"practice.anomaly",...}` after student submits.
2. Flags: `FAST_SUBMIT`, `HIGH_TAB_BLUR` — informational only; grading unchanged.
3. Follow institute policy; no automated penalty in Phase 2.

---

## What Super Admin cannot do

- Manage teachers, students, groups, or levels **inside** an institute (that is
  institute `ADMIN` / `TEACHER` work).
- Impersonate another user (no “view as admin” in Phase 2).

---

## Environment notes

| Concern | Action |
| ------- | ------ |
| Email not sending | Set `RESEND_API_KEY` + `EMAIL_FROM` in production; see `.env.example` |
| Migrations | `npm run db:migrate:deploy` on staging/production after deploy |
| CI | GitHub Actions runs `lint`, `build`, and `npm test` on every PR |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deploy steps.
