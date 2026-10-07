# Doctor Tracker API

Doctor Tracker API is an independent Express REST service for authenticated doctor and patient management and dashboard analytics. It stores application records and revocable login sessions in MongoDB, validates every write, and performs filtering, pagination, and analytics on the server. Run commands from this repository root:

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run db:check
npm.cmd run seed
npm.cmd run dev
```

MongoDB must be running at the URI in `.env`. `GET /health` verifies connectivity. The companion frontend now connects to these APIs for authentication, records, list queries, and dashboard analytics. Its local API URL is `http://localhost:5000/api`; open the frontend at `http://localhost:3000` to match the configured origin.

## Demo credentials and seed data

- Email: `admin@doctortracker.com`
- Password: `Admin123!`

The seed creates one admin, 24 fictional doctors, and 186 fictional patients. Repeated runs preserve existing records and passwords. There is no destructive reset command. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before first seeding to customize the account. Production seeding rejects the default demo password.

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
| `SEED_ADMIN_EMAIL`    | Admin email for first seed          | `admin@doctortracker.com`                  |
| `SEED_ADMIN_PASSWORD` | Password for first seed             | `Admin123!` (local demo only)              |

Configuration is validated at startup. `.env` is ignored; `.env.example` is included. Hosted database credentials belong only in backend environment settings.

## Source structure

```text
src/
  config/           Environment validation and database connection
  controllers/      Thin doctor and patient request handlers
  docs/             OpenAPI specification and generated input schemas
  middleware/       Authentication, origin protection, error handling
  models/           User, Session, Doctor, Patient
  routes/           Auth, doctors, patients, analytics, health
  schemas/          Strict Zod body, ID, and query validation
  services/         Authentication, record queries, analytics
  scripts/          Database check, indexes, idempotent seed
  types/            Backend types
  utils/            Shared utilities
  app.ts            Express configuration
  server.ts         Database-first startup and graceful shutdown
```

## Architecture and health checks

Next.js client → standalone Express REST API → MongoDB.

The backend connects to MongoDB before accepting requests. `GET /health` performs a database ping and returns HTTP 200 when connected or HTTP 503 when unavailable. Unknown routes return consistent JSON with HTTP 404. Helmet, restricted credentialed CORS, a JSON body limit, rate limiting, centralized errors, and graceful shutdown are configured. Feature APIs mount under `/api` and require an administrator session.

MongoDB creates databases and collections on the first write. A connection/ping alone does not create application collections.

## Local MongoDB on the development machine

MongoDB Community Server 9.0.2 is installed as the automatic `MongoDB` Windows service, listening on `127.0.0.1:27017`.

- Executable: `C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe`
- Configuration: `C:\Program Files\MongoDB\Server\9.0\bin\mongod.cfg`
- Data: `C:\Program Files\MongoDB\Server\9.0\data`
- Log: `C:\Program Files\MongoDB\Server\9.0\log\mongod.log`

Check status with `Get-Service MongoDB`. If stopped, run `Start-Service MongoDB` in an administrator PowerShell terminal. On another machine, install MongoDB independently and configure `MONGODB_URI`.

## Independent deployment

Deploy this repository to a Node.js host such as Render:

- Build command: `npm ci && npm run build`.
- Start command: `npm start`.
- Health check path: `/health`.
- Environment: `NODE_ENV=production`, a hosted `MONGODB_URI`, and the exact live frontend origin in `FRONTEND_URL`.
- Port: use the hosting provider's `PORT` environment variable.

Configure database network access for the backend host. Backend deployment requires only this repository's files.

Before first use of a new hosted database, run `npm run db:indexes` or `node dist/scripts/indexes.js` after building. Indexes are not automatically built on API startup. Run the seed separately only if fictional demo data is wanted. Set `TRUST_PROXY_HOPS` to the verified number of reverse proxies for the deployment; do not trust arbitrary forwarded headers.

## MongoDB Atlas connection

Local MongoDB is the current configured database. To switch later, create an Atlas database user, allow the backend machine/host through Atlas network access, and put the driver connection string in the ignored `.env` file as `MONGODB_URI`. Include `doctor_tracker` as the database name and URL-encode special characters in the database password. Restart the API and run `npm run db:check`, then initialize indexes. Never put Atlas credentials in frontend variables or Git.

## Authentication and browser integration

Login uses bcrypt password verification and a random 256-bit session token in an HTTP-only cookie. MongoDB stores only its SHA-256 hash, user reference, and expiry. Every authenticated request checks the session expiry and administrator role; logout deletes the stored session immediately. A TTL index removes expired session records in the background.

Browser requests must use `credentials: 'include'`. All POST/PATCH/DELETE requests, including login and logout, require an `Origin` header matching `FRONTEND_URL` or `DOCS_ORIGIN`. API clients such as Bruno/Postman must set that header explicitly. Reads do not require an Origin header, but protected reads require a session cookie. Responses use `Cache-Control: no-store`.

## Interactive API documentation

Open [Swagger UI](http://localhost:5000/docs/) with the backend running. All 17 operations include query parameters, request bodies, response schemas, and error codes. Input schemas are generated from the backend's Zod validators; response contracts and examples are maintained in `src/docs/openapi.ts`.

1. Expand **Authentication → POST /api/auth/login**, click **Try it out**, and **Execute** with the demo credentials above.
2. The browser saves the session cookie automatically. Expand any protected endpoint, enter query parameters or a body, and execute it to see the actual status, headers, and response from MongoDB.
3. Copy real record IDs from list responses before trying detail or update endpoints. The displayed examples are illustrative; write operations change real records. Use logout to revoke the session.

Cookie authentication is browser-managed; there is no token to paste into an Authorize box. Documentation is public, while the feature APIs still require an administrator session. The online Swagger validator is disabled.

The [OpenAPI JSON](http://localhost:5000/openapi.json) can be imported into Postman or Bruno. Deployment uses the same `/docs/` and `/openapi.json` paths on the live backend host. Set `DOCS_ORIGIN` to that host's exact HTTPS origin to enable writes from deployed Swagger UI. In development, the default trusted docs origin is `http://localhost:<PORT>` when this setting is omitted; production requires an explicit setting.

For production, cookies use `Secure`. Prefer a same-origin frontend proxy or frontend/API domains under the same site. Direct cross-site cookie use requires `COOKIE_SAME_SITE=none` and HTTPS and can still be restricted by browser third-party-cookie policies. The production topology must be verified before deployment.

## REST endpoints

| Method           | Endpoint                    | Behavior                                    |
| ---------------- | --------------------------- | ------------------------------------------- |
| GET              | `/health`                   | Public database connectivity check          |
| POST             | `/api/auth/login`           | Email/password login; sets session cookie   |
| GET              | `/api/auth/me`              | Current administrator                       |
| POST             | `/api/auth/logout`          | Revoke current session; clear cookie        |
| GET/POST         | `/api/doctors`              | List or create doctors                      |
| GET              | `/api/doctors/options`      | Distinct specialization/hospital filters    |
| GET/PATCH        | `/api/doctors/:id`          | Read or update a doctor                     |
| GET/POST         | `/api/doctors/:id/patients` | List assigned patients or add a patient     |
| GET/POST         | `/api/patients`             | Global patient list or create with doctorId |
| GET/PATCH/DELETE | `/api/patients/:id`         | Read, edit/reassign, or delete patient      |
| GET              | `/api/analytics/dashboard`  | Dashboard metrics and chart data            |

Doctor deletion is intentionally omitted, so patient relationships cannot be orphaned by that flow.

### Query contracts

Both lists support `page` (default 1), `limit` (default 10, maximum 50), `search`, `from`, `to`, `sortBy` (`createdAt` or `name`), and `sortOrder` (`asc` or `desc`, default desc). Doctors additionally accept `specialization` and `hospital`; patients accept `condition` and `doctorId`. Nested patient lists always use the doctor in the route. Invalid/unknown query keys return HTTP 400.

Date filters use UTC calendar dates in `YYYY-MM-DD` format. The end date is inclusive, implemented with the exclusive start of the following day. All sort orders include `_id` as a deterministic tie-breaker. Lists return `{ data, pagination: { page, limit, total, pages } }`; records use string `id` values and ISO timestamps. Empty lists report one logical page; pages past the end return an empty list with the requested page metadata.

Doctor list/detail responses include `patientCount`. Patient list responses include `doctorId` and a compact `doctor` object with id, name, and specialization. Doctor create/PATCH bodies contain name, specialization, hospital, phone, and email; PATCH may supply a nonempty subset. Patient bodies contain firstName, lastName, age, phone, condition, doctorId, and optional email/gender. Nested patient creation takes doctorId from the route and rejects doctorId in the body. Reassignment validates the target doctor.

Dashboard accepts `days=30` or `days=90` (default 30). It returns totals, the top five doctors by patient count, daily creation counts with zero-filled dates, condition counts, the five most recent patients, and UTC period metadata. Creation counts are not net growth and deleted patients are excluded.

### Errors

Errors use `{ success: false, message, errors }`. Validation uses HTTP 400 with field messages; missing records use 404, duplicate doctor email uses 409, missing/expired sessions use 401, forbidden roles/origins use 403, and rate limits use 429. Internal errors use a generic 500 response without database details or stack traces.

## Technical decisions and performance

1. **Revocable opaque sessions:** Server-owned sessions avoid exposing tokens to JavaScript and make logout immediately revoke a captured token. This adds a session collection and one database check per authenticated request, a deliberate tradeoff for simple revocation rather than stateless JWT logout semantics.
2. **Referenced patients:** Patients have their own collection and doctorId reference. Global listing, reassignment, and individual mutations remain independent of doctor documents. Doctor-specific filtering and descending date sorting share a compound index.
3. **Database-owned lists and analytics:** Pagination uses bounded skip/limit, projected lookups attach doctor names/counts without per-row application queries, and dashboard summaries use aggregation. Indexes cover common doctor specialization/hospital/date and patient doctor/condition/date queries, plus name sorting. Integration tests verify an index scan for doctor-specific patient queries.

Search is escaped, length-limited, case-insensitive substring matching. Patient search includes full name, phone/email, and assigned doctor name. Substring regex and full-name expressions can scan records; these indexes do not prove efficient substring search at large scale. For a substantially larger dataset, add a dedicated search index and cursor pagination based on measured query plans. Offset pagination is appropriate for the assessment-sized dataset.

## Verification

Integration tests cover authentication, origin protection, logout revocation, expiry, strict validation, duplicate email, CRUD/reassignment, inclusive date filtering, regex escaping, pagination, analytics, and index usage. Tests always connect to a newly generated `doctor_tracker_test_*` database on local MongoDB and clean only that database. They never use the application or Atlas database.

## Submission links

- Backend GitHub repository: pending publication.
- Live backend API: pending deployment.
- Live health endpoint: pending deployment.
- Companion frontend repository and website: pending publication and deployment.
- Demo credentials: listed above; change them for a non-demo deployment.

## Documentation to complete

Add final repository/deployment URLs after publishing and verify authentication with the chosen live frontend/backend domain topology.
