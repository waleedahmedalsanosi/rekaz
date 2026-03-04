# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ziena (زينة) is a beauty services booking platform for the Saudi Arabian market. Clients book makeup artists and hairstylists; providers manage services and earnings; admins manage the platform. The UI is in Arabic (RTL).

## Commands

```bash
npm start              # Dev: runs Express server (port 3001) + Vite frontend (port 3000) concurrently
npm run dev            # Frontend only (port 3000)
npm run server:watch   # Backend only with auto-reload
npm run build          # Production build to /dist
npm run start:prod     # Production: serves /dist + /api routes from Express
npm run lint           # TypeScript type-check (tsc --noEmit)
```

No test runner is configured. Type-check with `npm run lint`.

## Architecture

### Role-Based SPA

The frontend is a single React SPA that routes to one of four apps based on the authenticated user's role:

```
App.tsx → AuthContext
  ├── Unauthenticated → AuthApp (src/apps/auth/)
  ├── ADMIN           → AdminApp (src/apps/admin/)
  ├── PROVIDER        → ProviderApp (src/apps/provider/)
  └── CLIENT          → ClientApp (src/apps/client/)
```

Each role app is a large self-contained file. Shared utilities live in [src/shared/](src/shared/) (types, design system components, mock data, toast). The API client at [src/lib/api.ts](src/lib/api.ts) is the single interface to the backend — all fetch calls go through it.

### Backend (Express + Turso)

[server/index.ts](server/index.ts) is the Express entry. Routes in [server/routes/](server/routes/) map to:
- `auth.ts` — OTP login, admin password login, session creation
- `bookings.ts` — Full booking lifecycle (PENDING → CONFIRMED → COMPLETED)
- `wallet.ts` — Escrow, earnings, IBAN payout requests
- `admin.ts` — Stats, dispute resolution, payout approvals

[server/db.ts](server/db.ts) initializes the schema, wraps the Turso client with async helpers, and seeds demo data on first run.

### Database

Uses Turso (LibSQL) in production; falls back to `zeina.db` (SQLite file) in development when `TURSO_URL` is not set. The async wrapper in `db.ts` provides `db.execute()` / `db.query()` that work with both.

Key business logic: 2% commission escrow — `ceil(price * 0.02)` is withheld on each booking and released to the platform on completion.

### Vite Proxy

In development, Vite proxies `/api/*` to `http://localhost:3001`. The frontend always calls `/api/...` — never hardcoded backend URLs.

## Environment Variables

```
TURSO_URL=libsql://...      # Required in production
TURSO_TOKEN=...             # Required in production
NODE_ENV=production
PORT=3001                   # Default
GEMINI_API_KEY=...          # Optional (Google AI, not deeply integrated)
```

## Demo Credentials

| Role     | Phone       | OTP  |
|----------|-------------|------|
| Client   | 0555123456  | 1234 |
| Provider | 0501234567  | 1234 |
| Admin    | —           | password: `admin` |

OTP is hardcoded to `1234` for all users (no real SMS integration).

## Modern Backend (.NET 10)

```bash
# From the Ziena.Backend/ directory:
dotnet run --project Ziena.API          # Run the API (http://localhost:5000)
dotnet build Ziena.Backend.slnx         # Build the full solution
```

The .NET backend lives in `Ziena.Backend/` and follows Clean Architecture:
- `Ziena.Domain` — entities and enums (no dependencies)
- `Ziena.Application` — DTOs (`DTOs/`) and service interfaces (`Interfaces/`)
- `Ziena.Infrastructure` — EF Core + SQLite (`Persistence/`), service implementations (`Services/`), DI registration (`Extensions/InfrastructureServiceExtensions.cs`)
- `Ziena.API` — controllers and `Program.cs`

SQLite database file (`ziena.db`) is created next to the running binary. Connection string is in `Ziena.API/appsettings.json`. Run EF Core migrations with `dotnet ef` from `Ziena.Backend/` (requires `dotnet ef` tool and `--project Ziena.Infrastructure --startup-project Ziena.API`).

## Key Conventions

- Path alias `@/` maps to the project root (configured in both `vite.config.ts` and `tsconfig.json`).
- All backend routes require `Authorization: Bearer <token>` except auth endpoints. The token is stored in `localStorage` and injected by the API client.
- The `users` table has a `role` column (`ADMIN`, `PROVIDER`, `CLIENT`). Creating a provider via OTP auto-creates a row in the `providers` table.
- Subscription tiers (`FREE`, `BASIC`, `PRO`) exist in the schema but are not fully implemented in the business logic yet.
