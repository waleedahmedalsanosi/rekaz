# Changelog

## [Unreleased] — Node.js → .NET 10 Migration

### Added

#### .NET 10 Clean Architecture Backend (`Ziena.Backend/`)
- New solution `Ziena.Backend.slnx` with four projects following Clean Architecture:
  - `Ziena.Domain` — Core entities (`Merchant`, `Booking`, `Wallet`, `User`) and enums (`BookingStatus`, `UserRole`)
  - `Ziena.Application` — DTOs and service interfaces (`IBookingService`, `IWalletService`, `IMerchantService`, `IAdminService`)
  - `Ziena.Infrastructure` — EF Core + SQLite persistence, all service implementations, DI registration
  - `Ziena.API` — ASP.NET Core 10 controllers, `Program.cs` with CORS and Swagger

#### New API Endpoints (.NET)
- `POST /api/bookings` — create booking with escrow (2% commission captured at creation)
- `GET /api/bookings/merchant/{providerRefId}` — list bookings by provider
- `GET /api/bookings/client/{clientId}` — list bookings by client
- `PATCH /api/bookings/{id}/confirm` — provider confirms booking
- `PATCH /api/bookings/{id}/complete` — complete booking and release escrow to wallet
- `GET /api/wallet/{providerRefId}` — wallet balance with pending escrow breakdown
- `POST /api/wallet/complete-booking/{bookingId}` — mark complete and credit wallet
- `GET /api/merchants` — list all merchants with `providerRefId` bridge field
- `GET /api/admin/stats` — platform statistics (total merchants, bookings, revenue)

#### ProviderRefId Bridge Pattern
- `Merchant.ProviderRefId` stores Node.js string IDs (`"p1"`, `"p2"`) on .NET entities
- Allows both backends to share booking and wallet data without requiring GUID compatibility
- `BookingService` resolves merchants by `ProviderRefId` string instead of Guid FK
- `WalletController` uses string route `{providerRefId}` (no `:guid` type constraint)

#### Frontend Integration
- `dotnetApi.*` client in `src/lib/api.ts` — separate fetch wrapper for the .NET backend
- `VITE_DOTNET_API_URL` env var baked into React bundle at build time for production
- Vite proxy `/dotnet-api/*` → `http://localhost:5000` in development
- `mapDotNetBookingToApi()` / `mapDotNetWalletToApi()` — transition mappers so existing UI components continue working unchanged
- `dotnetApi.merchants.getAll()` — search/discovery enriched with `.NET` `businessName`
- `dotnetApi.bookings.create()` — booking creation now routed to .NET
- `dotnetApi.wallet.get()` — wallet balance now routed to .NET

#### Auth & UX
- Dev-only role switcher (floating pill) in `src/App.tsx` — switch between CLIENT/PROVIDER/ADMIN in development without re-logging in (`import.meta.env.DEV` gate)
- `AuthContext.switchRole()` — updates user role and demo profile in localStorage

#### DevOps
- `render.yaml` — Render Blueprint with two services: Node.js (`zeina`) + Docker .NET (`ziena-dotnet`)
- `Ziena.Backend/Dockerfile` — multi-stage Docker build for .NET 10 API

### Changed

#### Booking Creation
- **Before:** `api.bookings.create()` called Node.js Express at `POST /api/bookings`
- **After:** `api.bookings.create()` calls .NET at `POST /api/bookings` via `dotnetRequest()`; response mapped to `ApiBooking` shape

#### Wallet Balance
- **Before:** `api.wallet.get()` called Node.js Express at `GET /api/wallet`
- **After:** `api.wallet.get()` calls .NET at `GET /api/wallet/{providerRefId}`; response mapped to `ApiWallet` shape

#### `BookingCreateDto` (Breaking: Node.js → .NET)
- `ClientId`, `MerchantId`, `ServiceId` changed from `Guid` to `string` — accepts Node.js string IDs
- Added `ClientName` — display name passed from frontend since Node.js clients don't exist in .NET DB
- `MerchantId` is now a `ProviderRefId` string (e.g. `"p1"`), resolved to internal Guid by `BookingService`

#### Source Layout
- `src/shared/` split into `src/components/` (UI: `DesignSystem.tsx`, `Toast.tsx`) and `src/lib/` (data: `types.ts`, `mockData.ts`)
- All imports updated across `App.tsx`, `AuthContext.tsx`, and all four role apps

#### Documentation
- `CLAUDE.md` rewritten to document the two-backend architecture, bridge pattern, and new src/ layout
- `.env.example` expanded to cover all environment variables for both backends

### Removed

- `rekaz.db-shm`, `rekaz.db-wal` — orphaned SQLite WAL artifacts from old database
- `pwabuilder-sw.js` — broken PWA service worker template (hardcoded TODO, never registered)
- `metadata.json` — Bolt/StackBlitz workspace metadata file
- `ركاز_PRD_v1_2.docx` — superseded Arabic requirements document

---

## Previous History

See git log for earlier commits. MVP frontend (booking, escrow, wallet, messaging, disputes) was completed prior to the .NET migration.
