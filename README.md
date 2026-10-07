# Doctor Tracker API

Independent TypeScript/Express application. Run commands from this folder:

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run db:check
npm.cmd run dev
```

MongoDB must be running at the URI in `.env`. `GET /health` verifies connectivity. Authentication and feature APIs are not implemented yet.

- `npm.cmd run typecheck`: validate TypeScript.
- `npm.cmd run build`: compile to `dist/`.
- `npm.cmd start`: run the production build.
- `npm.cmd run db:check`: connect, ping MongoDB, disconnect.

## Prerequisites and repository independence

Use Node.js 24 LTS, npm, and MongoDB Community Server. Clone this backend repository and run the setup commands above from its root. No parent package or frontend folder is required to install, build, or run the backend.

## Environment variables

| Variable | Purpose | Local value |
| --- | --- | --- |
| `PORT` | API listening port | `5000` |
| `NODE_ENV` | Runtime environment | `development` |
| `MONGODB_URI` | Database connection string | `mongodb://127.0.0.1:27017/doctor_tracker` |
| `FRONTEND_URL` | Allowed frontend origin | `http://localhost:3000` |

Configuration is validated at startup. `.env` is ignored; `.env.example` is included. Hosted database credentials belong only in backend environment settings.

## Source structure

```text
src/
  config/           Environment validation and database connection
  controllers/      Future request/response handlers
  middleware/       Error handling; future auth and validation
  models/           Future Mongoose models
  routes/           Health router; future feature routers
  schemas/          Future request validation
  services/         Future business logic
  scripts/          Database check; future seed tools
  types/            Backend types
  utils/            Shared utilities
  app.ts            Express configuration
  server.ts         Database-first startup and graceful shutdown
```

## Architecture and health checks

Next.js client → standalone Express REST API → MongoDB.

The backend connects to MongoDB before accepting requests. `GET /health` performs a database ping and returns HTTP 200 when connected or HTTP 503 when unavailable. Unknown routes return consistent JSON with HTTP 404. Helmet, restricted CORS, a JSON body limit, centralized errors, and graceful shutdown are configured. Feature APIs will mount under `/api` after authentication is implemented.

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

## Submission links

- Backend GitHub repository: pending publication.
- Live backend API: pending deployment.
- Live health endpoint: pending deployment.
- Companion frontend repository and website: pending publication and deployment.
- Demo credentials: pending authentication implementation.

## Documentation to complete

Add authentication configuration, endpoint contracts, seed instructions, demo credentials, and explanations of two implemented technical decisions as features are completed.
