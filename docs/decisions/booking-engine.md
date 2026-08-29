# Decision log — Calendar & Booking Engine (Phase 1, staff-internal)

Branch: `feature/booking-engine`. Scope: staff create/manage appointments on a
calendar. Patient-facing public booking, payments, reminders and notifications
are explicitly **out of scope** for this phase.

## Reused (nothing recreated)

- **`Appointment` model + table** already existed with UUID PK, `BelongsToTenant`
  scope, and statuses `scheduled / confirmed / checked_in / completed /
  cancelled / no_show`. We added columns only (`notes`, `cancelled_at`,
  `cancellation_reason`) — no table recreation. UUID PKs already satisfy
  spec §20 (no sequential IDs in URLs).
- **Tenant scoping**: `App\Scopes\TenantScope` + `BelongsToTenant`. Every read
  and mutation is tenant-scoped by the global scope; the booking service adds
  explicit reference checks.
- **Roles**: `StaffMembership.role` + Spatie. Calendar is reachable by any active
  workspace role via the existing `staff.role` gate on `/app/*`.
- **Timezone**: `tenant.timezone`, already shared to the front-end as
  `auth.tenant.timezone`.

## Assumptions & decisions

1. **Availability source (SCHED-02/03).** There was no per-practitioner
   working-hours or time-off model in the codebase — only clinic-wide
   `tenant.business_hours` (JSON). **Decision (confirmed with product):** Phase 1
   validates bookings against `business_hours` (per-weekday open/close, compared
   in clinic-local wall time). Per-practitioner availability and time-off are a
   later phase. If `business_hours` is not configured, the availability check is
   skipped rather than blocking every booking (so an un-onboarded demo clinic can
   still book). `business_hours` is assumed keyed by lowercase weekday
   (`monday`…`sunday`) with `{ closed, open (H:i), close (H:i) }`, matching the
   onboarding wizard.

2. **Service & duration.** There is no Services catalog; `service_name` is
   free text. **Decision (confirmed):** staff type a service name and set the
   duration (minutes) directly; `ends_at = starts_at + duration`. A Services
   catalog (auto-filled durations) is deferred.

3. **Timezone storage.** All times stored in **UTC** (`timestamp` columns). The
   form submits a clinic-local `date` + `start_time` + `duration_minutes`; the
   service converts local→UTC using the tenant timezone. Availability is checked
   against local wall time; overlap is checked on absolute UTC instants. The
   calendar renders UTC instants back into the clinic timezone via `Intl`.

4. **Conflict prevention (SCHED-04) — defense in depth.**
   - *Pre-check*: a portable overlap query rejects a booking that overlaps an
     active appointment for the same practitioner or same room, with a friendly
     per-field error. "Active" = `scheduled/confirmed/checked_in/completed`;
     cancelled and no-show free the slot.
   - *Locking*: the check + insert run in one `DB::transaction`. On Postgres,
     transaction-scoped **advisory locks** (`pg_advisory_xact_lock`) on the
     practitioner and room serialize concurrent bookings for the same resource.
   - *Database backstop (race-proof)*: Postgres `EXCLUDE` constraints
     (`btree_gist` on `tsrange(starts_at, ends_at)` + practitioner / room) make
     it **impossible** to persist two overlapping active appointments regardless
     of timing. A raced insert that slips past the pre-check is caught (SQLSTATE
     `23P01`) and re-surfaced as the same clean validation error.
   - The constraints are Postgres-only (guarded by driver check); other drivers
     rely on the pre-check plus their own write serialization.

5. **Reschedule** re-runs the identical availability + conflict checks, excluding
   the appointment itself (so it never clashes with its own current slot).

6. **Cancel** is a soft state change: `status = cancelled` + `cancelled_at`, the
   record is kept (never hard-deleted), and the slot is freed for re-booking.

7. **Who can book/edit/cancel.** Any active workspace role (owner, practitioner,
   receptionist), consistent with the existing `/app` `staff.role` pattern. No
   new Spatie permission was introduced; if finer control is wanted later, a
   `appointments.manage` permission can gate the mutation routes.

## Security note — pre-existing cross-tenant route-binding gap (flagged separately)

While building this I found that Laravel's `SubstituteBindings` middleware runs
**before** the tenant context is established (`ResolveTenantFromSubdomain` /
`SetTenantContext`), so implicit route-model binding is **not** tenant-scoped at
bind time. This let a clinic-A staff member mutate a clinic-B record by ID
(verified: a cross-tenant cancel succeeded). This affects **all** `/app` implicit
bindings (locations, rooms, staff memberships, …), not just appointments.

- **This feature is protected**: `AppointmentController::authorizeAppointment()`
  aborts 404 unless the bound appointment belongs to the current tenant (checked
  in the controller, where the tenant *is* resolved). Covered by
  `test_a_clinic_cannot_cancel_another_clinics_appointment`.
- **Systemic fix recommended** (out of scope here): ensure the tenant is resolved
  before `SubstituteBindings` (middleware priority), or make binding tenant-aware,
  then audit the other controllers. Flagged as a follow-up task.

## Tests

`tests/Feature/Booking/` (run on Postgres — see README/summary):
- overlapping practitioner rejected; overlapping room rejected
- booking before open / after close / on a closed day rejected
- cross-tenant practitioner reference rejected (service layer)
- reschedule recomputes UTC, re-runs conflicts, ignores self
- cancel keeps record + frees slot
- DB exclusion constraint rejects an overlapping insert (race backstop)
- a raced booking is rejected with a clean validation error (TOCTOU seam)
- HTTP: staff open calendar; receptionist can book; overlap → validation error;
  cross-tenant cancel → 404
