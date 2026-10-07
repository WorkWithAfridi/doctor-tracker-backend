# Doctor Tracker API

## Description

Doctor Tracker API is an independent Express REST service for authenticated doctor and patient management and dashboard analytics. It stores application records and revocable login sessions in MongoDB, validates every write, and performs filtering, pagination, and analytics on the server.

## Live links

| Resource                  | URL                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Frontend application      | [Doctor Tracker](https://doctor-tracker-frontend-ten.vercel.app)                     |
| Frontend login            | [Sign in](https://doctor-tracker-frontend-ten.vercel.app/login)                      |
| Backend API documentation | [Swagger UI](https://doctor-tracker-backend-xi.vercel.app/docs/)                     |
| Backend health check      | [Health](https://doctor-tracker-backend-xi.vercel.app/health)                        |
| OpenAPI specification     | [OpenAPI JSON](https://doctor-tracker-backend-xi.vercel.app/openapi.json)            |
| Frontend repository       | [doctor-tracker-frontend](https://github.com/WorkWithAfridi/doctor-tracker-frontend) |
| Backend repository        | [doctor-tracker-backend](https://github.com/WorkWithAfridi/doctor-tracker-backend)   |

Login credentials are supplied privately to authorized reviewers and are not included in this documentation.

## Technology stack and assessment coverage

| Layer                   | Implementation                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Runtime and API         | Node.js 24 LTS, Express 5, TypeScript                                                       |
| Database                | MongoDB with Mongoose models and aggregation pipelines                                      |
| Validation              | Strict Zod body/query/ID validation and validated environment configuration                 |
| Authentication          | bcrypt password hashes; revocable opaque cookie sessions stored as token hashes             |
| Middleware              | Helmet, credentialed CORS, origin checks, request limits, rate limiting, centralized errors |
| Documentation and tests | OpenAPI 3.1/Swagger UI, Supertest, Node test runner with tsx                                |
| Companion frontend      | Independent Next.js client consuming REST endpoints                                         |

This follows the assessment's separate-client/separate-server stack. The backend supports secure administrator and staff access; doctor creation with name/specialization/hospital/phone/email; doctor search, filters and pagination; corresponding patient lists and creation; global patient listing, editing, deletion and reassignment; and MongoDB-derived dashboard statistics. UI layout, navigation and desktop/mobile evidence belong to the frontend repository. Settings and Swagger are additional tools for exercising the submitted API.

## Setup guide

1. Install Node.js 24 LTS, npm and MongoDB Community Server, then clone this backend repository. MongoDB Atlas can also be used with the configuration below.
2. Start MongoDB. On the configured Windows development machine, check `Get-Service MongoDB`; if stopped, use `Start-Service MongoDB` from administrator PowerShell.
3. From this repository root, install dependencies and copy the included [environment example](.env.example). Review the database URI and trusted origins before connecting:

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run db:check
npm.cmd run seed
npm.cmd run dev
```

4. Open [the health endpoint](http://localhost:5000/health) to check connectivity, then [Swagger UI](http://localhost:5000/docs/) to log in and try the API. Start the independent frontend at port 3000 for the complete portal.

MongoDB must be running at the URI in `.env`. `GET /health` verifies connectivity. The companion frontend now connects to these APIs for authentication, records, list queries, and dashboard analytics. Its local API URL is `http://localhost:5000/api`; open the frontend at `http://localhost:3000` to match the configured origin.

## Development account and seed data

Configure `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the ignored `.env` before running the first seed. Sign in with those configured values. Deployed reviewer access is shared privately; this README does not publish login credentials.

The seed creates one admin, 24 fictional doctors, and 186 fictional patients. Repeated runs preserve existing records and passwords. The seed command does not reset records; the administrator Settings page provides a separately confirmed reset. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before first seeding to customize the account. Production seeding rejects the default demo password.

- `npm.cmd run typecheck`: validate TypeScript.
- `npm.cmd run build`: compile to `dist/`.
- `npm.cmd start`: run the production build.
- `npm.cmd run db:check`: connect, ping MongoDB, disconnect.
- `npm.cmd run db:indexes`: create declared indexes without dropping existing indexes.
- `npm.cmd run seed`: create indexes and missing fictional seed collections/admin.
- `npm.cmd test`: API integration checks in a uniquely named temporary local database.
- `npm.cmd run format`: format source, tests, and documentation.

## Prerequisites and repository independence

Use Node.js 24 LTS, npm, and MongoDB Community Server. Clone this backend repository and run the setup commands above from its root. No parent package or frontend folder is required to install, build, or run the backend.

## Profile and staff accounts

- `POST /api/auth/password`: authenticated users provide `currentPassword` and `newPassword`. Passwords require 8–72 characters and at most 72 UTF-8 bytes. All sessions are revoked and the cookie is cleared; sign in again with the new password. A per-user credential version also invalidates sessions created by a login racing with the password change.
- `GET /api/users?page=1&limit=20`: administrators list workspace accounts without password hashes or credential versions.
- `POST /api/users`: administrators create staff using `name`, `email`, and `password`. The role is always staff; role overrides and duplicate emails are rejected.

Staff can manage doctors and patients, access analytics, and change their own password. Only administrators can create users or use Settings reset/population. Existing administrators and sessions remain compatible without a database reset or migration.

## Environment variables

| Variable              | Purpose                             | Local value                                |
| --------------------- | ----------------------------------- | ------------------------------------------ |
| `PORT`                | API listening port                  | `5000`                                     |
| `NODE_ENV`            | Runtime environment                 | `development`                              |
| `MONGODB_URI`         | Database connection string          | `mongodb://127.0.0.1:27017/doctor_tracker` |
| `FRONTEND_URL`        | Allowed frontend origin             | `http://localhost:3000`                    |
| `DOCS_ORIGIN`         | Trusted origin for Swagger writes   | `http://localhost:5000`                    |
| `SESSION_DAYS`        | Session lifetime                    | `7`                                        |
| `COOKIE_SAME_SITE`    | Cookie policy: lax, strict, or none | `lax`                                      |
| `TRUST_PROXY_HOPS`    | Known reverse proxy hop count       | `0`                                        |
| `SEED_ADMIN_EMAIL`    | Admin email for first seed          | Set privately in ignored `.env`            |
| `SEED_ADMIN_PASSWORD` | Password for first seed             | Set privately in ignored `.env`            |

Configuration is validated at startup. `.env`, `.env.*`, and imported `*.env` credential files are ignored; `.env.example` is included. Hosted database credentials belong only in backend environment settings. Optional `MONGODB_DNS_SERVERS` accepts comma-separated IPv4/IPv6 resolver addresses for Atlas SRV connections; leave it empty to use the system resolver. It applies only to this backend process and does not change Windows network settings.

## Source structure

```text
src/
  config/           Environment validation and database connection
  controllers/      Thin doctor and patient request handlers
  docs/             OpenAPI specification and generated input schemas
  middleware/       Authentication, origin protection, error handling
  models/           User, Session, Doctor, Patient
  routes/           Auth, users, doctors, patients, analytics, settings, docs, health
  schemas/          Strict Zod body, ID, and query validation
  services/         Authentication, record queries, analytics, workspace operations
  scripts/          Database check, indexes, idempotent seed
  types/            Backend types
  utils/            Shared utilities
  app.ts            Express configuration
  server.ts         Database-first startup and graceful shutdown
```

## System architecture and health checks

Next.js client → standalone Express REST API → MongoDB.

The backend connects to MongoDB before accepting requests. `GET /health` performs a database ping and returns HTTP 200 when connected or HTTP 503 when unavailable. Unknown routes return consistent JSON with HTTP 404. Helmet, restricted credentialed CORS, a JSON body limit, rate limiting, centralized errors, and graceful shutdown are configured. Feature APIs mount under `/api` and require an authenticated administrator or staff session; Settings and staff management are administrator-only.

MongoDB creates databases and collections on the first write. A connection/ping alone does not create application collections.

## Local MongoDB on the development machine

MongoDB Community Server 9.0.2 is installed as the automatic `MongoDB` Windows service, listening on `127.0.0.1:27017`.

- Executable: `C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe`
- Configuration: `C:\Program Files\MongoDB\Server\9.0\bin\mongod.cfg`
- Data: `C:\Program Files\MongoDB\Server\9.0\data`
- Log: `C:\Program Files\MongoDB\Server\9.0\log\mongod.log`

Check status with `Get-Service MongoDB`. If stopped, run `Start-Service MongoDB` in an administrator PowerShell terminal. On another machine, install MongoDB independently and configure `MONGODB_URI`.

## Independent deployment

### Vercel

Import `WorkWithAfridi/doctor-tracker-backend` as a separate Vercel project, with root directory `./`, framework Express, install command `npm ci`, and build command `npm run build`. Leave the output directory at the framework default. `vercel.json` configures Express detection and the build; `src/app.ts` exports the application directly. Node.js 24 is specified in `package.json`. Local development and conventional Node hosting continue to use `src/server.ts`.

Set these variables in Vercel's Production environment before deploying:

| Variable           | Value                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`         | `production`                                                                                                                               |
| `MONGODB_URI`      | The Atlas URI from your ignored backend `.env`, including `/doctor_tracker`                                                                |
| `FRONTEND_URL`     | The exact frontend origin; use `http://localhost:3000` until the frontend is deployed, then replace it with the production frontend origin |
| `DOCS_ORIGIN`      | The backend's stable production HTTPS origin, so Swagger can perform authenticated writes                                                  |
| `COOKIE_SAME_SITE` | `none` for a frontend on a separate site; HTTPS is required and third-party cookie restrictions still apply                                |
| `TRUST_PROXY_HOPS` | `1` for this direct Vercel deployment, whose edge overwrites `X-Forwarded-For` with the client IP                                          |

Leave `MONGODB_DNS_SERVERS` unset unless the hosting environment needs an explicit resolver. Do not upload local `.env` or imported credential files; `.vercelignore` excludes them. MongoDB connections are established on demand and shared by concurrent requests within each function instance. `/health` connects and pings the database, returning 503 if unavailable. Documentation remains accessible without a database connection. Swagger's versioned assets and license are committed under `public/docs` so Vercel can discover and serve them through its CDN. The build refreshes these files from the installed `swagger-ui-dist` package; commit updated assets when upgrading Swagger. Missing JavaScript assets must not fall through to the documentation HTML.

Allow the hosting service's outbound network access in Atlas before verification. Existing Atlas records and indexes are shared with this development workspace; deployment does not seed, migrate, or reset them. In-memory rate limiting and the Settings write guard operate per function instance, so concurrent requests across multiple instances are not coordinated. Keep bulk reset/population operations sequential for the interview demo.

After deployment, verify `/health`, `/docs/`, `/openapi.json`, login/logout, and a protected list endpoint. The frontend's `NEXT_PUBLIC_API_URL` is the backend's stable production origin plus `/api`. Ensure deployment protection permits reviewer and frontend access to the production API. See [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).

### Conventional Node hosting

Alternatively, deploy this repository to a Node.js host such as Render:

- Build command: `npm ci && npm run build`.
- Start command: `npm start`.
- Health check path: `/health`.
- Environment: `NODE_ENV=production`, a hosted `MONGODB_URI`, and the exact live frontend origin in `FRONTEND_URL`.
- Port: use the hosting provider's `PORT` environment variable.

Configure database network access for the backend host. Backend deployment requires only this repository's files.

Before first use of a new hosted database, run `npm run db:indexes` or `node dist/scripts/indexes.js` after building. Indexes are not automatically built on API startup. Run the seed separately only if fictional demo data is wanted. Set `TRUST_PROXY_HOPS` to the verified number of reverse proxies for the deployment; do not trust arbitrary forwarded headers.

## MongoDB Atlas connection

This development workspace uses Atlas for the `doctor_tracker` database; the committed environment example still defaults to local MongoDB for independent setup. Create an Atlas database user, allow the backend machine/host through Atlas network access, and put the driver connection string in the ignored `.env` file as `MONGODB_URI`. Include `doctor_tracker` as the database name and URL-encode special characters in the database password. Restart the API and run `npm run db:check`, then initialize indexes with `npm run db:indexes`. Never put Atlas credentials in frontend variables or Git.

If an Atlas connection fails with `querySrv ECONNREFUSED`, check the DNS resolver. This development machine requires `MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8`; other machines can leave it unset. Switching databases does not migrate records or sessions. Seed an administrator before logging in to an empty database; `npm run seed` also adds the initial sample doctors and patients when those collections are empty. Use Settings for larger sample batches.

## Authentication and browser integration

Login uses bcrypt password verification and a random 256-bit session token in an HTTP-only cookie. MongoDB stores only its SHA-256 hash, user reference, and expiry. Every authenticated request checks session expiry, the current administrator/staff role, and the credential version; logout deletes the stored session immediately. A TTL index removes expired session records in the background.

Browser requests must use `credentials: 'include'`. All POST/PATCH/DELETE requests, including login and logout, require an `Origin` header matching `FRONTEND_URL` or `DOCS_ORIGIN`. API clients such as Bruno/Postman must set that header explicitly. Reads do not require an Origin header, but protected reads require a session cookie. Responses use `Cache-Control: no-store`.

## Interactive API documentation

Open [Swagger UI](http://localhost:5000/docs/) with the backend running. All 23 operations include query parameters, request bodies, response schemas, and error codes. Input schemas are generated from the backend's Zod validators; response contracts and examples are maintained in `src/docs/openapi.ts`.

1. Expand **Authentication → POST /api/auth/login**, click **Try it out**, enter your privately supplied or locally configured account email and password, and click **Execute**. Credential examples are empty.
2. The browser saves the session cookie automatically. Expand any protected endpoint, enter query parameters or a body, and execute it to see the actual status, headers, and response from MongoDB.
3. Copy real record IDs from list responses before trying detail or update endpoints. The displayed examples are illustrative; write operations change real records. Use logout to revoke the session.

Cookie authentication is browser-managed; there is no token to paste into an Authorize box. Documentation is public. Clinical and analytics APIs require an administrator or staff session; Settings and staff account APIs require an administrator session. The online Swagger validator is disabled.

The [OpenAPI JSON](http://localhost:5000/openapi.json) can be imported into Postman or Bruno. Deployment uses the same `/docs/` and `/openapi.json` paths on the live backend host. Set `DOCS_ORIGIN` to that host's exact HTTPS origin to enable writes from deployed Swagger UI. In development, the default trusted docs origin is `http://localhost:<PORT>` when this setting is omitted; production requires an explicit setting.

For production, cookies use `Secure`. Prefer a same-origin frontend proxy or frontend/API domains under the same site. Direct cross-site cookie use requires `COOKIE_SAME_SITE=none` and HTTPS and can still be restricted by browser third-party-cookie policies. The frontend uses a same-origin `/api` rewrite to this standalone backend, so portal cookies do not rely on third-party-cookie access. Swagger signs in directly on the backend origin and has its own cookie session.

## REST endpoints

| Method           | Endpoint                    | Behavior                                    |
| ---------------- | --------------------------- | ------------------------------------------- |
| GET              | `/health`                   | Public database connectivity check          |
| POST             | `/api/auth/login`           | Email/password login; sets session cookie   |
| GET              | `/api/auth/me`              | Current administrator or staff account      |
| POST             | `/api/auth/logout`          | Revoke current session; clear cookie        |
| POST             | `/api/auth/password`        | Change own password; revoke all sessions    |
| GET/POST         | `/api/users`                | Admin-only account listing/staff creation   |
| GET/POST         | `/api/doctors`              | List or create doctors                      |
| GET              | `/api/doctors/options`      | Distinct specialization/hospital filters    |
| GET/PATCH        | `/api/doctors/:id`          | Read or update a doctor                     |
| GET/POST         | `/api/doctors/:id/patients` | List assigned patients or add a patient     |
| GET/POST         | `/api/patients`             | Global patient list or create with doctorId |
| GET/PATCH/DELETE | `/api/patients/:id`         | Read, edit/reassign, or delete patient      |
| GET              | `/api/analytics/dashboard`  | Dashboard metrics and chart data            |
| GET              | `/api/settings/data`        | Admin-only doctor and patient counts        |
| POST             | `/api/settings/populate`    | Admin-only sample data generation           |
| POST             | `/api/settings/reset`       | Admin-only confirmed care record reset      |

Doctor deletion is intentionally omitted, so patient relationships cannot be orphaned by that flow.

### Workspace settings

- `GET /api/settings/data`: current doctor and patient counts.
- `POST /api/settings/populate` with `{ "doctorCount": 100, "patientCount": 1500 }`: append 1–2,000 fictional doctors (default 100) and 1,000–2,000 patients per request. Patients are assigned across existing and newly added doctors. Existing records are preserved. Dates span 90 days for chart exploration.
- `POST /api/settings/reset` with `{ "confirmation": "RESET" }`: permanently delete all patients, then doctors. Preserve all user accounts, sessions, collections, and indexes. This does not drop the database.

All settings endpoints require an administrator session; writes require a trusted Origin. Reset and population are explicit operations, never performed automatically at startup. The frontend requires confirmation before either write. The workspace write guard rejects overlapping record mutations with HTTP 409 on this API process. Reads remain available. This guard coordinates a single API process; a multi-process deployment would require database-level coordination. Bulk operations on standalone local MongoDB are not transactions: if the database fails partway through, inspect the resulting counts before retrying. Repeating population appends another batch.

### Query contracts

Both lists support `page` (default 1), `limit` (default 10, maximum 50), `search`, `from`, `to`, `sortBy` (`createdAt` or `name`), and `sortOrder` (`asc` or `desc`, default desc). Doctors additionally accept `specialization` and `hospital`; patients accept `condition` and `doctorId`. Nested patient lists always use the doctor in the route. Invalid/unknown query keys return HTTP 400.

Date filters use UTC calendar dates in `YYYY-MM-DD` format. The end date is inclusive, implemented with the exclusive start of the following day. All sort orders include `_id` as a deterministic tie-breaker. Lists return `{ data, pagination: { page, limit, total, pages } }`; records use string `id` values and ISO timestamps. Empty lists report one logical page; pages past the end return an empty list with the requested page metadata.

Doctor list/detail responses include `patientCount`. Patient list responses include `doctorId` and a compact `doctor` object with id, name, and specialization. Doctor create/PATCH bodies contain name, specialization, hospital, phone, and email; PATCH may supply a nonempty subset. Patient bodies contain firstName, lastName, age, phone, condition, doctorId, and optional email/gender. Nested patient creation takes doctorId from the route and rejects doctorId in the body. Reassignment validates the target doctor.

Dashboard accepts `days=30` or `days=90` (default 30). It returns totals, the top five doctors by patient count, daily creation counts with zero-filled dates, condition counts, the five most recent patients, and UTC period metadata. Creation counts are not net growth and deleted patients are excluded.

### Errors

Errors use `{ success: false, message, errors }`. Validation uses HTTP 400 with field messages; missing records use 404, duplicate doctor email uses 409, missing/expired sessions use 401, forbidden roles/origins use 403, and rate limits use 429. Internal errors use a generic 500 response without database details or stack traces.

## Technical decisions

### 1. Revocable opaque sessions in HTTP-only cookies

The portal needs persistent administrator/staff login and immediate logout. Login verifies a bcrypt hash and generates a random 256-bit token. The browser receives only an HTTP-only cookie; MongoDB stores the SHA-256 token hash, user reference, credential version and expiry. Protected requests look up a valid session and current user, so logout can immediately revoke the stored session instead of waiting for a self-contained token to expire. The expiry check is immediate; a TTL index handles eventual record cleanup.

The cost is a database lookup for authenticated requests and dependence on database availability. In return, tokens are not exposed to frontend JavaScript and captured tokens cease working after revocation. Trusted Origin checks protect cookie-authenticated writes, while production cookies use Secure. Cross-site hosting must be configured and verified because browser cookie restrictions depend on the frontend/backend domain arrangement. No JWT or browser-stored authentication token is used.

### 2. Referenced patients with indexed server queries and aggregations

Patients live in their own collection with a doctorId reference. Global lists, individual edits and reassignment remain independent of doctor documents, while assignment validation prevents writes against missing doctors. Bounded pagination, stable ID tie-breakers, aggregate doctor patient counts and projected patient doctor summaries avoid per-row application queries. The dashboard derives totals, top workloads, conditions and daily UTC growth from the same stored records, including zero-filled dates.

Compound indexes cover common filter/date sort combinations; name indexes support directory sorting. Substring search is escaped and length-limited, but regex/full-name expressions can still scan records, so this is not a claim that every search is index-backed. Offset pagination and full doctor option loading suit assessment-sized data; much larger workloads would need measured query plans, dedicated search and cursor pagination. The separate REST boundary keeps each repository independently deployable and testable.

## Database indexes and performance

Indexes are declared in the models and created by `npm run db:indexes` or the seed script. Mongoose autoIndex is disabled at API startup, so a newly deployed database requires explicit initialization. Index creation does not drop existing indexes, and Settings reset removes records while retaining indexes.

| Collection | Declared indexes in addition to MongoDB's _id index                                         |
| ---------- | ------------------------------------------------------------------------------------------- |
| doctors    | Unique email; createdAt/_id; specialization/createdAt/_id; hospital/createdAt/_id; name/_id |
| patients   | createdAt/_id; doctorId/createdAt/_id; condition/createdAt/_id; firstName/lastName/_id      |
| users      | Unique email                                                                                |
| sessions   | Unique tokenHash; expiresAt TTL with expireAfterSeconds = 0                                 |

The local database was inspected and the indexes were present. A doctor-specific patient query used an index scan; the integration suite also checks this query plan. That verifies this access pattern, rather than all possible combinations of search/filter/sort. Use MongoDB Compass's collection Indexes tab and query explain plans when evaluating larger sample batches.

## Verification

Integration tests cover administrator/staff login, staff creation, duplicate accounts, role escalation rejection, password validation and current-password checks, all-session revocation including racing logins, administrator-only permissions, origin protection, logout revocation, expiry, strict validation, duplicate email, CRUD/reassignment, inclusive date filtering, regex escaping, pagination, analytics, index usage, sample-population bounds and repeated batches, reset preservation of users/sessions/indexes, and exclusion of overlapping record writes. Tests always connect to a newly generated `doctor_tracker_test_*` database on local MongoDB and clean only that database. They never use the application or Atlas database.

## Visual evidence

The assessment requires desktop and mobile screenshots of the portal. **Pending:** the complete desktop/mobile submission screenshot set has not yet been added to the frontend repository. Live login, dashboard, and Profile checks have been performed; development evidence does not replace the full assessment screenshot set.

The companion frontend README lists the required dashboard, doctors/patients and mobile evidence with suggested paths. Once captured, add either copies under this repository's `docs/screenshots/` directory or direct links to the published frontend screenshots; this backend README must remain usable when cloned independently. A Swagger screenshot can supplement, but does not replace, the required portal UI evidence.

## Submission checklist

| Required submission item          | Current status                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Backend GitHub repository link    | [doctor-tracker-backend](https://github.com/WorkWithAfridi/doctor-tracker-backend)                                              |
| Frontend GitHub repository link   | [doctor-tracker-frontend](https://github.com/WorkWithAfridi/doctor-tracker-frontend)                                            |
| Live backend API documentation    | [Swagger UI](https://doctor-tracker-backend-xi.vercel.app/docs/)                                                                |
| Live frontend website URL         | [Doctor Tracker](https://doctor-tracker-frontend-ten.vercel.app)                                                                |
| Live Swagger and health endpoints | [Swagger](https://doctor-tracker-backend-xi.vercel.app/docs/) and [health](https://doctor-tracker-backend-xi.vercel.app/health) |
| Reviewer access                   | Shared privately; no login credentials are published here.                                                                      |
| Desktop and mobile UI evidence    | Pending capture; see Visual evidence.                                                                                           |

Both applications are deployed. The backend allows the production frontend origin `https://doctor-tracker-frontend-ten.vercel.app`. Before submission, verify the full portal workflows and include reviewed desktop/mobile UI screenshots. Local development URLs are not live submission URLs.
