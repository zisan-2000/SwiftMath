# RBAC — Roles, Permissions & Access Control (design)

Enterprise-grade authorization plan for SEFT Abacus. This document is the single
reference for how access control is modelled, enforced, and administered.

> **Status:** Phase A-C implemented; Phase D pending. Approved direction:
> **per-user permission overrides + custom permission layer + full role chain**
> (Super Admin → Admin → Teacher → Student).

---

## 1. Goals

1. **Admin = full control of one institute.** An Admin can perform every
   institute-scoped action and can **configure the permissions of everyone under
   them** (Teachers and Students).
2. **Super Admin controls Admins.** A Super Admin manages Admin accounts across
   tenants (create / disable / reset) and can configure what an Admin may do.
3. **Server is the source of truth.** Every authorization decision is verified
   server-side. The browser is never trusted.
4. **Multi-institute isolation.** A permission answers *"what can you do"*;
   `instituteId` scoping answers *"on whose data"*. Both are always enforced.
5. **Auditable & safe.** Every permission change is logged; guardrails prevent
   privilege escalation and self-lockout.

---

## 2. Current state (baseline)

| Concern | Today |
| ------- | ----- |
| Roles | Fixed enum `STUDENT / TEACHER / ADMIN / SUPER_ADMIN` on `User.role` |
| Tenancy | Every record carries `instituteId`; Super Admin is cross-tenant |
| AuthN | better-auth (email + password); public sign-up disabled; session carries `role` + `instituteId` |
| AuthZ (edge) | `proxy.ts` — optimistic cookie-presence check only |
| AuthZ (trusted) | `requireUser`, `requireRole(...)`, `requireSuperAdmin` in `lib/session.ts` |
| Scoping | Each server helper manually filters by `instituteId` / ownership (`teacherId`) |

**Limitation:** this is coarse RBAC. Role capabilities are hard-coded, so an
Admin cannot tailor what an individual Teacher may do. The plan below adds a
**permission (capability) layer with per-user grants** on top of the existing
role model — without discarding what already works.

---

## 3. Target model — "RBAC + Grants"

Four layers, all server-enforced. Roles stay as the coarse base; permissions add
fine-grained, per-user control.

```
Role (coarse)  ─┐
                ├─►  Effective permissions  ─►  can(user, permission)
Grants (fine) ──┘        (per request, cached)
                                                 + instituteId / ownership scope
```

### Layer 1 — Permission catalog (code)

A typed, stable set of permission keys grouped by domain. This is the source of
truth for *what actions exist*. Lives in `lib/permissions.ts`.

```ts
export const PERMISSIONS = {
  // ---- Institute-scoped (Admin domain) ----
  TEACHER_CREATE:              "teacher:create",
  TEACHER_DISABLE:             "teacher:disable",
  TEACHER_RESET_PASSWORD:      "teacher:reset_password",
  TEACHER_PERMISSIONS_MANAGE:  "teacher:permissions:manage",

  STUDENT_CREATE:              "student:create",
  STUDENT_DISABLE:             "student:disable",
  STUDENT_RESET_PASSWORD:      "student:reset_password",
  STUDENT_ASSIGN_GROUP:        "student:assign_group",
  STUDENT_ASSIGN_LEVEL:        "student:assign_level",
  STUDENT_EXPORT:              "student:export",
  STUDENT_PERMISSIONS_MANAGE:  "student:permissions:manage",

  GROUP_MANAGE:                "group:manage",          // create/update/delete
  GROUP_ASSIGN_TEACHER:        "group:assign_teacher",
  GROUP_QUESTION_OVERRIDE:     "group:question:override",

  LEVEL_MANAGE:                "level:manage",
  QUESTION_MANAGE:             "question:manage",
  QUESTION_PUBLISH:            "question:publish",
  CURRICULUM_PUBLISH:          "curriculum:publish",

  EXAM_SCHEDULE:               "exam:schedule",
  EXAM_CANCEL:                 "exam:cancel",

  INSTITUTE_SETTINGS:          "institute:settings",
  INSTITUTE_BRANDING:          "institute:branding",

  ANALYTICS_VIEW:              "analytics:view",
  ACTIVITY_VIEW:               "activity:view",

  // ---- Platform-scoped (Super Admin domain) ----
  INSTITUTE_CREATE:            "institute:create",
  INSTITUTE_UPDATE:            "institute:update",
  INSTITUTE_TOGGLE_ACTIVE:     "institute:toggle_active",
  ADMIN_CREATE:                "admin:create",
  ADMIN_DISABLE:               "admin:disable",
  ADMIN_RESET_PASSWORD:        "admin:reset_password",
  ADMIN_PERMISSIONS_MANAGE:    "admin:permissions:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
```

Each permission also carries display metadata (label, description, domain group,
and the roles it is *assignable to*) so the management UI can render it without
hard-coding strings.

### Layer 2 — Role → default permission matrix (code)

Baseline capabilities per role, with **no DB rows required**. Fast, versioned,
unit-testable.

| Role | Defaults |
| ---- | -------- |
| **SUPER_ADMIN** | `*` — all platform permissions + admin management (cross-tenant) |
| **ADMIN** | all institute-scoped permissions (wildcard *within their tenant*) + `teacher:permissions:manage` + `student:permissions:manage` |
| **TEACHER** | `group:manage` (own), `group:question:override`, `student:create`, `student:assign_group`, `student:assign_level`, `exam:schedule`, `exam:cancel`, `analytics:view` (own) — **customizable by Admin** |
| **STUDENT** | none in the permission system — practice is gated by role only |

> **Design rule:** ADMIN holds an institute-scoped wildcard and SUPER_ADMIN a
> platform wildcard. These wildcards are **non-revocable** (see guardrails), so
> "Admin = full control" is guaranteed by construction.

### Layer 3 — Per-user overrides (DB)

The delta layer that lets a higher role tailor a lower user's capabilities.

```prisma
enum PermissionEffect {
  ALLOW
  DENY
}

model UserPermission {
  userId      String
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission  String           // a key from the catalog
  effect      PermissionEffect
  grantedById String            // who set this (audit)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@id([userId, permission])
  @@index([userId])
  @@map("user_permission")
}
```

`User` gains `userPermissions UserPermission[]`. No `instituteId` column is
needed on the row (it is derived from the user), but queries always join through
the target user so tenant scoping still applies.

### Layer 4 — Effective permission resolution

```
effective(user) =
    ( roleDefaults(user.role)  ∪  { p | grant(user, p) = ALLOW } )
    \  { p | grant(user, p) = DENY }
```

- **DENY always wins** over ALLOW and over role defaults.
- ADMIN / SUPER_ADMIN wildcards are applied **after** DENY filtering for their
  own scope, so they can never be denied out of their own domain.
- Resolution runs per request and is memoised with React `cache()` to avoid
  repeat DB hits within a render.

```ts
// server/permissions.ts (proposed)
export const getEffectivePermissions = cache(
  async (user: SessionUser): Promise<Set<Permission>> => { /* matrix ∪ grants − denies */ },
);

export async function can(user: SessionUser, permission: Permission): Promise<boolean> {
  return (await getEffectivePermissions(user)).has(permission);
}
```

### Layer 5 — Enforcement primitive

A single guard, mirroring the existing `requireRole` ergonomics:

```ts
// lib/session.ts (add)
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await can(user, permission))) {
    redirect("/403"); // new friendly "not allowed" page
  }
  return user;
}
```

**Migration of call sites (gradual):**

- Keep `requireRole(...)` for **coarse route gating** in layouts/pages (e.g. only
  ADMIN reaches `/admin/*`).
- Replace **action-level** checks with `requirePermission(...)`, e.g.
  `requireRole(ADMIN)` → `requirePermission(PERMISSIONS.TEACHER_CREATE)` inside
  `addTeacherAction`.
- Tenant scoping (`instituteId` / ownership filters in `server/*`) stays exactly
  as-is — permissions do not replace it.

### Layer 6 — Management UI

- **Admin → Teacher:** a **"Permissions"** tab on `/admin/teachers/[teacherId]`
  showing toggles grouped by domain (Students, Groups, Exams, Analytics …).
  Toggling writes ALLOW/DENY/clear grants.
- **Admin → Student:** a lighter permissions section on
  `/admin/students/[studentId]` (Phase-appropriate: most students need none).
- **Super Admin → Admin:** `/super/institutes/[id]/admins` gains admin
  create/disable/reset (some exist) plus an admin capability panel.

Each toggle shows **effective** state and whether it comes from the role default
or an explicit grant, so operators understand *why* a capability is on/off.

### Layer 7 — Guardrails & audit (enterprise-critical)

| Guardrail | Rule |
| --------- | ---- |
| **Privilege ceiling** | A granter may only ALLOW/DENY permissions **they themselves hold**. No escalation. |
| **Role ceiling** | Teacher cannot manage Admins; Admin cannot manage other Admins (Super Admin required); managing requires the matching `*:permissions:manage` permission. |
| **Tenant isolation** | A user can only manage targets in the **same institute** (Super Admin exempt). |
| **Self-lockout protection** | You cannot revoke your own critical permissions. |
| **Last-admin protection** | An institute must keep ≥1 active Admin; the last one cannot be disabled/demoted. |
| **Non-revocable wildcards** | ADMIN (tenant) and SUPER_ADMIN (platform) wildcards cannot be DENYed. |
| **Audit** | Every grant/revoke writes an `AuditLog` row (`PERMISSION_GRANTED` / `PERMISSION_REVOKED`) with actor, target, permission, effect. |
| **Notify (optional)** | Affected user may receive an in-app notification when capabilities change. |

New `AuditAction` values: `PERMISSION_GRANTED`, `PERMISSION_REVOKED`.

---

## 4. Worked examples

1. **Admin restricts a Teacher from scheduling exams.**
   Admin opens Teacher's Permissions tab → toggles `exam:schedule` off → a
   `DENY exam:schedule` grant is written. That Teacher's
   `requirePermission(EXAM_SCHEDULE)` now redirects to `/403`; the "Schedule
   exam" UI is hidden.

2. **Admin grants a senior Teacher curriculum publishing (normally Admin-only).**
   Only works if the Admin holds `curriculum:publish` (they do, via wildcard) —
   writes `ALLOW curriculum:publish` for that Teacher. Privilege ceiling
   satisfied.

3. **Super Admin provisions a new Admin and limits branding.**
   Creates the Admin (default = institute wildcard), then optionally writes
   `DENY institute:branding`. Because the Admin wildcard is applied per-domain,
   Super Admin's explicit DENY on a specific key is honoured (Super sits above
   the Admin ceiling).

---

## 5. Rollout phases (one task at a time)

| Phase | Deliverable | DB migration |
| ----- | ----------- | ------------ |
| **A** | `lib/permissions.ts` (catalog + role matrix), `server/permissions.ts` (`can`, `getEffectivePermissions` — matrix only), `requirePermission`, `/403` page, unit tests. Wire a handful of admin actions. | ❌ |
| **B** | `UserPermission` table + `PermissionEffect` enum; resolver reads grants; Admin → Teacher permissions UI + server actions + guardrails + audit. | ✅ |
| **C** | Admin → Student permissions UI; Super Admin → Admin management (create/disable/reset) + admin capability panel; notifications. | ✅ (enum values) |
| **D** | Harden: migrate remaining action-level `requireRole` → `requirePermission`, negative/permission unit + integration tests, docs update. | ❌ |

Phase A delivers a clean, tested enforcement layer with **zero schema change**;
grants (Phase B) unlock the "Admin controls each user" requirement.

**Phase A implementation note:** the first rollout uses role defaults only
(no grants table yet), adds the `requirePermission(...)` primitive, and wires
selected Super Admin / Admin mutation boundaries. `institute:update` is included
because the current Super Admin UI can edit tenant identity and branding.

**Phase B implementation note:** `UserPermission` and `PermissionEffect` are now
persisted; effective permission resolution reads per-user ALLOW/DENY overrides.
Admin can manage Teacher permissions from `/admin/teachers/[teacherId]`, with
same-institute validation, teacher-only role ceiling, privilege ceiling, and
audit log rows for permission grant/revoke changes.

**Phase C implementation note:** Admin can now open Student permission controls
from `/admin/students/[studentId]` (currently empty by design because students
have no configurable capabilities yet). Super Admin can create, disable/enable,
reset, and tune institute Admin capabilities from
`/super/institutes/[instituteId]/admins`. Permission changes now create
`PERMISSION_CHANGED` in-app notifications for the affected user.

---

## 6. Alternatives considered

- **better-auth `admin` / `organization` plugins.** Native roles/permissions and
  access-control statements. Rejected for now: the app already has a first-class
  `Institute` model and bespoke scoping; adopting the org plugin means a large
  remodel (institutes → organizations) and less control over tenant logic. The
  custom layer fits the existing schema with lower risk. Revisit if we later need
  SSO/teams/invitations that the plugin provides out of the box.
- **Full custom roles per institute** (Admin defines arbitrary roles). More
  flexible but heavier; per-user grants cover the stated requirement without the
  extra role-management surface. Can be layered on later (a "role" becomes a
  named bundle of permissions applied as grants).

---

## 7. Testing strategy

- **Pure unit tests** for the matrix + resolver: role defaults, ALLOW/DENY
  precedence, wildcard non-revocability, privilege-ceiling checks.
- **Guardrail tests:** escalation attempts, cross-tenant targets, last-admin,
  self-lockout — all must fail closed.
- **Action tests:** each `requirePermission` call site denies without the
  permission and allows with it.
- Follows the existing Vitest setup used for `nav-badges`, `notification-poll`,
  etc.

---

## 8. Open questions / future

- Named permission **bundles/presets** ("Senior Teacher") for one-click grants.
- Time-boxed / expiring grants.
- Optionally cache effective permissions in the session for cross-request perf
  (invalidate on grant change).
- Student-facing permissions are minimal today; revisit if features like
  peer-review or student-led groups appear.
