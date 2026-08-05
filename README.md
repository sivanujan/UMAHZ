# UMAHZ Multi-Tenant Wellness Practice-Management SaaS

UMAHZ is a multi-tenant wellness practice-management SaaS platform engineered with **Laravel 12**, **Inertia.js**, and **React**.

---

## 🚀 Tech Stack

- **Backend Framework:** Laravel 12 (PHP 8.5)
- **Frontend Stack:** Inertia.js v3 + React + Vite
- **Styling:** Tailwind CSS (Calm healthcare aesthetic palette)
- **Authentication:** Laravel Sanctum (session-based auth)
- **Role-Based Access Control (RBAC):** Spatie `laravel-permission`
- **Audit Logging:** Spatie `laravel-activitylog`
- **Billing Scaffolding:** Laravel Cashier (Stripe integration)

---

## 🏛️ Multi-Tenancy Architecture

UMAHZ implements multi-tenancy at the query level:
1. **Tenants (`tenants` table):** Scopes clinic metadata (Name, Slug, Timezone, Currency, Address, Status).
2. **Global Scope (`TenantScope`):** Automatically appends `WHERE tenant_id = ?` to Eloquent queries.
3. **Model Trait (`BelongsToTenant`):** Handles global scope registration and auto-assigns `tenant_id` on model creation.
4. **Middleware (`SetTenantContext`):** Binds active tenant ID from user context or header into runtime session.

---

## 👥 Scaffolding Roles & Permissions

1. **Platform Admin:** Full platform visibility across tenants.
2. **Clinic Owner:** Admin access for clinic settings, locations, staff, and billing.
3. **Practitioner:** View appointments, client health notes, and schedules.
4. **Receptionist:** Manage front-desk scheduling and client intake.
5. **Client:** Patient profile context.

---

## 📁 Key Folder Structure

```
├── app/
│   ├── Http/Middleware/
│   │   ├── SetTenantContext.php
│   │   └── HandleInertiaRequests.php
│   ├── Models/
│   │   ├── Tenant.php
│   │   ├── StaffMembership.php
│   │   ├── Location.php
│   │   ├── Room.php
│   │   ├── Client.php
│   │   └── User.php
│   ├── Scopes/
│   │   └── TenantScope.php
│   └── Traits/
│       └── BelongsToTenant.php
├── database/
│   ├── migrations/
│   └── seeders/
│       └── DatabaseSeeder.php
└── resources/
    └── js/
        ├── Layouts/
        │   └── AuthenticatedLayout.jsx
        └── Pages/
            ├── Auth/
            │   └── Login.jsx
            ├── Dashboard/
            │   └── Index.jsx
            └── Clients/
                └── Index.jsx
```

---

## 🛠️ Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd UMAHZ
   ```

2. **Install Composer Dependencies:**
   ```bash
   composer install
   ```

3. **Install NPM Packages & Build Assets:**
   ```bash
   npm install
   npm run build
   ```

4. **Environment Setup:**
   ```bash
   copy .env.example .env
   php artisan key:generate
   ```

5. **Database Setup & Seeding:**
   ```bash
   php artisan migrate --seed
   ```

6. **Run Development Servers:**
   ```bash
   php artisan serve
   npm run dev
   ```

---

## 🔑 Demo Login Credentials (Post-Seeding)

- **Clinic Owner:** `owner@lotuswellness.com` (Password: `password`)
- **Practitioner:** `julian@lotuswellness.com` (Password: `password`)
