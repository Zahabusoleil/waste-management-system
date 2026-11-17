# EcoTrack

EcoTrack is a web application for resident waste reports, administrator assignment and review, and collector task tracking. It uses a vanilla HTML/CSS/JavaScript frontend, an Express API, and MongoDB through Mongoose.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB Atlas URI or a local MongoDB instance

## Setup

1. Install packages:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env` if `.env` does not already exist.
3. Configure `MONGODB_URI`, `JWT_SECRET` (use a long, random value), and `FRONTEND_URL`. For local MongoDB use `mongodb://127.0.0.1:27017/ecotrack`; for local access use `http://localhost:3000`.
4. In MongoDB Atlas, create a database user and allow the development machine's IP in Network Access. Keep the database URI private.
5. To create the first administrator, fill the `BOOTSTRAP_ADMIN_*` values in `.env`, then run:

   ```powershell
   npm run create-admin
   ```

   The command refuses to overwrite an existing account. Remove the bootstrap password from `.env` after account creation.
6. Start EcoTrack:

   ```powershell
   npm start
   ```

   For development with automatic restarts, run `npm run dev`. Open http://localhost:3000.
   If using the local MongoDB Windows service, make sure it is running first. In an
   elevated PowerShell window, run `Start-Service MongoDB`. EcoTrack retries the
   database connection every five seconds, so the server can recover if MongoDB
   starts after EcoTrack.

## Project layout

```text
backend/
  config/        MongoDB connection
  controllers/   API request handlers
  middleware/    Authentication, role checks, upload and request protections
  models/        Mongoose schemas
  routes/        REST endpoint definitions
  scripts/       One-time administrator provisioning
  services/      Shared application services, including audit logging
  tests/         Node test-runner checks
  validators/    Server-side request validation
frontend/
  css/           Responsive site styles
  images/        Locally stored illustration assets
  js/            API client and role-specific page behavior
  *.html         Homepage, dashboards, and policy pages
```

## User workflows

- **Resident:** register, sign in, submit and track personal reports, upload an optional JPEG/PNG/WebP photo (up to 5 MB), and edit or delete pending/rejected reports.
- **Administrator:** sign in with a provisioned account, view dashboard statistics, search/filter users and reports, activate/deactivate resident and collector accounts, create collector accounts, approve/reject pending reports, assign approved reports to active collectors and scheduled dates, and monitor collection status and notes.
- **Collector:** sign in with an administrator-created account, view assigned tasks and report details, start a task, report a blocking issue with a reason, resume it, mark it complete, and review completed work.

Public registration only creates resident accounts. Authorization is enforced by the API; hiding or opening a dashboard page does not grant access to its data.

## API reference

All API routes are under `/api`.

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Service and MongoDB status |
| POST | `/auth/register` | Public | Register a resident |
| POST | `/auth/login` | Public, rate-limited | Sign in |
| POST | `/auth/logout` | Public | Clear the session cookie |
| GET | `/auth/me` | Signed in | Read current account |
| GET/POST | `/reports` | Resident; GET also admin | List authorized reports / create resident report |
| PUT/DELETE | `/reports/:id` | Resident or admin; owner/status rules apply | Edit/delete eligible report |
| GET | `/reports/:id/image` | Owner, admin, or assigned collector | Read an uploaded report photo |
| GET | `/admin/stats` | Admin | Read database-backed statistics |
| GET | `/admin/users` | Admin | List users (optional `role` filter) |
| PATCH | `/admin/users/:id/status` | Admin | Activate/deactivate resident or collector |
| POST | `/admin/collectors` | Admin | Create a collector account |
| GET | `/admin/reports` | Admin | List reports for review |
| PATCH | `/admin/reports/:id/status` | Admin | Approve/reject pending reports or assign approved reports |
| GET | `/admin/collections` | Admin | View collection assignments and progress |
| GET | `/collector/tasks` | Collector | View tasks assigned to the signed-in collector |
| PATCH | `/collector/tasks/:id/status` | Assigned collector | Update task progress and notes |

Authentication uses an HttpOnly, SameSite cookie. Login is rate-limited; mutation requests with cross-site origins are rejected. Set `FRONTEND_URL` to the exact origin(s) that should be allowed.

## Verification

Run automated checks with:

```powershell
npm test
npm audit
```

`npm test` covers startup metadata, health and homepage responses, supported image signatures, unauthenticated administrator access, cross-site mutation rejection, and public role-escalation prevention. To exercise registration, report create/edit/delete, photo storage/access, administrator collector creation and assignment, collector isolation, and completion tracking against the isolated local `ecotrack_integration_test` database, run:

```powershell
npm run test:integration
```

The integration runner refuses to run unless its database name is exactly `ecotrack_integration_test`; it cleans up only the test records it creates. It requires MongoDB to be running. Never point it at a production database.

## Limitations and review items

- End-to-end user and task workflows passed against local MongoDB. Your Atlas URI/network configuration has not been tested.
- Uploaded photos are stored in MongoDB. No external malware scanning or image transformation is configured.
- The policy pages are project placeholders, not legal advice or a claim of Ugandan legal compliance. Have a qualified local privacy/legal professional review them and provide verified contact and retention details before deployment.
- The application has not been deployed or independently penetration-tested.
