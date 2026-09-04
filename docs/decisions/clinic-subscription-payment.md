# Decision log — Clinic → UMAHZ subscription (card at registration, charge on approval)

Branch: `feature/clinic-subscription-payment`.

The clinic pays UMAHZ a monthly platform subscription, billed to **UMAHZ's own
Stripe account** (NOT Stripe Connect, NOT patient→clinic payments). A valid card
is required to register, but nothing is charged until a platform admin approves —
so junk registrations are blocked while a rejected clinic is never charged and
there is no refund to process.

## Reused / not recreated
- **Laravel Cashier** (already required) is wired to the **Tenant** model as the
  Stripe customer via `Cashier::useCustomerModel(Tenant::class)`. Cashier columns
  live on `tenants`; `subscriptions`/`subscription_items` key on a UUID
  `tenant_id`.
- Existing tenant status lifecycle (`pending_review → approved/rejected`,
  `suspended`) and the admin `approve()`/`reject()` flow are the hook points.
- Existing audit (`AuditEvent`), notifications, and the registration wizard.

## Key decisions
1. **Gateway seam.** All Stripe I/O for the platform subscription goes through
   `App\Billing\PlatformBilling` (real: `StripePlatformBilling`; test:
   `FakePlatformBilling`). This makes the money logic deterministically testable
   — in particular we can prove **a rejected clinic is never charged**.
2. **Pending registration.** The Tenant is NOT created until a card is saved.
   `prepare()` validates the whole application, stores the license to a temp
   path, writes a `pending_registrations` row (reserving the subdomain for
   `PENDING_REGISTRATION_TTL_MINUTES`, default 30), creates a Stripe customer +
   SetupIntent, and returns the client secret. `store()` (finalize) only succeeds
   once the SetupIntent has a saved payment method; it then promotes the pending
   row into a real Tenant (`pending_review`) carrying `stripe_id` + the saved
   card. No card → no application.
3. **Charge on approve.** `approve()` calls `ClinicSubscriptionService::activate()`
   which starts the monthly subscription (`STRIPE_PRICE_MONTHLY`) using the saved
   card — the first charge. If the charge fails, the clinic is NOT approved.
   Idempotent (an already-active tenant is never charged twice).
4. **Reject discards.** `reject()` calls `discard()` which detaches the saved card
   (never charged) and leaves `subscription_status = none`.
5. **Price via env** — `STRIPE_PRICE_MONTHLY` is a Stripe Price ID created in the
   dashboard (chosen over an inline amount). `config/billing.php`.
6. **Lapse policy** — `past_due` (a failed payment, Stripe still retrying) flags
   the clinic + keeps access (grace); a `canceled`/`unpaid` subscription suspends
   `/app`. `hasActivePlatformSubscription()` treats active + past_due as in good
   standing.
7. **Webhooks** — `StripeWebhookController` extends Cashier's (signature-verified
   with `STRIPE_WEBHOOK_SECRET`, route CSRF-exempt on the central domain). It
   mirrors Stripe state onto `tenants.subscription_status` and suspends on lapse.
   Idempotent: every handler maps to a fixed target state.
8. **Expiry** — `registrations:prune-expired` (scheduled every 10 min) deletes
   expired pending rows, removes the temp license, discards the orphan Stripe
   customer, and frees the subdomain.

## Security
- No raw card data is ever stored — only opaque Stripe tokens (`cus_…`, `pm_…`).
- Keys read from env/config; webhooks Stripe-signature verified; webhook idempotent.
- Billing is tenant-scoped (subscriptions key on `tenant_id`; webhooks resolve the
  tenant by Stripe customer id).
- Kept entirely separate from any future patient→clinic / Stripe Connect code.

## Tests (`tests/Feature/Billing/`, 18)
No card → no application · approve charges + starts subscription · reject never
charges + discards card · can't approve without a card · abandoned registration
pruned + subdomain released · duplicate email blocked · prepare reserves the
subdomain without creating a tenant · webhook past_due (grace) / restore /
signature-rejected / idempotent · cross-tenant billing isolation. Existing
registration tests updated to the two-step flow via `Tests\Concerns\RegistersClinics`.

## Environment note
`ext-fileinfo` is required (license upload + Flysystem). It's disabled in this
machine's php.ini (line 923, `;extension=fileinfo`) — the app and the
file-upload tests need it. Run tests here with
`php -d extension=php_fileinfo.dll vendor/phpunit/phpunit/phpunit`, or uncomment
that line. CI with fileinfo loaded runs `php artisan test` normally.
