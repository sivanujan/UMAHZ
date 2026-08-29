# Disciplines Architecture & Intake Forms Inspection Report

**Date**: 2026-08-29  
**Branch**: `main`  
**Purpose**: Architectural inspection of disciplines modeling across UMAHZ to inform the implementation of profession-specific intake forms.

---

## 1. Executive Summary & Questions Answered

### Q1: Is there a dedicated `Discipline` model or database table?
**No.** There is no `disciplines` table, migration, or Eloquent model in the database.
Disciplines are defined strictly as string constants on [`App\Models\PractitionerProfile`](file:///c:/Users/Sivanujan_PC/Desktop/UMAHZ/app/Models/PractitionerProfile.php):
```php
public const PROFESSION_MASSAGE_THERAPY = 'massage_therapy';
public const PROFESSION_ACUPUNCTURE_TCM = 'acupuncture_tcm';
public const PROFESSION_PERSONAL_TRAINING = 'personal_training';
public const PROFESSION_NUTRITION = 'nutrition';
public const PROFESSION_COLON_HYDROTHERAPY = 'colon_hydrotherapy';
```
These canonical string constants are grouped into `ClinicRegistrationController::DISCIPLINES` and exposed globally via `ClinicOptions::disciplines()`.

---

### Q2: Where are disciplines currently referenced and stored?
Disciplines appear across 5 distinct application layers:

1. **Clinic Application & Registration** ([`ClinicRegistrationController.php`](file:///c:/Users/Sivanujan_PC/Desktop/UMAHZ/app/Http/Controllers/Onboarding/ClinicRegistrationController.php)):
   - Clinic owner selects 1 or more disciplines when applying to join UMAHZ.
   - Stored in `tenants.requested_disciplines` as a JSON array (`['massage_therapy', 'acupuncture_tcm']`).
   - The primary discipline (`$data['requested_disciplines'][0]`) is assigned as the owner's `practitioner_profiles.profession`.
2. **Clinic Settings** ([`ClinicSettingsController.php`](file:///c:/Users/Sivanujan_PC/Desktop/UMAHZ/app/Http/Controllers/ClinicSettingsController.php)):
   - Clinic owners can update the clinic's offered disciplines via `POST /app/settings/disciplines`.
   - Validates each item against `ClinicRegistrationController::DISCIPLINES` and updates `tenants.requested_disciplines`.
3. **Staff / Practitioner Invite Acceptance** ([`AcceptInviteController.php`](file:///c:/Users/Sivanujan_PC/Desktop/UMAHZ/app/Http/Controllers/Auth/AcceptInviteController.php)):
   - When a practitioner accepts an invite, the dropdown displays only the disciplines their clinic offers (`$tenant->requested_disciplines`).
   - Practitioner selects **one** discipline, stored in `practitioner_profiles.profession`.
4. **Platform Admin Review** ([`Admin/ClinicReviewController.php`](file:///c:/Users/Sivanujan_PC/Desktop/UMAHZ/app/Http/Controllers/Admin/ClinicReviewController.php)):
   - Platform admins review and can edit a clinic's `requested_disciplines` JSON array before approving.
5. **Consent**:
   - **Consent does not reference disciplines.** `consent_types` are clinic-wide (e.g. `general_treatment`, `sensitive_area`, or custom clinic agreements) and do not have a discipline foreign key.

---

### Q3: Does a clinic have a structured list of "disciplines this clinic offers"?
**Yes, stored as a JSON column.**
- Column: `tenants.requested_disciplines` (cast as `array` in Eloquent).
- Values stored: JSON array of canonical string codes:
  ```json
  ["massage_therapy", "acupuncture_tcm", "nutrition"]
  ```
- Validated at the controller layer via `Rule::in(ClinicRegistrationController::DISCIPLINES)`.

---

### Q4: Does a `PractitionerProfile` store practitioner disciplines in a structured way?
**Partially.**
- Column: `practitioner_profiles.profession` (single string column).
- Stores exactly **one** discipline code (e.g., `'massage_therapy'`).
- Does not currently support multi-discipline practitioners (e.g. a dual RMT / Acupuncturist).

---

### Q5: How do Services relate to disciplines, if at all?
**They do not relate at all.**
- There is **no `services` table and no `Service` model** in the codebase.
- On the `appointments` table, the service is a free-text string column: `service_name` (e.g., `"Initial Assessment 60min"`).

---

## 2. Assessment & Recommendation for Intake Forms

### Do we need a new `disciplines` table before building intake forms?
**Recommendation: NO.** Do not create a `disciplines` table or pivot tables.

### Rationale:
1. **The 5 disciplines are statutory professions with fixed scopes**:
   - **Massage Therapy**: Health history, pain/musculoskeletal mapping, pressure preference, surgeries.
   - **Acupuncture & TCM**: Organ systems, tongue & pulse indicators, bleeding/bruising precautions, pregnancy.
   - **Personal Training**: PAR-Q+ questionnaire, cardiovascular risks, fitness goals, mobility limits.
   - **Nutrition**: Dietary patterns, gastrointestinal issues, allergies, metabolic conditions.
   - **Colon Hydrotherapy**: Strict GI contraindications (Crohn's, diverticulitis, recent abdominal surgery).
2. **All required linkages already exist without extra tables**:
   - Clinic-enabled disciplines: `$tenant->requested_disciplines`
   - Practitioner discipline: `$practitioner->practitionerProfile->profession`
3. **Adding a table would require unnecessary refactoring** of existing onboarding, admin approval, settings, and invite flows without providing any clinical benefit for intake forms.

---

## 3. Recommended Intake Forms Architecture

### 1. `IntakeFormTemplate` Model & Table
- `id` (UUID)
- `tenant_id` (UUID, nullable — null for platform default templates)
- `discipline` (string: `massage_therapy`, `acupuncture_tcm`, etc.)
- `name` (string: e.g. "Massage Therapy Health History")
- `schema` (JSON: sections, fields, contraindication flags, body mapping)
- `is_active` (boolean)

### 2. `ClientIntake` / `CompletedIntake` Model & Table
- `id` (UUID)
- `tenant_id` (UUID)
- `client_id` (UUID)
- `practitioner_id` (UUID, nullable)
- `appointment_id` (UUID, nullable)
- `discipline` (string snapshot: `massage_therapy`, etc.)
- `intake_form_template_id` (UUID)
- `responses` (JSON: client answers)
- `status` (`pending`, `completed`, `flagged`)
- `submitted_at` (timestamp)
- `reviewed_at` (timestamp, nullable)
- `reviewed_by_user_id` (UUID, nullable)
