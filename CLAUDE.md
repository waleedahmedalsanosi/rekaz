# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ziena (زينة) is a beauty services booking platform for the Saudi Arabian market. Clients book makeup artists and hairstylists; providers manage services and earnings; admins manage the platform. The UI is in Arabic (RTL).

## Commands

```bash
# Node.js + React (root)
npm start              # Dev: runs Express server (port 3001) + Vite frontend (port 3000) concurrently
npm run dev            # Frontend only (port 3000)
npm run server:watch   # Express backend only with auto-reload
npm run build          # Production build to /dist
npm run start:prod     # Production: serves /dist + /api routes from Express
npm run lint           # TypeScript type-check (tsc --noEmit)

# .NET 10 backend (from Ziena.Backend/ directory)
dotnet run --project Ziena.API          # Run the API (http://localhost:5000)
dotnet build Ziena.Backend.slnx         # Build the full solution
dotnet ef migrations add <Name> --project Ziena.Infrastructure --startup-project Ziena.API
```

No test runner is configured. Type-check with `npm run lint`.

## Architecture

### Role-Based SPA

The frontend is a single React SPA that routes to one of four apps based on the authenticated user's role:

```
src/App.tsx → AuthContext
  ├── Unauthenticated → AuthApp   (src/apps/auth/)
  ├── ADMIN           → AdminApp  (src/apps/admin/)
  ├── PROVIDER        → ProviderApp (src/apps/provider/)
  └── CLIENT          → ClientApp (src/apps/client/)
```

Each role app is a large self-contained file. Source layout:

```
src/
├── apps/          — Role-based sub-apps (one large file per role)
├── components/    — Shared UI: DesignSystem.tsx, Toast.tsx
├── contexts/      — AuthContext (user state + role switching)
├── lib/           — api.ts, types.ts, mockData.ts
└── assets/        — Static assets
```

The API client at [src/lib/api.ts](src/lib/api.ts) is the single interface to both backends.

### Two-Backend Architecture

The project runs **two backends in parallel**:

| Backend | Tech | Port | Handles |
|---------|------|------|---------|
| Node.js/Express | `server/` | 3001 | Auth (OTP), Providers, Services, Messages, Reviews, Admin |
| .NET 10 (Clean Architecture) | `Ziena.Backend/` | 5000 | Bookings, Wallet, Merchants |

**Frontend API client** ([src/lib/api.ts](src/lib/api.ts)):
- `api.*` — calls Node.js Express via `/api/...` (Vite proxy → port 3001)
- `dotnetApi.*` — calls .NET backend via `/dotnet-api/...` (Vite proxy → port 5000)
- Transition mappers `mapDotNetBookingToApi()` / `mapDotNetWalletToApi()` convert .NET responses to legacy `ApiBooking`/`ApiWallet` shapes so UI components work unchanged during migration

### Node.js / Express Backend (`server/`)

`server/index.ts` is the Express entry. Routes in `server/routes/`:
- `auth.ts` — OTP login, admin password login, session creation
- `providers.ts` — Provider CRUD & profile management
- `services.ts` — Service CRUD
- `bookings.ts` — Legacy booking support (list, status updates, pay, confirm)
- `messages.ts` — Client-provider messaging
- `wallet.ts` — Legacy wallet (transactions, IBAN payout requests)
- `reviews.ts` — Review creation
- `admin.ts` — Stats, dispute resolution, payout approvals

`server/db.ts` initializes the schema, wraps the Turso/LibSQL client, and seeds demo data on first run. Uses Turso in production; falls back to `zeina.db` (SQLite file) in development when `TURSO_URL` is not set.

### .NET 10 Backend (`Ziena.Backend/`)

Clean Architecture layers:
- `Ziena.Domain` — entities and enums (no dependencies)
- `Ziena.Application` — DTOs (`DTOs/`) and service interfaces (`Interfaces/`)
- `Ziena.Infrastructure` — EF Core + SQLite (`Persistence/`), service implementations (`Services/`), DI registration (`Extensions/InfrastructureServiceExtensions.cs`)
- `Ziena.API` — controllers and `Program.cs`

**Controllers:** `BookingsController`, `WalletController`, `MerchantsController`, `AdminController`

SQLite DB (`ziena.db`) is created next to the running binary. Connection string is in `Ziena.API/appsettings.json`.

#### ProviderRefId Bridge Pattern

Node.js providers use string IDs (`"p1"`, `"p2"`). .NET uses GUIDs. The `Merchant.ProviderRefId` field stores the Node.js string ID so both systems share data:
- Frontend sends `merchantId: "p1"` in booking creation
- .NET `BookingService` looks up `Merchant` via `ProviderRefId == "p1"` instead of Guid matching
- `WalletController` route is `{providerRefId}` (string, not `{id:guid}`)

### Database

- **Node.js** uses Turso (LibSQL) in production; `zeina.db` (SQLite) in dev
- **.NET** uses EF Core with SQLite; `ziena.db` created next to the binary
- They are **separate databases**; the bridge is `Merchant.ProviderRefId`
- 2% commission escrow: `ceil(price * 0.02)` withheld on each booking, released on completion

### Vite Proxy (Development)

```
/api/*         → http://localhost:3001  (Node.js Express)
/dotnet-api/*  → http://localhost:5000  (strip /dotnet-api prefix, then .NET)
```

In production, `VITE_DOTNET_API_URL` is baked into the React bundle at build time.

## Environment Variables

See `.env.example` for the full list with descriptions.

Key variables:

```
TURSO_URL           — Turso production DB (Node.js)
TURSO_TOKEN         — Turso JWT (Node.js)
VITE_DOTNET_API_URL — .NET backend URL baked into React bundle at build time
```

## Demo Credentials

| Role     | Phone       | OTP  |
|----------|-------------|------|
| Client   | 0555123456  | 1234 |
| Provider | 0501234567  | 1234 |
| Admin    | —           | password: `admin` |

OTP is hardcoded to `1234` for all users (no real SMS integration).

## Deployment (Render)

`render.yaml` defines two services:
- `zeina` — Node.js web service: `npm run build` + `npm run start:prod`
- `ziena-dotnet` — Docker service: Dockerfile at `./Ziena.Backend/Dockerfile`, context `./Ziena.Backend`

## Key Conventions

- Path alias `@/` maps to the project root (configured in both `vite.config.ts` and `tsconfig.json`).
- All Node.js backend routes require `Authorization: Bearer <token>` except auth endpoints. The token is stored in `localStorage` and injected by the API client.
- The `users` table has a `role` column (`ADMIN`, `PROVIDER`, `CLIENT`). Creating a provider via OTP auto-creates a row in the `providers` table.
- Subscription tiers (`FREE`, `BASIC`, `PRO`) exist in the schema but are not fully implemented in business logic.
- Dev-only role switcher (floating pill at bottom of screen) is visible only when `import.meta.env.DEV`. Uses `AuthContext.switchRole()`.
