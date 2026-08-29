# Decision log — Appointment Confirmation Emails

Feature: Queued, clinic-branded appointment confirmation email sent to clients upon booking.
Branch: `feature/appointment-emails`.

## Confirmed Architecture & Sender Design
1. **Single Platform Sender**:
   - Resend verified address: `appointments@umahz.com`.
   - Never configured per-clinic in `.env` (clinics are unlimited and dynamic).
   - Config-driven via `config('mail.appointments.from_address')` / `APPOINTMENTS_FROM_ADDRESS` env variable.
2. **Dynamic Clinic Branding**:
   - **From Display Name**: The booking clinic's name (`$tenant->name`), e.g. `"Lotus Wellness Clinic <appointments@umahz.com>"`.
   - **Reply-To**: The clinic's own contact email from the tenant (`$tenant->email` or `$tenant->primary_contact_email`), so patient replies reach the clinic directly.
   - **Body & Subject**: Clinic-branded with service, practitioner name, date and wall-clock time in the clinic's local timezone (`$tenant->timezone`), location, and room.
3. **Queueing & Resilience**:
   - Handled via queued notification (`AppointmentConfirmationNotification implements ShouldQueue`).
   - Dispatched **after commit** outside the booking transaction.
   - If client has no email, skips silently without error.
   - Any dispatch/queueing exceptions are caught and logged; bookings never fail or return a 500 error due to an email issue.
4. **Future Work (Out of Scope for this feature)**:
   - Appointment reminders (24h/48h before).
   - Reschedule confirmation emails.
   - Cancellation notices.
   - SMS notifications.

---

## Production Setup & Operations Guide

### A. Confirm / Finish Resend Sender & Domain Setup for `appointments@umahz.com`

1. **Log in to Resend Dashboard**:
   - Visit [resend.com/domains](https://resend.com/domains).
2. **Add or Verify Domain `umahz.com`**:
   - Add `umahz.com` if not already added.
   - Configure DNS records with your DNS provider (Cloudflare, Route53, Namecheap, etc.):
     - **SPF**: TXT record for `bounces.umahz.com`
     - **DKIM**: TXT records for `resend._domainkey.umahz.com`
     - **DMARC**: TXT record `_dmarc.umahz.com` (`v=DMARC1; p=none;`)
     - **MX**: MX record for inbound/routing (if enabled)
   - Resend verifies the domain automatically once DNS propagates.
3. **Environment Configuration (`.env`)**:
   Ensure the following keys are set in your production `.env`:
   ```env
   MAIL_MAILER=resend
   RESEND_API_KEY=re_your_live_production_key_here
   APPOINTMENTS_FROM_ADDRESS="appointments@umahz.com"
   QUEUE_CONNECTION=database
   ```

---

### B. Setting Up the Queue Worker on the Server (systemd)

To ensure email jobs are processed reliably in the background without dropping jobs or blocking web requests, run a `systemd` worker service.

#### 1. Create the systemd service file
On your Linux server, create `/etc/systemd/system/umahz-worker.service`:
```ini
[Unit]
Description=UMAHZ Queue Worker
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
Restart=always
RestartSec=3
WorkingDirectory=/var/www/umahz
ExecStart=/usr/bin/php /var/www/umahz/artisan queue:work database --sleep=3 --tries=3 --max-time=3600 --timeout=90

[Install]
WantedBy=multi-user.target
```
*(Adjust `User`, `Group`, and `WorkingDirectory` to match your server's deployment path, e.g. `/var/www/umahz` or `/home/forge/app`)*.

#### 2. Enable and Start the Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable umahz-worker
sudo systemctl start umahz-worker
```

#### 3. Verify Queue Worker Status & Logs
Check service status:
```bash
sudo systemctl status umahz-worker
```
View live logs:
```bash
journalctl -u umahz-worker -f
```

#### 4. Testing Emails Locally / Manually
To process jobs immediately on-demand during development or testing:
```bash
php artisan queue:work --once
```
or run the queue listener:
```bash
php artisan queue:listen
```
To monitor failed jobs:
```bash
php artisan queue:failed
```
