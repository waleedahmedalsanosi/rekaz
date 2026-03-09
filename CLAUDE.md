# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ziena (زينة) is a beauty services booking platform for the Saudi Arabian market. Clients book makeup artists and hairstylists; providers manage services and earnings; admins manage the platform. The UI is in Arabic (RTL). **Single .NET 10 backend only** (Node.js removed).

## Commands

```bash
# Frontend
npm run dev            # Vite frontend only (port 3000)
npm run build          # Production build to /dist
npm run lint           # TypeScript type-check (tsc --noEmit)

# .NET 10 backend (from Ziena.Backend/ directory)
dotnet run --project Ziena.API                 # Run the API (http://localhost:5000)
dotnet build Ziena.Backend.slnx                # Build the solution
dotnet ef migrations add <Name> --project Ziena.Infrastructure --startup-project Ziena.API
dotnet ef database update --project Ziena.Infrastructure --startup-project Ziena.API
```

No test runner is configured. Type-check with `npm run lint`.

## Architecture

### Role-Based SPA

Single .NET 10 backend. React SPA in dev served by Vite (port 3000); in prod deployed to Vercel.

Frontend routes to one of four role-based apps:

```
src/App.tsx → AuthContext
  ├── Unauthenticated → AuthApp   (src/apps/auth/)
  ├── ADMIN           → AdminApp  (src/apps/admin/)
  ├── PROVIDER        → ProviderApp (src/apps/provider/)
  └── CLIENT          → ClientApp (src/apps/client/)
```

Each role app is a self-contained file. Source layout:

```
src/
├── apps/          — Role-based sub-apps (one large file per role)
├── components/    — Shared UI: DesignSystem.tsx, Toast.tsx, etc.
├── contexts/      — AuthContext (user state + role switching)
├── lib/           — api.ts (single API namespace), types.ts, mockData.ts
└── assets/        — Static assets
```

The API client at [src/lib/api.ts](src/lib/api.ts) is the single interface to the .NET backend.

### Single Backend: .NET 10

All API endpoints are served by a single .NET 10 backend at `Ziena.Backend/`.

**Clean Architecture layers:**
- `Ziena.Domain` — entities and enums (no dependencies)
- `Ziena.Application` — DTOs and service interfaces
- `Ziena.Infrastructure` — EF Core + SQLite, service implementations, DI registration
- `Ziena.API` — controllers, middleware, `Program.cs`

**Controllers (11 total):**
- `AuthController` — OTP send/verify, admin login, /me, logout
- `ProvidersController` — list, get, get/me, update/me, services, reviews
- `ServicesController` — CRUD for service catalog
- `BookingsController` — create, list (role-aware), updateStatus, pay, confirm, dispute
- `WalletController` — get, transactions, payout requests
- `ConversationsController` — list, create, get messages, send message
- `ReviewsController` — create review
- `AdminController` — stats, providers verify, disputes, payouts, revenue
- `PaymentsController` — Moyasar create/callback/webhook
- `MerchantsController` — merchant CRUD (internal use)
- `NotificationsController` — push subscriptions, VAPID keys

**Database:** SQLite via EF Core. File: `ziena.db` (created next to the running binary).

**Authentication:** Bearer token stored in `Sessions` table. Middleware reads `Authorization` header, looks up token, sets `HttpContext.Items["UserId"]` and `HttpContext.Items["UserRole"]`.

### Vite Proxy (Development Only)

```
/api/* → http://localhost:5000  (.NET 10)
```

In production, the SPA is deployed separately (Vercel); the .NET API is on Render. The `VITE_API_URL` env var is baked into the APK at build time for Capacitor.

## Database

**EF Core with SQLite.** Connection string: `Ziena.Backend/Ziena.API/appsettings.json`.

**Domain entities (9 core + extended existing):**

Core domain:
- `User` — phone (unique), name, email, avatar, role (enum: Admin, Provider, Client)
- `Merchant` — Guid Id, UserId FK, businessName, specialty, rating, city, coveredNeighborhoodsJson, subscriptionTier, reviewCount, avatar, IBAN, isVerified

Bookings & Wallet:
- `Booking` — ClientId (Node.js string ref), MerchantId FK, ServiceId FK, ScheduledAt, TotalPrice, EscrowAmount, Status, PaymentStatus, Neighborhood, ClientConfirmed, ProviderConfirmed, MoyasarPaymentId, ReviewId FK, DisputeId FK
- `Wallet` — MerchantId FK, TotalEarnings, CommissionDeducted, PendingBalance (computed)
- `Transaction` — WalletId FK, BookingId FK (nullable), Type (enum: Credit, Debit, Payout), Amount, Status

Services & Reviews:
- `Service` — MerchantId FK, Name, Description, Price, Duration, Category, Image, IsAvailable
- `Review` — BookingId FK (unique), ClientId FK, MerchantId FK, Rating, Comment

Messaging:
- `Conversation` — ClientId FK, MerchantId FK (unique composite index)
- `Message` — ConversationId FK, SenderId FK, SenderRole (enum), Content, IsRead

Auth & Admin:
- `OtpCode` — PhoneNumber (unique), Code, ExpiresAt
- `Session` — UserId FK, Token (unique), ExpiresAt
- `Dispute` — BookingId FK, ClientId FK, MerchantId FK, Reason, Status, Resolution
- `PayoutRequest` — MerchantId FK, Amount, IBAN, Status

**Key business logic:**
- 2% commission escrow: `ceil(price * 0.02)` withheld on booking creation, released on completion
- Provider rating aggregated from reviews: `AVG(Review.Rating)` grouped by `MerchantId`
- Wallet `PendingBalance` = sum of all Booking prices where Status in (Pending, Confirmed) and MerchantId matches

## Environment Variables

### Frontend (.env, baked into bundle at build time)
```
VITE_API_URL     — .NET backend URL (e.g., http://localhost:5000 in dev, https://api.render.com in prod)
```

### Backend (Ziena.Backend/Ziena.API/appsettings.json or env override)
```
Auth:AdminPassword                    — admin login password (default: "admin")
Auth:SessionDays                      — token expiration (default: 30)
OtpLess:ClientId                      — WhatsApp OTP provider client ID
OtpLess:ClientSecret                  — WhatsApp OTP provider client secret
OtpLess:BaseUrl                       — OTPless API URL (default: https://auth.otpless.app/auth/otp/v1)
Moyasar:SecretKey                     — Moyasar API secret key (test or production)
Moyasar:WebhookSecret                 — Moyasar webhook signing secret
Moyasar:PublishableKey                — Moyasar publishable key (for frontend, if needed)
Frontend:Url                          — Frontend URL for payment callback redirects (http://localhost:3000 in dev)
ASPNETCORE_ENVIRONMENT                — Production, Development, or Staging
```

## Test Accounts

All accounts use OTP: **1234**

| Role     | Name  | Phone      |
|----------|-------|------------|
| Admin    | أماني  | 0555123456 |
| Provider | منال  | 0505467269 |
| Client   | ليلى  | 0582314923 |

Seeded in `Ziena.Infrastructure/Persistence/DbInitializer.cs` on first database init.

## Deployment

**Frontend:** Vercel
- Trigger: `npm run build`, upload `dist/` to Vercel
- Env var: `VITE_API_URL` = Render .NET API URL

**Backend:** Render Docker
- Dockerfile: `Ziena.Backend/Dockerfile`
- Command: `dotnet Ziena.API.dll`
- Env vars: all the `appsettings.json` keys above (auto-injected by Render into `appsettings.json`)
- Service: `ziena-dotnet` in `render.yaml`

## Key Conventions

- Path alias `@/` maps to the project root (configured in both `vite.config.ts` and `tsconfig.json`)
- All .NET API routes require `Authorization: Bearer <token>` EXCEPT:
  - `POST /api/auth/send-otp` — open
  - `POST /api/auth/verify-otp` — open
  - `POST /api/auth/admin-login` — open
  - `GET /api/payments/callback` — open (3DS redirect)
  - `POST /api/payments/webhook` — open (Moyasar webhook)
- The token is stored in `localStorage` (key: `auth_token`) and injected as `Authorization: Bearer <token>` by the API client
- Provider GUID (from `Merchant.Id`) is stored in auth token response as `providerId`
- Dev-only role switcher (floating pill at bottom of screen) is visible only when `import.meta.env.DEV`. Uses `AuthContext.switchRole()`
- Subscription tiers (`FREE`, `BASIC`, `PRO`) exist in the schema but are not fully implemented in business logic
- CORS origin: must whitelist frontend Vercel URL in .NET middleware `AddCors()`

## API Client Structure (src/lib/api.ts)

Single `api.*` namespace with subgroups:

```typescript
api.auth.sendOtp()
api.auth.verifyOtp()
api.auth.adminLogin()
api.auth.logout()
api.auth.getMe()
api.auth.updateMe()

api.providers.list()
api.providers.get(id)
api.providers.getMe()
api.providers.updateMe()
api.providers.getServices(id)
api.providers.getReviews(id)

api.services.list()
api.services.create()
api.services.update(id)
api.services.delete(id)

api.bookings.list()
api.bookings.create()
api.bookings.updateStatus(id, status)
api.bookings.pay(id)
api.bookings.confirm(id)
api.bookings.dispute(id)
api.bookings.getAvailableMerchants(serviceId, time)

api.wallet.get()
api.wallet.getTransactions()
api.wallet.requestPayout(amount, iban)

api.conversations.list()
api.conversations.create(providerId)
api.conversations.getMessages(id)
api.conversations.sendMessage(id, content)

api.reviews.create(bookingId, rating, comment)

api.payments.create(bookingId)
// callback is a 3DS redirect, not an API call
// webhook is inbound Moyasar POST

api.admin.getStats()
api.admin.getProviders()
api.admin.verifyProvider(id)
api.admin.getDisputes()
api.admin.resolveDispute(id, favorClient)
api.admin.getPayouts()
api.admin.processPayout(id, approved)
api.admin.getRevenue(days)

api.notifications.getVapidPublicKey()
api.notifications.subscribe(subscription)
```

## Android APK

**Build:**
```bash
npm run build
npx cap copy android
cd android && bash gradlew assembleRelease
```

APK file: `android/app/build/outputs/apk/release/app-release.apk`

**For Capacitor to use the .NET backend URL:**
- Set `VITE_API_URL=https://your-render-url.onrender.com/api` before `npm run build`
- Capacitor rewrites relative `/api/` URLs to the absolute `VITE_API_URL`

## Git & CI/CD

- Main branch: `main` (default)
- CI/CD: GitHub Actions (future)
- Pre-commit: TypeScript lint via `npm run lint`
