# UMAHZ Multi-Tenant Wellness Practice-Management SaaS

[![CI](https://github.com/sivanujan/UMAHZ/actions/workflows/ci.yml/badge.svg)](https://github.com/sivanujan/UMAHZ/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=sivanujan_UMAHZ&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=sivanujan_UMAHZ)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=sivanujan_UMAHZ&metric=coverage)](https://sonarcloud.io/summary/new_code?id=sivanujan_UMAHZ)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=sivanujan_UMAHZ&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=sivanujan_UMAHZ)

UMAHZ is a multi-tenant wellness practice-management SaaS platform engineered with **Laravel 13**, **Inertia.js**, and **React**.

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

---

## 🛡️ CI / Code Quality

The repository includes a GitHub Actions continuous integration pipeline (`.github/workflows/ci.yml`) that runs on every push to `main` and on every pull request.

### Automated CI Jobs

1. **Backend Tests (`backend-tests`)**:
   - Executes on `ubuntu-latest` with PHP 8.4 and PostgreSQL 16 service container (`umahz_test`).
   - Caches composer dependencies.
   - Prepares an isolated test environment (copies `.env.example`, connects to test DB, generates app key, enforces fake drivers for Stripe, AssemblyAI, OpenRouter, and Mail).
   - Runs database migrations with `--force`.
   - Runs PHPUnit test suite with code coverage (`pcov`) exporting `coverage.xml` as an artifact.
2. **Frontend Build (`frontend-build`)**:
   - Executes on `ubuntu-latest` with Node.js 20.
   - Caches npm dependencies, executes `npm ci`, and verifies production client bundle build via `npm run build`.
3. **Security Checks (`security-checks`)**:
   - Dependency vulnerability auditing via `composer audit` (failing on high/critical advisories).
   - Frontend package vulnerability auditing via `npm audit --audit-level=high` (failing on high/critical).
   - Secret scanning via Gitleaks (`gitleaks/gitleaks-action`) across the repository history.
4. **SonarCloud Code Analysis (`sonarcloud`)**:
   - Downloads the `coverage.xml` generated by `backend-tests`.
   - Runs static analysis and security scanning via `SonarSource/sonarqube-scan-action`.
   - Blocks PR merges if the Quality Gate fails (`sonar.qualitygate.wait=true`).
   - Configuration is defined in `sonar-project.properties`.

### Running Checks Locally

You can run the same quality and security checks locally before pushing:

- **Run backend test suite:**
  ```bash
  php artisan test
  ```
- **Run tests with Clover coverage (requires Xdebug or PCOV extension):**
  ```bash
  php artisan test --coverage-clover=coverage.xml
  ```
- **Build frontend assets:**
  ```bash
  npm run build
  ```
- **Audit PHP dependencies for high/critical security advisories:**
  ```bash
  composer audit --ignore-severity=low --ignore-severity=medium --ignore-severity=info
  ```
- **Audit NPM dependencies for high/critical vulnerabilities:**
  ```bash
  npm audit --audit-level=high
  ```
- **Run local secret scan (requires Gitleaks installed):**
  ```bash
  gitleaks detect --verbose
  ```

