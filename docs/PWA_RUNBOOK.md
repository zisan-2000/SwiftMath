# PWA operations runbook

Operator guide for install issues, service worker updates, and push notifications.
Phase 1 — SEFT Abacus / SwiftMath.

---

## 1. Quick health checks

After deploy, verify:

| Check | URL / action | Expected |
| ----- | ------------ | -------- |
| Manifest | `/manifest.webmanifest` | JSON with `name`, `icons`, `display: standalone` |
| Service worker | `/serwist/sw.js` | JavaScript, `Cache-Control: no-cache` |
| Login loads | `/login` | Form renders, no server error |
| Student install guide | `/student/help/install` | Bengali/English steps |
| Offline page | `/~offline` | Friendly offline message |

---

## 2. Environment variables (production)

| Variable | Required for PWA |
| -------- | ---------------- |
| `BETTER_AUTH_URL` | Yes — must match browser origin (`https://…`, no trailing slash) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push |
| `VAPID_PRIVATE_KEY` | Push |
| `CRON_SECRET` | Exam notification cron auth |
| `BLOB_READ_WRITE_TOKEN` | Logo upload only (not PWA core) |

**Do not set** `NEXT_PUBLIC_ENABLE_PWA_DEV` in production.

---

## 3. Service worker issues

### Symptom: Console shows `ServiceWorker script evaluation failed`

1. Open `/serwist/sw.js` directly in the browser.
2. If **404** or HTML error page → deploy/build issue; redeploy.
3. If **JS loads** but registration fails → check browser console for CSP or syntax errors.
4. Confirm `BETTER_AUTH_URL` is correct (wrong auth config can break pages before SW registers).

### Symptom: Users stuck on an old version

1. User should see **“Update available”** toast at the bottom.
2. Tap **Refresh** — sends `SKIP_WAITING` to the waiting worker.
3. If no toast: hard refresh (`Ctrl+Shift+R`) or clear site data for the origin.
4. Preview deployments: SW is **disabled** on Vercel Preview (`VERCEL_ENV=preview`).

### Local debug

```bash
npm run build && npm run start
# Chrome DevTools → Application → Service Workers
```

---

## 4. Install prompt not showing (students)

The auto-prompt only shows when **all** are true:

- User is a **student** on `/student/*`
- Not already **installed** (standalone display mode)
- Not **permanently dismissed** or within **7-day snooze**
- Shown fewer than **3** auto times
- **2nd visit** OR **completed at least one practice**
- Mobile platform (Android / iOS) or `?install=1` forced

**Manual paths for students:**

- Nav → **Get app**
- Account → **Mobile app** → How to install
- Direct link: `https://<your-domain>/student/help/install`

**Share from admin/teacher:**

- Admin → Settings → **Share student app install**
- Copy link / WhatsApp / QR

---

## 5. iOS-specific

| Issue | Fix |
| ----- | --- |
| No install button | Must use **Safari** — not Chrome, not WhatsApp in-app browser |
| Push does not work | User must **install to home screen first**, then enable push in Account |
| Steps | Share → Add to Home Screen → Add |

---

## 6. Android-specific

| Issue | Fix |
| ----- | --- |
| No install banner | Chrome menu (⋮) → **Install app** or **Add to Home screen** |
| `beforeinstallprompt` missing | Ensure SW registered + manifest valid + HTTPS |

---

## 7. Web Push

### Enable flow (students)

1. Install app (home screen) — required on iOS.
2. Account → **Browser push** → On.
3. Accept browser permission prompt.

### VAPID key rotation

1. Generate new keys: `npx web-push generate-vapid-keys`
2. Update `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Vercel.
3. Redeploy.
4. Users must **re-enable** push in Account (old subscriptions invalid).

---

## 8. Analytics funnel (logs)

Client events POST to `/api/pwa/analytics` and log as structured JSON:

```
[pwa-analytics] {"event":"pwa_prompt_shown","metadata":{"platform":"ios-safari"},...}
```

| Event | Meaning |
| ----- | ------- |
| `pwa_prompt_shown` | Auto or forced install sheet opened |
| `pwa_install_accepted` | User accepted native install (Android) |
| `pwa_appinstalled` | `appinstalled` event fired |
| `pwa_push_followup_shown` | Post-install push nudge |
| `pwa_help_opened` | Student opened install help page |
| `pwa_update_accept` | User refreshed after SW update |

**Vercel:** Project → Logs → filter `[pwa-analytics]`.

---

## 9. Cron (exam notifications)

Hobby Vercel plan: only **daily** crons in `vercel.json`.

- Retention cron: daily at 03:00 UTC — OK on Hobby.
- 5-minute exam cron: use external scheduler (GitHub Actions, cron-job.org) with `Authorization: Bearer <CRON_SECRET>`.

---

## 10. Lighthouse / CI

Local:

```bash
npm run build
npm run start
# separate terminal:
npm run lighthouse:pwa
```

CI runs the same check on `/login` and fails if PWA score &lt; 90.

---

## 11. Related docs

- [PWA.md](./PWA.md) — architecture and phases
- [PWA_STUDENT_INSTALL_HANDOUT.md](./PWA_STUDENT_INSTALL_HANDOUT.md) — Bengali class handout
- [DEPLOYMENT.md](./DEPLOYMENT.md) — full deploy guide
