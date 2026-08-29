# Decision log — Client Management (Staff Side)

Feature: Staff-side client management (add, edit, list, view basic profile, deactivate).
Branch: `feature/client-management`.

## Scope and Boundaries
- Reuses the existing `Client` model (`app/Models/Client.php`) without recreation.
- Covers basic contact profile, contact method preferences, and emergency contact details.
- Does **NOT** build clinical health history, intake forms, consent documents, or clinical notes (separate modules).
- Patient self-registration portal remains isolated; this is staff-internal administration under `/app/clients`.

## Key Decisions & Assumptions

1. **Active/Inactive Status via `is_active` boolean column**:
   - `Client` already utilized `SoftDeletes` (`deleted_at`), but hard-deleting or purely soft-deleting makes managing client directory states ambiguous.
   - We added an `is_active` (`boolean`, default `true`, indexed) column to the `clients` table (`2026_08_29_000001_add_is_active_to_clients_table.php`).
   - Toggling `is_active` allows clinic staff to deactivate a client without losing any clinical records, appointment history, or invoices.

2. **Appointment Deletion Protection**:
   - If a client has existing appointment history (`Appointment::where('client_id', $client->id)->exists()`), attempting to delete the record is explicitly blocked with a session error:
     > *"This client has appointment history and cannot be deleted. Deactivate them instead to preserve clinical history."*
   - Only clients with zero appointment history can be soft-deleted.

3. **Multi-Tenancy & Existence Disclosure Protection**:
   - All client queries and mutations are strictly tenant-scoped via `BelongsToTenant` and `TenantScope`.
   - In addition to the global scope, `ClientController` enforces explicit boundary checks (`authorizeClient($client)`):
     `abort_unless($client->tenant_id === TenantScope::getTenantId(), 404);`
   - Using a **404** (rather than a 403) prevents leaking whether a client ID or patient profile exists at another clinic.

4. **URL Identifiers (Spec §20)**:
   - `Client` model uses `HasUuids` (`id` is a UUID). No sequential integer IDs are exposed in URLs or Inertia JSON payloads.

5. **Appointment Calendar Integration**:
   - `AppointmentController::clients()` was updated to filter by `where('is_active', true)`.
   - Newly created clients appear immediately in the appointment modal dropdown.
   - Deactivated clients are excluded from new bookings while existing scheduled appointments remain fully intact.

6. **Validation & Email Sanitization**:
   - Names (`first_name`, `last_name`) are required.
   - Email is optional for walk-ins/phone callers, but if provided, it is validated and screened against disposable/temporary email domains using `NotDisposableEmail`.
   - Emergency contact information is stored in the existing `emergency_contact` JSONB column (`name`, `phone`, `relationship`).

7. **Audit Logging & Activity Tracking**:
   - All mutations (`client.created`, `client.updated`, `client.reactivated`, `client.deactivated`, `client.deleted`) write an append-only `AuditEvent` record scoped to the active tenant and authenticated staff user.
