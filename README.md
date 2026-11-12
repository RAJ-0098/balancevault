## Live Demo

**Try BalanceVault:** [Open Live Application](https://balancevault-frontend-s2ps.onrender.com)

**Backend API:** https://balancevault-nl5w.onrender.com

The frontend and backend are deployed separately on Render. The application uses Neon PostgreSQL for persistent data storage.

> Note: The backend may take some time to respond after a period of inactivity because of free-tier hosting limitations.

### Demo Access

Users can register through the application and complete the onboarding workflow. Administrative functionality requires an authorized administrator account.

This is a demonstration application using synthetic data. Do not enter real financial or sensitive personal information.


# BalanceVault

Money movement with a ledger you can prove.

A secure account management platform with role-based access, user onboarding, and auditable account operations.

## Architecture

```
balancevault/
├── package.json              # workspaces root
├── packages/
│   ├── backend/              # Node.js + Express + Prisma + Redis
│   │   ├── src/
│   │   │   ├── config/       # env, prisma, redis singletons
│   │   │   ├── middleware/    # auth, rbac, rate-limit, audit, errors
│   │   │   ├── routes/        # health, auth, accounts, onboarding, admin
│   │   │   ├── services/     # business logic
│   │   │   ├── utils/         # jwt, password helpers
│   │   │   └── scripts/      # role setup, first-admin bootstrap
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── seed.js
│   │       └── sql/          # role + bootstrap-function SQL
│   └── frontend/             # React + Vite + TypeScript + Tailwind
│       └── src/
│           ├── api/          # axios client
│           ├── context/     # auth context
│           ├── components/  # layout, protected route, toast
│           └── pages/        # login, register, dashboard, admin, onboarding
```

## Tech stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL (Neon-compatible) with separate roles
- **Cache/Rate-limiting:** Redis via ioredis + rate-limit-redis
- **Auth:** JWT (access + refresh), bcrypt password hashing
- **Security:** Helmet, CORS, rate limiting, RBAC middleware, audit logging

## Quick start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or a Neon account)
- Redis 6+

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL, REDIS_URL, JWT secrets
```

### 3. Generate Prisma client and run migrations

```bash
npm run db:generate
npm run db:migrate
```

### 4. Seed synthetic data (optional)

```bash
npm run db:seed
```

### 5. Bootstrap the first admin

**Option A — HTTP endpoint (simplest for local dev):**

```bash
npm run dev:backend
# In another terminal:
curl -X POST http://localhost:3001/api/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@balancevault.local","password":"ChangeMe123!","firstName":"Admin","lastName":"User"}'
```

**Option B — Database-level bootstrap (matches the Neon role setup):**

```bash
# First, apply the role SQL as a superuser/db-owner:
#   psql "$DATABASE_URL" -f packages/backend/prisma/sql/01_roles.sql
#   psql "$DATABASE_URL" -f packages/backend/prisma/sql/02_bootstrap_function.sql

# Then run the bootstrap script (uses BOOTSTRAP_DATABASE_URL):
npm run bootstrap
```

### 6. Start the app

```bash
npm run dev
```

Frontend: http://localhost:5173
Backend API: http://localhost:3001

## Database roles

BalanceVault uses least-privilege PostgreSQL roles:

| Role | Login | Purpose |
|------|-------|---------|
| `app_user` | No | Runtime CRUD — the app connects as this role |
| `bootstrap_login` | Yes | First-admin setup only; member of `bootstrap_operator` |
| `bootstrap_operator` | No | Can `SET ROLE` and execute the `bootstrap_first_admin()` function |

The `bootstrap_login` role uses `NOINHERIT`, so it must explicitly `SET ROLE bootstrap_operator` before calling the bootstrap function. This mirrors the real PostgreSQL permission model where role membership grants `SET ROLE` capability, not direct privilege inheritance.

## API overview

### Public
- `POST /api/auth/register` — register a new account holder
- `POST /api/auth/login` — login, returns JWT
- `POST /api/auth/refresh` — refresh access token
- `GET /health` — liveness probe
- `GET /ready` — readiness probe (checks DB + Redis)

### Authenticated (account holder)
- `GET /api/auth/me` — current user
- `POST /api/auth/logout` — logout
- `POST /api/onboarding/submit` — submit onboarding for review
- `GET /api/onboarding/status` — check onboarding status
- `GET /api/accounts` — list accounts
- `GET /api/accounts/:id` — account details + transactions
- `POST /api/accounts/:id/deposit` — deposit
- `POST /api/accounts/:id/withdraw` — withdraw
- `POST /api/accounts/transfer` — transfer between accounts

### Admin only
- `GET /api/admin/users` — list users
- `POST /api/admin/users/:id/suspend` — suspend user
- `POST /api/admin/users/:id/reactivate` — reactivate user
- `GET /api/admin/onboarding` — list onboarding requests
- `POST /api/admin/onboarding/:id/approve` — approve (creates account)
- `POST /api/admin/onboarding/:id/reject` — reject
- `GET /api/admin/audit-logs` — audit trail
- `GET /api/admin/stats` — dashboard stats

## Disclaimer

This is a hackathon demonstration using synthetic data. It is not a production financial service or a system for handling real funds.

