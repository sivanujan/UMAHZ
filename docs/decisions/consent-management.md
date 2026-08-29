# Decision Log — Consent Management

Feature: Staff-managed client consent capture, immutable storage, withdrawal, and audit trail.
Branch: `feature/consent-management`

---

## 1. Context & Compliance Requirements
Healthcare clinics require legally compliant informed consent agreements prior to treatment (e.g. general therapy consent, sensitive anatomical area consent). Key legal & technical constraints:
- **No Fabricated Legal Language**: UMAHZ must never generate or fake legal/medical consent language. The clinic supplies its own wording per consent type. If no text has been configured by the clinic, the system presents a clear placeholder warning and prohibits signing until text is saved.
- **Data-Driven & Extensible Types**: The clinic comes pre-seeded with two baseline types ("General Treatment Consent" and "Sensitive-Area Consent"), but can add custom consent agreements.
- **Immutability of Signed Records**: Once signed and stored, a consent's text, signer, signature, and timestamp can NEVER be altered. To change an agreement, a new consent must be recorded.
- **Revocation / Withdrawal**: Consents can be marked as withdrawn with an explicit reason, but the signed record is retained indefinitely for compliance and medical-legal audit history.
- **Strict Tenant Isolation**: All queries and mutations are hard-scoped to the current clinic tenant via `BelongsToTenant` and `TenantScope`. Cross-tenant access is rejected with 403 / 404.
- **Full Audit Trail**: Every consent action (`consent.recorded`, `consent.viewed`, `consent.withdrawn`, `consent_type.updated`) logs an append-only `AuditEvent`.
- **Non-Sequential IDs**: All models use UUID primary keys (`HasUuids`).

---

## 2. Architecture & Data Model

### A. Database Tables
1. **`consent_types`**:
   - `id`: UUID primary key.
   - `tenant_id`: Foreign UUID references `tenants(id)` on delete cascade.
   - `name`: string (e.g. "General Treatment Consent").
   - `code`: string (e.g. "general_treatment", "sensitive_area").
   - `description`: text nullable (clinic usage note).
   - `body`: longText nullable (**null until clinic supplies it**; never fabricated).
   - `is_active`: boolean default true.
   - Unique index: `['tenant_id', 'code']`.
2. **`consents`**:
   - `id`: UUID primary key.
   - `tenant_id`: Foreign UUID references `tenants(id)` on delete cascade.
   - `client_id`: Foreign UUID references `clients(id)` on delete cascade.
   - `consent_type_id`: Foreign UUID references `consent_types(id)` on delete set null.
   - `consent_type_name`: string (snapshot of type name at time of signing).
   - `consent_body`: longText (immutable snapshot of exact text agreed to).
   - `signer_name`: string (client's full name).
   - `signature_type`: string (`'draw'` or `'typed'`).
   - `signature_data`: longText (base64 PNG data URL or typed acknowledgment).
   - `witnessed_by_user_id`: Foreign UUID references `users(id)` (staff member who recorded it).
   - `agreed_at`: timestamp (UTC instant).
   - `status`: string (`'active'` or `'withdrawn'`).
   - `withdrawn_at`: timestamp nullable.
   - `withdrawn_by_user_id`: Foreign UUID references `users(id)` nullable.
   - `withdrawal_reason`: text nullable.
   - `ip_address`: string nullable.

### B. Security & Immutability Enforcement
1. **Model Layer Immutability (`Consent::booted`)**:
   - Throws `DomainException` if any core signed attributes (`tenant_id`, `client_id`, `consent_body`, `signer_name`, `signature_data`, `agreed_at`) are modified on update.
2. **Policy Layer (`ConsentPolicy`)**:
   - `view`: Permitted to active clinic staff matching tenant.
   - `create`: Permitted to active clinic staff matching tenant.
   - `update`: Permanently returns `false`.
   - `withdraw`: Permitted to active clinic staff matching tenant.
   - `delete`: Permanently returns `false` (hard deletion prohibited).
3. **Audit Logging**:
   - Recorded on every `store` (`consent.recorded`), `show` (`consent.viewed`), and `withdraw` (`consent.withdrawn`).

### C. Staff User Experience
1. **Client Profile (`Clients/Show.jsx`)**:
   - Dedicated "Informed Consents & Agreements" card.
   - List of all consents on file with status badge (`Active` / `Withdrawn`), agreed timestamp in clinic timezone, signer name, signature type, and staff witness.
   - **"Record Consent" Modal**:
     - Agreement type selector with live text preview.
     - Warning placeholder if consent text is missing (blocking submit).
     - Responsive signature pad for finger/mouse drawing with "Clear" action.
     - Fallback tab for typed signature with explicit agreement acknowledgment checkbox.
     - Live staff witness preview.
   - **"View Agreement" Modal**:
     - Displays the exact snapshot of agreed text, signature image or typed acknowledgment, date/time, and staff witness.
     - Print agreement action (`window.print()`).
   - **"Withdraw" Modal**:
     - Prompts for mandatory reason and archives the consent with audit logging.
2. **Consent Configuration (`Settings/Consents.jsx`)**:
   - Accessible from Clinic Settings.
   - Allows clinic administrators to edit agreement text for each consent type or create custom consent types.

---

## 3. Local Verification Instructions

1. Start development server:
   ```bash
   php -S 127.0.0.1:8000 -t public dev-server-router.php
   npm run dev
   ```
2. Log in as clinic owner or staff:
   - Navigate to `http://lotus-wellness.lvh.me:8000/login`
3. Configure Consent Agreement Text:
   - Go to **Settings &rarr; Informed Consent Agreements** (`/app/settings/consents`).
   - Click "Edit Agreement" on "General Treatment Consent" or "Sensitive-Area Consent".
   - Enter your clinic's consent wording and click "Save Agreement Text".
4. Record Client Consent:
   - Navigate to **Clients &rarr; [Client Profile]** (`/app/clients/{id}`).
   - Under "Informed Consents & Agreements", click **"Record New Consent"**.
   - Select the consent type, review the text, draw a signature or type the client's name, and click "Record & Store Consent".
   - Notice the new active consent record appears in the table.
5. View & Withdraw:
   - Click "View" to open the exact snapshot with signature and timestamp.
   - Click "Withdraw", enter a withdrawal reason, and confirm: notice the status updates to "Withdrawn" while preserving full history.
