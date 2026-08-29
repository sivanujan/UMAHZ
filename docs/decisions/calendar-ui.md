# Decision Log — Calendar UI & Appointment Modal UX

Feature: Calendar UI enhancements and Appointment New/Edit modal UX improvements for clinic staff.
Branch: `feature/calendar-ui`

## 1. Context & Scope
The server-side booking engine (create, reschedule, cancel, tenant scoping, and postgres exclusion constraint / advisory-lock conflict checking) is rock-solid and was left untouched.
This iteration focused on:
1. Enhancing the staff-facing calendar interface with richer visual hierarchy, status color-coding, interactive slot booking, current-time indicator, and empty-state messaging.
2. Elevating the appointment creation and editing modal experience with client-side field validation, clear conflict surfacing, dynamic location/room cascading, duration presets, quick service suggestions, loading states, and non-disruptive toast alerts.

---

## 2. Key Decisions & Architectural Notes

### A. Services Storage
- **Current State**: Services are stored as free text in `appointments.service_name`. No dedicated `Service` model or `services` database table exists in the system yet.
- **Decision**: Maintained `service_name` as a free-text input rather than inventing an artificial database table or hardcoding strict options. To streamline repetitive typing for clinic staff, added high-utility quick suggestion chips (e.g. *"Initial Consultation"*, *"Follow-up Visit"*, *"Acupuncture Session"*, *"Massage Therapy"*, etc.) that populate the input on click while remaining 100% editable.
- **Future Work**: Linking appointments to a dedicated, customizable clinic Services catalog with per-service pricing and default durations will be implemented when the Services module is developed.

### B. Conflict Error Surfacing
- Server-side conflict checks throw validation exceptions for `staff_membership_id` (e.g. *"This practitioner already has an appointment during that time."*) or `room_id` (*"This room is already booked during that time."*).
- **Decision**: Surfaced these conflicts in a dedicated high-visibility alert banner directly inside the modal, alongside blocking the submit button until the user adjusts the date, time, duration, or practitioner/room.

### C. Drag-and-Drop Rescheduling
- **Decision**: Deferred drag-and-drop rescheduling to future iterations. Visual lane-packing and multi-practitioner/room grid layouts require complex drag boundary constraints, which would risk introducing client-side race conditions against the advisory locks and Postgres exclusion constraints.

### D. Status Palette & Accessibility
- Maintained clear semantic status styling:
  - **Scheduled**: Royal Blue
  - **Confirmed**: Cyan / Teal
  - **Checked-in**: Purple / Violet
  - **Completed**: Emerald Green
  - **No-show**: Warm Amber
  - **Cancelled**: Muted Slate with visual strikethrough

---

## 3. Local Verification Instructions

1. Start development server:
   ```bash
   php -S 127.0.0.1:8000 -t public dev-server-router.php
   npm run dev
   ```
2. Navigate to `http://lotus-wellness.lvh.me:8000/login` and log in as clinic staff.
3. Open `http://lotus-wellness.lvh.me:8000/app/calendar`:
   - Verify day and week view rendering.
   - Click any empty time slot: the New Appointment modal opens pre-filled with that date, hour, and any active practitioner/location filter.
   - Test validation by attempting to submit with missing fields.
   - Pick a service suggestion chip and duration preset.
   - Save and observe the smooth toast alert and calendar update without a page reload.
   - Click an existing appointment to edit: verify status chips, soft-cancel confirmation, and room filtering.
