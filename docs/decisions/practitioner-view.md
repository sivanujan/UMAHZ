# Decision Log — Practitioner Appointment View

Feature: Dedicated, mobile-friendly appointment view for clinic practitioners with limited status and notes editing.
Branch: `feature/practitioner-view`

---

## 1. Context & Scope
In multi-tenant clinics, practitioners manage their day-to-day patient flow on mobile phones or tablets in treatment rooms. They need:
- Immediate visibility into **only their own schedule** without clutter from other practitioners.
- Rapid one-tap status workflows (`Check In` -> `Complete` / `No-show`).
- Clear visual indicators of who is happening right now and who is next.
- The ability to view client details and append session notes.
- **Strict security boundaries**: Practitioners must NOT be able to reschedule, reassign, create, or cancel appointments, or view other practitioners' schedules.

---

## 2. Architecture & Design Decisions

### A. Route & Role Routing
1. **Dedicated Endpoint**:
   - `GET /app/practitioner/appointments` (`PractitionerAppointmentController@index`)
   - Protected by `EnsureStaffRole:practitioner,clinic_owner`.
2. **Calendar Redirection**:
   - When a user with the `practitioner` role visits `/app/calendar`, [`AppointmentController::index`](file:///c:/Users/Sivanujan_PC/Desktop/UMAHZ/app/Http/Controllers/AppointmentController.php) automatically redirects them to `/app/practitioner/appointments`.
   - The sidebar navigation link in [`AuthenticatedLayout.jsx`](file:///c:/Users/Sivanujan_PC/Desktop/UMAHZ/resources/js/Layouts/AuthenticatedLayout.jsx) points practitioners directly to `/app/practitioner/appointments`, while owners and receptionists link to `/app/calendar`.
3. **Role Precedence (Owner + Practitioner)**:
   - If a clinic owner is also a practitioner, their primary role in `$membership->role` is `clinic_owner`. By default, they retain full administrative oversight across the entire clinic on `/app/calendar`, but can also access `/app/practitioner/appointments` to manage their individual sessions.

### B. Query-Level & Policy Security
1. **Query Scoping**:
   - Every fetch in `PractitionerAppointmentController` is filtered by:
     ```php
     where('tenant_id', $tenant->id)->where('staff_membership_id', $membership->id)
     ```
   - It is impossible for a practitioner to retrieve appointments belonging to another practitioner or another clinic.
2. **Policy Enforcement (`AppointmentPolicy`)**:
   - `updateStatus`: Only allowed if `$appointment->staff_membership_id === $membership->id` (or if caller is an owner/receptionist). Attempting to update another practitioner's appointment returns **403 Forbidden**.
   - `updateNotes`: Strictly authorized identically to `updateStatus`.
   - `update` (rescheduling, reassigning, changing time/service/room): Denied to practitioners (**403 Forbidden**); strictly reserved for owners and receptionists.
   - `cancel`: Denied to practitioners (**403 Forbidden**); strictly reserved for owners and receptionists.

### C. Three Distinct View Modes
1. **"Today" (Default Landing View)**:
   - Header with active clinic date, today's appointment count, completed count, and waiting count.
   - Chronological list of cards with client name, service, time in clinic timezone, duration, and room.
   - Live badge highlights:
     - **"Happening Now"**: Automatically highlights the session active at the current instant.
     - **"Next Up"**: Highlights the imminent next session.
   - **Quick 1-Tap Action Buttons**: On-card buttons to `Check In`, `Complete`, or mark `No-show` in a single tap.
2. **"Week" View**:
   - 7-day horizontal card grid mapping out the practitioner's week at a glance with previous/next week navigation.
3. **"Upcoming" View**:
   - Scrollable list of all future bookings grouped by date.

### D. Detail & Session Notes Modal
- Tapping any card opens a clean slide-up modal showing:
  - Patient contact details (direct `tel:` and `mailto:` links).
  - Service, room, and location.
  - Interactive status pills.
  - An inline notes textarea where the practitioner can append notes and click "Save Notes".

### E. Future Work
- Structured clinical SOAP notes and treatment plan records (part of the Clinical Notes module).
- Consent forms and intake signatures.
- Patient-facing booking and automated SMS notifications.

---

## 3. Local Verification Instructions

1. Start development server:
   ```bash
   php -S 127.0.0.1:8000 -t public dev-server-router.php
   npm run dev
   ```
2. Log in as a practitioner on a clinic subdomain:
   - Navigate to `http://lotus-wellness.lvh.me:8000/login`
   - Log in with practitioner credentials.
3. Observe landing on `/app/practitioner/appointments`:
   - Notice the "Today" view with active session count and status pills.
   - Click "Check In" on a scheduled appointment: observe instant status update and toast notification.
   - Click an appointment card: observe patient contact details and append a note.
   - Switch tabs to "Week" and "Upcoming".
   - Confirm attempting to access another practitioner's appointment via direct API request yields `403 Forbidden`.
