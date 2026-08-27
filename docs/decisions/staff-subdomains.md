# Decision log — Staff subdomains

Feature: per-clinic staff subdomains (`clinicname.umahz.com`), Jane-style.
Branch: `feature/staff-subdomains`.

## Confirmed by product owner
- **Patient portal host**: dedicated `portal.umahz.com`. Patients never get a per-clinic subdomain; their tenant is resolved from their `clients` record (login-based), as today.
- **Staff login**: served on the clinic subdomain (`clinic.umahz.com/login`). Multi-clinic staff see the existing workspace selector (spec AUTH-01).
- **Cross-clinic visit while logged in**: hard **403** with a clear message. No redirect — we must not leak that another clinic's subdomain exists.

## Decisions made while building (assumptions)
1. **Auth routes stay host-agnostic.** `login`, `logout`, password reset, email verification, invite-accept and `select-workspace` are registered without a domain constraint so they resolve on the central domain, on any clinic subdomain, and on the portal host. Only marketing, `/clinics/register` and `/admin` are pinned to the central domain; only `/app` + `/clinic/status` to subdomains; only `/portal` to the portal host. Rationale: login must work wherever a staff/patient/admin already is, and duplicating named auth routes per-domain is not possible (route names are global).
2. **Subdomain is identification, never authorization.** `ResolveTenantFromSubdomain` resolves the tenant from the host and sets it as the current tenant for the existing `TenantScope` (via the `current_tenant_id` container binding). If an authenticated user has no active *workspace* `StaffMembership` for that tenant → 403. Row-level `tenant_id` scoping is unchanged; the subdomain check is an extra gate.
3. **The subdomain middleware writes the container binding on every request, and the session only after the membership check passes.** It never persists a tenant the user can't access, so a shared `.umahz.com` cookie can't leak clinic B into clinic A's session. Because every subdomain request re-derives the tenant from the URL, session state is not relied upon for isolation.
4. **Platform admins do not get workspace access via subdomains.** `platform_admin` is not a workspace role. A super-admin without an active workspace membership at a clinic gets a 403 on that clinic's subdomain — they operate from `/admin` on the central domain. This keeps the subdomain check strict and uniform.
5. **Guests on a valid subdomain are allowed past the middleware** (no user to check); the downstream `auth` middleware redirects them to login. An **invalid/unknown subdomain is a 404 for everyone**, authenticated or not.
6. **404 / 403 use `abort()` with clear messages**, matching the existing convention (`EnsureStaffRole`, `EnsureClientAccess` both `abort()` with messages) rather than introducing bespoke Inertia error pages / new global error views (out of scope, would touch unrelated modules).
7. **`subdomain` column is nullable at the DB level** but always set by the app. Backfill runs inside the migration. Nullable avoids SQLite `ALTER` limitations while a unique index still enforces uniqueness (multiple NULLs are impossible post-backfill since all rows are filled and every new tenant sets it).
8. **Backfill derives the subdomain from the existing `slug`** (already lowercase alnum+hyphen and unique-ish), padded/suffixed to satisfy the 3–40 length, reserved-word and uniqueness rules.
9. **Reserved list + validation regex live in `config/tenancy.php`** as the single source of truth, consumed by the migration backfill, the live availability endpoint, and the server-side store validation.
10. **No sequential IDs in URLs (spec §20).** Tenants already use UUID primary keys; the subdomain (a slug, not an incrementing id) is the only new URL-facing identifier. No sequential id is exposed.
11. **Central & portal hosts are config-driven** (`APP_CENTRAL_DOMAIN`, optional `APP_PORTAL_HOST`) so the same code runs on `lvh.me` locally and `umahz.com` in production with no code change.
