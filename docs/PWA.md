# PWA — Progressive Web App (design)

Enterprise-grade PWA roadmap for SEFT Abacus. This document is the single
reference for how installability, caching, offline behaviour, and push
notifications are modelled, rolled out, and tested.

> **Status:** Implemented for MVP with **Serwist (`@serwist/turbopack`)**: manifest,
> icons, build-time precache, offline fallback, student install prompt, update
> toast, and Web Push subscribe/send. **Server remains the source of truth** for
> practice timing, scoring, and exams — no trusted offline practice.

---

## 1. Goals

1. **Students can install the app** on phones and tablets (home screen / app
   drawer) and get a fast, app-like shell — the primary PWA audience.
2. **Repeat visits feel instant.** Static shell, fonts, and icons load from
   cache; navigations stay snappy on slow mobile networks.
3. **Graceful offline UX.** When the network drops, users see a clear offline
   state — not a broken white screen. Practice and exams **require** network.
4. **White-label aware where the platform allows.** Per-institute name, theme
   colour, and logo appear in-app today; PWA install branding follows a
   deliberate phased strategy (see §5).
5. **Safe by default.** Auth cookies, session APIs, and mutation endpoints are
   never cached by the service worker. RBAC and anti-cheat rules are unchanged.
6. **Operable.** Deploys invalidate stale caches predictably; install and push
   funnels are measurable.

### Non-goals (Phase 1 PWA)

- **Trusted offline practice or exams.** Server-side timing and grading are
  non-negotiable (`AGENTS.md` rule 3). Queue-and-sync submit opens a cheat
  vector (clock manipulation, answer lookup) and is out of scope.
- **Replacing native apps.** PWA is the right first mobile delivery for MVP;
  Capacitor / TWA wrappers are a later option if app-store presence is required.
- **Caching admin/teacher dashboards for offline use.** Low value, high risk of
  showing stale institute data.

---

## 2. Current state (baseline)

| Concern | Today |
| ------- | ----- |
| Web App Manifest | ✅ `app/manifest.ts` served at `/manifest.webmanifest` |
| Service worker | ✅ Serwist via `app/sw.ts` → `/serwist/sw.js` (`app/serwist/[path]/route.ts`) |
| App icons (192/512 maskable) | ✅ `public/icons/` PNG set |
| `theme-color` / Apple meta | ✅ Root layout metadata + viewport |
| Install prompt UX | ✅ Student layout prompt + iOS hint |
| Offline fallback page | ✅ `app/~offline/page.tsx` |
| Web Push | ✅ VAPID-backed subscribe/unsubscribe APIs + account toggle |
| White-label in UI | ✅ Institute `name`, `logoUrl`, `primaryColor` in DB + theme CSS vars |
| White-label per origin | ❌ Single deployment origin; branding is session-scoped in-app |
| Hosting | Vercel (recommended per `docs/DEPLOYMENT.md`) |
| Framework | Next.js **16** App Router — read `node_modules/next/dist/docs/` before unfamiliar APIs |

**Current limitation:** institute-specific installed launcher branding is still
future work. Runtime UI remains white-label after login.

---

## 3. What “PWA” means for this product

```
┌─────────────────────────────────────────────────────────────┐
│  PWA layers (all optional to adopt incrementally)           │
├─────────────────────────────────────────────────────────────┤
│  A. Manifest + icons     → installable, branded launcher    │
│  B. Service worker       → precache shell, offline page     │
│  C. Install UX           → prompt, instructions, analytics  │
│  D. Web Push             → re-engage (exam reminders, etc.)   │
│  E. Dynamic branding     → institute-aware manifest (later)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
         Practice / exams ALWAYS require live server verification
```

| User | PWA value |
| ---- | --------- |
| **Student** | Install on phone, faster practice entry, optional push for exams |
| **Teacher** | Nice-to-have install; mostly desktop/tablet browser |
| **Admin / Super Admin** | Low priority; management workflows assume connectivity |

---

## 4. Architecture — four layers

### Layer 1 — Web App Manifest (no service worker required)

Served at `/manifest.webmanifest` (Next.js `app/manifest.ts` metadata route).

Minimum fields:

```ts
// Illustrative — final values in implementation
{
  name: "SEFT Abacus",
  short_name: "Abacus",
  description: APP_TAGLINE,
  start_url: "/login",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#ffffff",
  theme_color: "#4F46E5", // DEFAULT_PRIMARY_COLOR until dynamic manifest
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}
```

Also wire in root layout / metadata:

- `theme-color` (light + dark if needed)
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`
- `apple-touch-icon`
- Existing `metadata` in `app/layout.tsx` stays; manifest complements it.

**`start_url` choice:** `/login` for logged-out install, or `/dashboard` with a
redirect — prefer `/login` so cold-start always has a valid entry without relying
on a stale session.

### Layer 2 — Service worker (Serwist + Turbopack)

**Library:** [`@serwist/turbopack`](https://serwist.pages.dev/docs/next/turbo) —
build-time precache manifest injection for Next.js 16 (Turbopack). Service
worker source lives in `app/sw.ts`; the built worker is served at
`/serwist/sw.js` via `app/serwist/[path]/route.ts`.

```
Browser request
      │
      ▼
┌─────────────┐     miss      ┌──────────────┐
│ Serwist SW  │ ────────────► │ Next.js /    │
│ /serwist/   │               │ Vercel CDN   │
└─────────────┘               └──────────────┘
      │ hit
      ▼
  Cache Storage (build precache + runtime caches)
```

**Build integration:**

- `next.config.ts` — `withSerwist()` wrapper + `/serwist/sw.js` security headers
- `app/sw.ts` — Serwist runtime config, push handlers, `SKIP_WAITING` message
- `app/serwist/[path]/route.ts` — `createSerwistRoute()` (precache manifest)
- `components/pwa/pwa-shell.tsx` — `SerwistProvider` registration
- `app/~offline/page.tsx` — offline fallback for document navigations

### Layer 3 — Caching policy (enterprise-critical)

| Resource | Strategy | Cache? | Rationale |
| -------- | -------- | ------ | --------- |
| `/_next/static/*` (JS/CSS chunks) | **Precache** + cache-first | ✅ | Immutable hashed assets; core perf win |
| Fonts (Geist) | **Precache** or cache-first | ✅ | Stable; large on mobile |
| `/icons/*`, static images | cache-first | ✅ | Rarely change |
| Institute `logoUrl` (Blob/CDN) | stale-while-revalidate | ✅ short TTL | White-label; must refresh |
| HTML / RSC flight data | **network-first** | ❌ or very short | Auth + role layouts; stale shell is confusing |
| `/api/auth/*` | **network-only** | ❌ never | Session cookies; security |
| `/api/notifications/*` | network-only | ❌ | User-specific |
| Server Actions (`POST`) | network-only | ❌ | Mutations + RBAC |
| Student practice pages | network-first | ❌ | Questions + timers are server-owned |
| `/login`, `/403`, public pages | network-first | optional SWR | OK to show cached shell with offline banner |

**Rule:** if a response is **user-specific** or **authoritative for scoring**,
the service worker must not serve a cached copy. When in doubt, network-only.

### Layer 4 — Install & update UX (client)

| Component | Responsibility |
| --------- | -------------- |
| `components/pwa/install-prompt.tsx` | Capture `beforeinstallprompt`; show dismissible banner (student layout primarily) |
| `components/pwa/ios-install-hint.tsx` | Safari has no `beforeinstallprompt` — show “Share → Add to Home Screen” steps |
| `components/pwa/pwa-runtime.tsx` | Registers SW and shows update refresh UI |
| `lib/pwa.ts` | `isStandalone()`, `canInstall()`, platform detection — pure helpers + unit tests |

**Update policy:** `skipWaiting: false` on first ship — user chooses when to
refresh after deploy. Admins can force-refresh via toast; avoid silent SW swaps
mid-practice-session.

---

## 5. Multi-institute white-label strategy

Today every institute shares **one origin** (`BETTER_AUTH_URL`). Branding is
applied **after login** via session + `Institute` row. PWAs are **origin-scoped**,
so install branding has constraints:

| Approach | Install icon / name | Complexity | When |
| -------- | ------------------- | ---------- | ---- |
| **A. Platform manifest** | SEFT Abacus + platform icons | Low | **Phase A–C (recommended first)** |
| **B. Dynamic manifest route** | `GET /manifest.webmanifest` reads session cookie → institute `name`, `theme_color`, generated icons from `logoUrl` | Medium | Phase E |
| **C. Custom domain per institute** | True per-tenant install (`learn.seft.com`, `abacus.client.com`) | High | Phase 2+ platform |

**Recommendation:** ship **A** first. In-app white-label (nav, theme, logo) already
works; installed launcher label showing platform name is acceptable for MVP.

**Dynamic manifest (B) caveats:**

- Manifest is fetched at **install time** — switching institute account later does
  not rename the installed icon.
- Icon generation from arbitrary `logoUrl` needs a server pipeline (sharp) or
  precomputed sizes on logo upload.
- Cache `manifest.webmanifest` with `Cache-Control: private, no-store` when
  session-scoped.

**Custom domains (C)** is the enterprise end-state for white-label institutes
who want their own installable brand; plan separately in multi-tenant hosting.

---

## 6. Web Push (optional layer — after core PWA)

Complements existing in-app notifications (`NotificationSyncProvider` polling).

```
┌──────────────┐    subscribe     ┌─────────────────┐
│ Browser Push │ ◄─────────────── │ POST /api/push/ │
│ Manager      │                  │ subscribe       │
└──────────────┘                  └────────┬────────┘
        │                                  │
        │  push event                      ▼
        ▼                         ┌─────────────────┐
┌──────────────┐                  │ DB: PushSub     │
│ SW show      │                  │ + send on cron  │
│ Notification │ ◄────────────────│ (exam reminders)│
└──────────────┘                  └─────────────────┘
```

**Prerequisites:** HTTPS (Vercel ✅), service worker, VAPID keys in env
(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).

**Scope for MVP push:**

- Exam window opening / reminder (extends existing cron notifications)
- Permission changed (already `PERMISSION_CHANGED` in-app)
- **Not** every notification type — avoid noise; user preference opt-in

**Schema (proposed, Phase D):**

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
  @@map("push_subscription")
}
```

**iOS note:** Web Push on installed PWAs requires iOS 16.4+; always keep in-app
notification inbox as fallback.

---

## 7. Security & integrity guardrails

| Guardrail | Rule |
| --------- | ---- |
| **Auth never cached** | `/api/auth/*`, session cookies, `Set-Cookie` responses → network-only |
| **Mutations never cached** | All Server Actions and `POST`/`PUT`/`DELETE` routes → network-only |
| **No offline submit** | Practice/exam submit actions fail closed without network; UI explains why |
| **No trusted client timers** | Unchanged — server `startedAt` / `expiresAt` remain authoritative |
| **RBAC unchanged** | SW does not bypass `requirePermission` / `requireAdminPermission` |
| **Scope** | `scope: "/"` — do not register multiple SWs |
| **HTTPS only** | SW registration guarded: `location.protocol === 'https:'` or localhost dev |
| **Update integrity** | Precache manifest versioned per build; old caches deleted on activate |

---

## 8. Phased rollout (one task at a time)

Aligned with `AGENTS.md` — build only the current phase; stop after each task.

| Phase | Deliverable | SW? | DB? | Primary audience |
| ----- | ----------- | --- | --- | ---------------- |
| **A** | Manifest (`app/manifest.ts`), icon set (`public/icons/`), root meta tags, favicon | ❌ | ❌ | All |
| **B** | Service worker, static cache, offline fallback page, `~offline` route | ✅ | ❌ | All |
| **C** | Install prompt + iOS hint (student layout), update toast, `lib/pwa.ts` + tests | ✅ | ❌ | Student |
| **D** | Web Push subscribe/unsubscribe API, VAPID, cron send for exam reminders, opt-in UI | ✅ | ✅ | Student (+ Teacher optional) |
| **E** | Dynamic manifest (institute name / theme); logo→icon pipeline on upload | ✅ | maybe | White-label |
| **F** | Lighthouse CI gate, cache-bust tests, install analytics, runbook | ✅ | ❌ | Ops |

### Phase A — Installable shell (no service worker)

**Files (proposed):**

- `app/manifest.ts` — static platform manifest
- `public/icons/icon-{192,512}.png`, `icon-maskable-512.png`
- `app/icon.tsx` / `app/apple-icon.tsx` — Next.js metadata file icons (optional)
- `app/layout.tsx` — `viewport.themeColor`, Apple meta via `metadata`

**Acceptance:**

- Chrome DevTools → Application → Manifest shows no errors
- Lighthouse PWA → “Installable” passes (icons + manifest + HTTPS)
- Android “Install app” available on `/login` or student home

**How to test:** `npm run build && npm start`, open on phone or emulator, check
install prompt in Chrome menu.

### Phase B — Service worker + offline fallback

**Files (proposed):**

- `next.config.ts` — Serwist wrapper
- `app/sw.ts` — precache + runtime routes
- `app/~offline/page.tsx` — friendly offline page (reuses `EmptyState` / auth shell styling)
- `serwist.config.ts` or inline Serwist config — revisioned precache

**Acceptance:**

- Repeat visit loads shell noticeably faster (static assets from SW)
- Airplane mode → offline page instead of browser error dinosaur
- `/api/auth/*` still works when online after offline detour (no stale auth)

**How to test:** DevTools → Application → Service Workers; Network → Offline;
confirm practice page shows “connection required” not cached questions.

### Phase C — Install & update UX

**Files (proposed):**

- `components/pwa/install-prompt.tsx`
- `components/pwa/ios-install-hint.tsx`
- `components/pwa/update-toast.tsx`
- `lib/pwa.ts`, `lib/pwa.test.ts`
- Wire into `app/student/layout.tsx` (not admin/teacher initially)

**Acceptance:**

- Android: banner appears once, dismiss persists in `localStorage`
- iOS: hint shown once on Safari
- After deploy: update toast offers refresh; practice session not killed silently

### Phase D — Web Push

**Files (proposed):**

- `prisma/schema.prisma` — `PushSubscription`
- `app/api/push/subscribe/route.ts`, `app/api/push/unsubscribe/route.ts`
- `server/web-push.ts` — send helper (web-push library)
- `components/account/notification-preferences.tsx` — push toggle (extend existing prefs if present)
- Cron integration in `server/notification-cron.ts`

**Acceptance:**

- Opt-in → subscription stored; opt-out → row deleted
- Exam reminder cron sends push to subscribed students in window
- Clicking notification opens correct `/student/...` route

### Phase E — Dynamic white-label manifest

**Trigger:** second live institute or paying client requests own install branding.

- `app/manifest.webmanifest/route.ts` (dynamic) or rewrite
- `server/institute-pwa-icons.ts` — generate PNG sizes on logo upload
- Fallback to platform icons when `logoUrl` missing

### Phase F — Hardening & ops

- Lighthouse CI: PWA score ≥ 90 on `/login` and `/student`
- `lib/pwa-cache-policy.test.ts` — document/cache route list stays in sync
- `docs/PWA_RUNBOOK.md` — VAPID rotation, SW debug, “users stuck on old version”
- Vercel analytics event: `pwa_install`, `pwa_update_accept`

---

## 9. Proposed file layout (after all phases)

```
app/
  manifest.ts              # Phase A (static) → Phase E (dynamic route)
  sw.ts                    # Phase B — Serwist service worker entry
  ~offline/page.tsx        # Phase B — offline fallback
  icon.tsx                 # Phase A
  apple-icon.tsx           # Phase A
  api/push/
    subscribe/route.ts     # Phase D
    unsubscribe/route.ts   # Phase D

public/icons/              # Phase A platform icons

components/pwa/
  install-prompt.tsx       # Phase C
  ios-install-hint.tsx     # Phase C
  update-toast.tsx         # Phase C

lib/
  pwa.ts                   # Phase C — pure helpers
  pwa.test.ts

server/
  web-push.ts              # Phase D
  institute-pwa-icons.ts   # Phase E

serwist.config.ts          # Phase B (or colocated in next.config)
```

---

## 10. Dependencies (planned)

| Package | Phase | Notes |
| ------- | ----- | ----- |
| `@serwist/next` + `serwist` | B | App Router service worker |
| `web-push` | D | Server-side push send; types via `@types/web-push` |
| `sharp` | E | Icon resize from institute logo (already common on Vercel) |

No new dependencies for Phase A (manifest + icons only).

---

## 11. Alternatives considered

| Option | Verdict |
| ------ | ------- |
| **`next-pwa`** | ❌ Reject — unmaintained, App Router friction |
| **Manual Workbox without Serwist** | ⚠️ Possible but more boilerplate; Serwist is the Next-native path |
| **Trusted offline practice queue (IndexedDB)** | ❌ Reject — violates server-truth; cheat vector |
| **Capacitor / React Native wrapper** | ⏸ Later — app-store presence, native APIs; higher maintenance |
| **TWA (Trusted Web Activity)** | ⏸ Later — Play Store listing wrapping the PWA |
| **Per-institute subdomain only for PWA** | ⏸ Tied to custom-domain programme (§5C) |

---

## 12. Testing strategy

| Layer | Tests |
| ----- | ----- |
| **Pure helpers** | `lib/pwa.test.ts` — `isStandalone`, platform sniffing |
| **Cache policy** | Static list of `network-only` patterns; CI fails if SW config drifts |
| **Manifest** | Snapshot or schema validation of `app/manifest.ts` output |
| **Manual matrix** | Chrome Android install, Safari iOS Add to Home Screen, Desktop Edge |
| **Lighthouse** | CI artefact on `/login` + `/student` — installable + SW registered |
| **Deploy smoke** | After release: old SW updates, toast appears, no auth loop |

**Offline practice negative test (manual):** start practice → go offline → confirm
submit is blocked with clear copy; no cached question payload in Application → Cache.

---

## 13. Success metrics

| Metric | Target (3 months post Phase C) |
| ------ | ------------------------------ |
| Install rate (students) | Track; no hard gate initially |
| Lighthouse PWA | ≥ 90 on student routes |
| Repeat-visit LCP | Measurable improvement vs pre-SW baseline |
| SW update complaints | Near zero (toast + user-controlled refresh) |
| Push opt-in (Phase D) | Track; aim > 20% of active students if exam reminders ship |

---

## 14. Open questions

1. **Custom domains per institute** — timeline? Drives true per-tenant install branding (§5C).
2. **Push notification scope** — exam reminders only at first, or also level-up / teacher messages?
3. **`start_url`** — `/login` vs role-aware `/dashboard` redirect after install?
4. **Portrait lock** — `orientation: "portrait"` for student practice, or `any` for tablets?
5. **Vercel preview deployments** — disable SW on `*.vercel.app` previews to avoid cache confusion (recommended: `disable: process.env.VERCEL_ENV === 'preview'`).

---

## 15. Quick reference — what to build first

**If you want one sprint with maximum impact:**

1. Phase **A** — manifest + icons (installable in one day)
2. Phase **B** — Serwist precache + offline page (perf + polish)
3. Phase **C** — student install banner (adoption)

Push (D) and dynamic branding (E) wait until real user demand or second institute.

**First implementation task:** Phase A — create `app/manifest.ts`, generate
`public/icons/`, add `theme-color` to root layout, verify Lighthouse Installable.
